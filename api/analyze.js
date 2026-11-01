const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

const schema = {
  type: 'object', additionalProperties: false,
  required: ['detectedMaterial', 'confidence', 'visualEvidence', 'assumptions', 'condition', 'uncertaintyQuestion', 'ideas'],
  properties: {
    detectedMaterial: { type: 'string' }, confidence: { type: 'number', minimum: 0, maximum: 1 },
    visualEvidence: { type: 'array', items: { type: 'string' } }, assumptions: { type: 'array', items: { type: 'string' } }, condition: { type: 'string' }, uncertaintyQuestion: { type: 'string' },
    ideas: { type: 'array', minItems: 3, maxItems: 3, items: {
      type: 'object', additionalProperties: false,
      required: ['kind', 'title', 'summary', 'difficulty', 'costRange', 'time', 'materials', 'tools', 'preparation', 'steps', 'benefits', 'safety'],
      properties: {
        kind: { type: 'string', enum: ['practical', 'creative', 'budget'] }, title: { type: 'string' }, summary: { type: 'string' },
        difficulty: { type: 'string', enum: ['Beginner', 'Intermediate', 'Advanced'] }, costRange: { type: 'string' }, time: { type: 'string' },
        materials: { type: 'array', items: { type: 'string' } }, tools: { type: 'array', items: { type: 'string' } },
        preparation: { type: 'array', items: { type: 'string' } }, steps: { type: 'array', minItems: 3, maxItems: 8, items: { type: 'string' } },
        benefits: { type: 'string' }, safety: { type: 'array', items: { type: 'string' } }
      }
    } }
  }
};

function error(res, status, message) { return res.status(status).json({ error: message }); }

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return error(res, 405, 'Please send an image to analyse.'); }
  if (!process.env.SARVAM_API_KEY) return error(res, 503, 'Image ideas are temporarily unavailable. Please try again later.');
  const { image, mimeType, preferences } = req.body || {};
  if (typeof image !== 'string' || !ALLOWED_MIME.has(mimeType) || !image.trim()) return error(res, 400, 'Choose a JPG, PNG or WebP image and try again.');
  const base64 = image.replace(/^data:image\/(?:jpeg|png|webp);base64,/i, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length > Math.ceil(MAX_IMAGE_BYTES * 4 / 3)) return error(res, 413, 'That image is too large. Please choose a smaller image.');
  const bytes = Buffer.from(base64, 'base64');
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) return error(res, 413, 'That image is too large. Please choose a smaller image.');
  const prefs = {
    budget: Math.min(Math.max(Number(preferences?.budget) || 0, 0), 100000),
    skill: ['Beginner', 'Intermediate', 'Advanced'].includes(preferences?.skill) ? preferences.skill : 'Beginner',
    tools: Array.isArray(preferences?.tools) ? preferences.tools.slice(0, 12).map(x => String(x).slice(0, 50)) : [],
    projectType: ['Home', 'Garden', 'Construction', 'Art', 'Utility', 'Anything creative'].includes(preferences?.projectType) ? preferences.projectType : 'Anything creative'
  };
  const prompt = `You are Re, a careful material-reuse guide for people in India. Examine the supplied photo. Report only what is visually supported; distinguish observations from assumptions. If the material is unclear, say so, lower confidence, and ask one concise question in uncertaintyQuestion. Never invent hidden composition, strength, dimensions, or safety. Do not suggest load-bearing/structural use, electrical use, food contact, or use of hazardous/contaminated material. If an item may be hazardous, recommend safe disposal and do not give a reuse project for it. Give exactly three genuinely distinct ideas: kind practical (most practical), creative (unexpected but useful), and budget (best fit to budget). Keep all ideas within the user's budget where possible, skill level, tools, and preferred type. Costs are broad approximate INR ranges, never falsely precise. Ideas need preparation, materials, tools, 3-8 actionable steps, sustainability benefit, estimated time and specific safety notes. Make plans useful, safe, and original. If uncertainty makes a project unsafe, make the idea a safe identification/disposal action instead.\nUser preferences: budget up to ₹${prefs.budget || 'not specified'}, skill ${prefs.skill}, available tools: ${prefs.tools.join(', ') || 'basic household tools only'}, project type: ${prefs.projectType}. Return only the requested JSON object.`;
  try {
    const upstream = await fetch('https://api.sarvam.ai/v2/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'api-subscription-key': process.env.SARVAM_API_KEY },
        body: JSON.stringify({ model: 'glm5.3-flash', temperature: 0.65, reasoning_effort: 'low', max_tokens: 3600,
        response_format: { type: 'json_schema', json_schema: { name: 'reuse_analysis', strict: true, schema } },
        messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: `data:${mimeType};base64,${bytes.toString('base64')}` } }] }]
      }), signal: AbortSignal.timeout(55000)
    });
    if (upstream.status === 429) return error(res, 429, 'The idea studio is busy right now. Please wait a moment and try again.');
    if (upstream.status === 401 || upstream.status === 403) return error(res, 503, 'Image ideas are temporarily unavailable. Please try again later.');
    if (upstream.status === 413) return error(res, 413, 'That image is too large to analyse. Please choose a smaller image.');
    if (!upstream.ok) return error(res, upstream.status >= 500 ? 503 : 502, 'We couldn’t analyse that image just now. Please try again.');
    const payload = await upstream.json();
    const raw = payload?.choices?.[0]?.message?.content;
    const text = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw.map(part => part.text || '').join('') : '';
    const result = JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
    if (!result || !Array.isArray(result.ideas) || result.ideas.length !== 3 || typeof result.detectedMaterial !== 'string') throw new Error('Invalid response shape');
    return res.status(200).json(result);
  } catch (err) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') return error(res, 504, 'The analysis took too long. Please try again.');
    console.error('Sarvam analysis failed:', err?.message || 'unknown error');
    return error(res, 502, 'We couldn’t make safe ideas from that image. Try a clearer photo or add more context.');
  }
}
