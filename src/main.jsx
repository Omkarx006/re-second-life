import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronUp, Clock3, Coins, Compass, Hammer, ImagePlus, Leaf, LoaderCircle, Recycle, RotateCcw, ShieldCheck, Sparkles, Upload, X } from 'lucide-react';
import './styles.css';

const materials = ['Bricks', 'Plastic bottles', 'Old wood', 'Cardboard', 'Metal scraps', 'PVC pipes'];
const toolOptions = ['Hand saw', 'Drill', 'Hammer', 'Pliers', 'Sandpaper', 'Paintbrush', 'Scissors', 'No tools yet'];
const projectTypes = ['Home', 'Garden', 'Construction', 'Art', 'Utility', 'Anything creative'];

function App() {
  const inputRef = useRef(null);
  const [screen, setScreen] = useState('home');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [expanded, setExpanded] = useState(-1);
  const [preferences, setPreferences] = useState({ budget: '1000', skill: 'Beginner', tools: ['No tools yet'], projectType: 'Anything creative' });

  function setImage(next) {
    setError('');
    if (!next) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(next.type)) { setError('Please choose a JPG, PNG or WebP image.'); return; }
    if (next.size > 15 * 1024 * 1024) { setError('This image is over 15 MB. Please choose a smaller one.'); return; }
    setFile(next);
    setPreview(URL.createObjectURL(next));
  }
  function clearImage() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null); setPreview(''); setError('');
    if (inputRef.current) inputRef.current.value = '';
  }
  async function compressedData(fileToCompress) {
    const img = await createImageBitmap(fileToCompress);
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    img.close();
    let quality = 0.82;
    let blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
    while (blob && blob.size > 1.6 * 1024 * 1024 && quality > 0.45) {
      quality -= 0.12; blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
    }
    if (!blob) throw new Error('We couldn’t prepare that image. Please try another photo.');
    if (blob.size > 2 * 1024 * 1024) throw new Error('This image is still too large after compression. Please try another photo.');
    return await new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('We couldn’t read that image. Please try again.')); reader.readAsDataURL(blob);
    });
  }
  async function analyze() {
    if (!file) { setError('Add a photo first and we’ll find a way forward.'); return; }
    setBusy(true); setError('');
    try {
      const image = await compressedData(file);
      const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image, mimeType: 'image/jpeg', preferences }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'We couldn’t analyse that image. Please try again.');
      setAnalysis(data); setExpanded(-1); setScreen('results');
    } catch (e) {
      setError(e instanceof TypeError ? 'Can’t reach the local analysis route. Run npm run dev from the Re project folder and keep that terminal open, then try again.' : e.message || 'We couldn’t analyse that image. Please try again.');
    }
    finally { setBusy(false); }
  }
  function start() { setScreen('upload'); setError(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function back() { setScreen(screen === 'preferences' ? 'upload' : 'home'); setError(''); }
  function toggleTool(tool) {
    setPreferences(p => {
      if (tool === 'No tools yet') return { ...p, tools: ['No tools yet'] };
      const active = p.tools.includes(tool) ? p.tools.filter(x => x !== tool) : [...p.tools.filter(x => x !== 'No tools yet'), tool];
      return { ...p, tools: active };
    });
  }

  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={() => setScreen('home')} aria-label="Re home"><span className="brand-mark"><Recycle size={19} strokeWidth={2.3}/></span><span>re<span className="brand-period">.</span></span></button>
      <nav className="topnav"><a href="#how-it-works" onClick={e => { if (screen !== 'home') { e.preventDefault(); setScreen('home'); } }}>How it works</a><a href="#materials" onClick={e => { if (screen !== 'home') { e.preventDefault(); setScreen('home'); } }}>Materials</a></nav>
      {screen !== 'home' && screen !== 'results' ? <div className="step-indicator"><span className={screen === 'upload' ? 'current' : 'done'}>{screen === 'upload' ? '01' : <Check size={13}/>}</span><i/><span className={screen === 'preferences' ? 'current' : ''}>02</span></div> : <button className="nav-cta" onClick={start}>Start exploring <ArrowUpRight size={15}/></button>}
    </header>

    {screen === 'home' && <main>
      <section className="hero">
        <div className="hero-copy"><p className="eyebrow"><span/> A new life for what’s left behind</p><h1>Waste is not<br/>the end of the <em>story.</em></h1><p className="hero-sub">Discover extraordinary possibilities hidden in everyday discarded materials.</p><button className="button button-primary hero-button" onClick={start}>Give it a second life <ArrowRight size={17}/></button><div className="hero-footnote"><span className="tiny-leaf"><Leaf size={13}/></span> Better ideas. Less waste. One photo at a time.</div></div>
        <div className="hero-visual" aria-label="A collection of reclaimed materials"><div className="sun-disc"/><img className="hero-photo" src="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=85" alt="Sunlit textured natural materials"/><div className="visual-wash"/><div className="visual-tag"><span className="tag-dot"/><span>See possibility<br/><b>in the overlooked</b></span><ArrowUpRight size={15}/></div><div className="floating-note"><Sparkles size={15}/><span>One object.<br/><b>Three new beginnings.</b></span></div><div className="visual-index">01 <i/> REIMAGINE</div></div>
      </section>
      <section className="material-band" id="materials"><div className="band-heading"><p className="eyebrow">Start with what you have</p><h2>Good things have<br/>more than one life.</h2></div><div className="material-area"><p>Everyday leftovers, extraordinary starting points.</p><div className="material-list">{materials.map((m,i) => <span className="material-chip" key={m}><span className={`material-number n${i}`}>0{i+1}</span>{m}</span>)}</div></div><button className="round-arrow" onClick={start} aria-label="Start with a material"><ArrowDown size={18}/></button></section>
      <section className="how-section" id="how-it-works"><div className="how-top"><p className="eyebrow">Thoughtful reuse, made simple</p><h2>From leftover to<br/><em>let’s do this.</em></h2></div><div className="how-cards"><article><span className="card-step">01 / NOTICE</span><div className="how-icon"><ImagePlus size={21}/></div><h3>Show us what’s left</h3><p>Upload a photo of an object or material you’re ready to part with.</p></article><article><span className="card-step">02 / IMAGINE</span><div className="how-icon"><Sparkles size={21}/></div><h3>Find what it could be</h3><p>Get three considered ideas shaped around your tools, time and budget.</p></article><article><span className="card-step">03 / MAKE</span><div className="how-icon"><Hammer size={21}/></div><h3>Make a little change</h3><p>Follow a practical guide and give good material another reason to stay.</p></article></div></section>
      <section className="closing-cta"><div><span className="closing-spark"><Leaf size={22}/></span><h2>The next chapter<br/>starts with <em>you.</em></h2><p>Curiosity is the only tool you need to begin.</p></div><button className="button button-light" onClick={start}>Find a new beginning <ArrowRight size={16}/></button><span className="closing-grain"/></section>
    </main>}

    {screen === 'upload' && <main className="workflow"><button className="back-link" onClick={back}><ArrowLeft size={15}/> Back to the beginning</button><div className="workflow-title"><p className="eyebrow">01 / The starting point</p><h1>What are we<br/><em>working with?</em></h1><p>One clear photo is all it takes. Show us the material you’d like to give a second life.</p></div>
      <div className="upload-layout"><div className={`dropzone ${preview ? 'has-preview' : ''}`} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); setImage(e.dataTransfer.files[0]); }}>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setImage(e.target.files[0])} hidden/>
        {preview ? <><img src={preview} alt="Your uploaded material" className="preview-image"/><div className="preview-overlay"><span><Check size={14}/> Looking good</span><div><button onClick={() => inputRef.current?.click()} aria-label="Replace image"><RotateCcw size={16}/></button><button onClick={clearImage} aria-label="Remove image"><X size={17}/></button></div></div></> : <div className="upload-prompt"><div className="upload-icon"><Upload size={22}/></div><h3>Drop your photo here</h3><p>or <button className="inline-button" onClick={() => inputRef.current?.click()}>browse files</button> from your device</p><span className="format-note">JPG, PNG or WebP <i/> UP TO 15 MB</span></div>}
      </div><aside className="upload-aside"><span className="aside-index">A GOOD PHOTO GOES A LONG WAY</span><h3>Let it be seen<br/>in its best light.</h3><p>A little context makes for more useful ideas. Try to include the whole object and show its condition clearly.</p><div className="photo-tip"><span><Check size={13}/></span> Natural light works wonders</div><div className="photo-tip"><span><Check size={13}/></span> One or two items per photo</div><div className="photo-tip"><span><Check size={13}/></span> Show wear, edges and details</div><div className="example-hint"><span>NOT SURE WHAT IT’S MADE OF?</span><p>That’s exactly what we’re here for.</p></div></aside></div>
      {error && <div className="error-banner" role="alert"><X size={16}/>{error}</div>}
      <div className="workflow-actions"><span className="privacy-note"><ShieldCheck size={15}/> Your image is only used to create your ideas.</span><button className="button button-primary" disabled={!file} onClick={() => setScreen('preferences')}>Set the scene <ArrowRight size={16}/></button></div>
    </main>}

    {screen === 'preferences' && <main className="workflow prefs-workflow"><button className="back-link" onClick={back}><ArrowLeft size={15}/> Back to photo</button><div className="workflow-title"><p className="eyebrow">02 / Made for your world</p><h1>Let’s make it<br/><em>work for you.</em></h1><p>A few details help us suggest projects you can actually bring to life.</p></div>
      <div className="prefs-form"><div className="pref-row"><div><span className="field-index">01</span><label htmlFor="budget">What’s your budget?</label><small>A rough ceiling is perfect. We’ll keep costs in INR.</small></div><div className="budget-control"><span>₹</span><input id="budget" inputMode="numeric" type="number" min="0" max="100000" value={preferences.budget} onChange={e => setPreferences(p => ({...p,budget:e.target.value}))}/><span className="budget-suffix">INR</span></div></div>
      <div className="pref-row"><div><span className="field-index">02</span><span className="field-label">How hands-on are you?</span><small>No wrong answers. We’ll meet you where you are.</small></div><div className="choice-group">{['Beginner','Intermediate','Advanced'].map(x => <button key={x} className={preferences.skill === x ? 'choice active' : 'choice'} onClick={() => setPreferences(p => ({...p,skill:x}))}>{x}{preferences.skill === x && <Check size={13}/>}</button>)}</div></div>
      <div className="pref-row"><div><span className="field-index">03</span><span className="field-label">What tools can you reach for?</span><small>Pick what you have. We’ll work around it.</small></div><div className="chip-group">{toolOptions.map(x => <button key={x} className={preferences.tools.includes(x) ? 'select-chip active' : 'select-chip'} onClick={() => toggleTool(x)}>{preferences.tools.includes(x) && <Check size={12}/>} {x}</button>)}</div></div>
      <div className="pref-row last"><div><span className="field-index">04</span><span className="field-label">What would you love to make?</span><small>Choose the direction that feels right.</small></div><div className="type-grid">{projectTypes.map(x => <button key={x} className={preferences.projectType === x ? 'type-choice active' : 'type-choice'} onClick={() => setPreferences(p => ({...p,projectType:x}))}>{x}{preferences.projectType === x && <Check size={13}/>}</button>)}</div></div></div>
      {error && <div className="error-banner" role="alert"><X size={16}/>{error}</div>}
      <div className="workflow-actions"><span className="privacy-note"><Sparkles size={15}/> Three ideas, thoughtfully considered.</span><button className="button button-primary" onClick={analyze} disabled={busy}>{busy ? <><LoaderCircle className="spin" size={17}/> Finding possibilities…</> : <>Find my ideas <ArrowRight size={16}/></>}</button></div>
      {busy && <div className="loading-note"><span className="loading-orbit"><Leaf size={17}/></span><span>Looking closely at your material<br/><small>We’re considering safety, usefulness and possibility.</small></span></div>}
    </main>}

    {screen === 'results' && analysis && <main className="results-page"><button className="back-link" onClick={() => setScreen('preferences')}><ArrowLeft size={15}/> Back to your preferences</button><div className="results-heading"><div><p className="eyebrow">A fresh perspective / Your possibilities</p><h1>There’s more<br/>to <em>{analysis.detectedMaterial || 'this material'}.</em></h1></div><div className="results-photo"><img src={preview} alt="Analysed material"/></div></div>
      <div className="observation-card"><div className="obs-title"><span className="obs-icon"><Compass size={18}/></span><div><small>WHAT WE CAN SEE</small><h3>{analysis.detectedMaterial}</h3></div></div><div className="confidence"><div className="confidence-label"><span>Confidence</span><b>{Math.round((analysis.confidence || 0)*100)}%</b></div><div className="confidence-track"><i style={{width:`${Math.max(0,Math.min(100,(analysis.confidence||0)*100))}%`}}/></div></div><div className="obs-detail"><span>CONDITION</span><p>{analysis.condition}</p></div><div className="obs-detail"><span>VISUAL OBSERVATIONS</span><ul>{(analysis.visualEvidence || []).map((x,i) => <li key={i}>{x}</li>)}</ul></div>{analysis.assumptions?.length > 0 && <div className="obs-detail assumptions"><span>WHAT WE CAN’T CONFIRM FROM THE PHOTO</span><ul>{analysis.assumptions.map((x,i) => <li key={i}>{x}</li>)}</ul></div>}{analysis.uncertaintyQuestion && <div className="uncertainty"><Sparkles size={15}/><span>{analysis.uncertaintyQuestion}</span></div>}</div>
      <div className="ideas-heading"><div><p className="eyebrow">Three ways forward</p><h2>Pick a possibility.</h2></div><span>Choose what feels right<br/>for your next chapter.</span></div>
      <div className="ideas-grid">{(analysis.ideas || []).map((idea,i) => <article className={`idea-card idea-${i} ${expanded===i?'expanded':''}`} key={i}><div className="idea-topline"><span className="idea-number">0{i+1}</span><span className="idea-kind">{idea.kind === 'practical' ? 'THE PRACTICAL ONE' : idea.kind === 'creative' ? 'THE UNEXPECTED ONE' : 'THE BUDGET FRIENDLY ONE'}</span></div><h3>{idea.title}</h3><p className="idea-summary">{idea.summary}</p><div className="idea-meta"><span><Coins size={14}/>{idea.costRange}</span><span><Clock3 size={14}/>{idea.time}</span><span><Hammer size={14}/>{idea.difficulty}</span></div><button className="details-toggle" onClick={() => setExpanded(expanded === i ? -1 : i)} aria-expanded={expanded===i}>{expanded===i?'Close the guide':'Open the build guide'}{expanded===i?<ChevronUp size={16}/>:<ArrowUpRight size={16}/>}</button>{expanded===i && <div className="idea-details"><p className="detail-intro">A guide for your next little transformation.</p><div className="detail-columns"><div><h4>Before you begin</h4><ul>{idea.preparation?.map((x,j)=><li key={j}>{x}</li>)}</ul><h4>Gather</h4><p className="detail-label">MATERIALS</p><ul>{idea.materials?.map((x,j)=><li key={j}>{x}</li>)}</ul><p className="detail-label">TOOLS</p><ul>{idea.tools?.map((x,j)=><li key={j}>{x}</li>)}</ul></div><div><h4>Make it happen</h4><ol>{idea.steps?.map((x,j)=><li key={j}>{x}</li>)}</ol><div className="benefit-note"><Leaf size={15}/>{idea.benefits}</div><h4 className="safety-heading"><ShieldCheck size={15}/> Keep it safe</h4><ul className="safety-list">{idea.safety?.map((x,j)=><li key={j}>{x}</li>)}</ul></div></div></div>}</article>)}</div>
      <div className="results-footer"><span><Leaf size={16}/> Small acts add up. You’ve already started.</span><button className="button button-outline" onClick={() => { clearImage(); setAnalysis(null); setScreen('upload'); }}>Try another material <RotateCcw size={15}/></button></div>
    </main>}

    <footer className="site-footer"><span className="footer-brand"><Recycle size={15}/> re.</span><span>Made for a world with more second chances.</span><span>© RE / 2025</span></footer>
  </div>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
