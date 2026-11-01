import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import analyze from './api/analyze.js';

function localAnalyzeApi() {
  return {
    name: 're-local-analyze-api',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '');
      if (!process.env.SARVAM_API_KEY && env.SARVAM_API_KEY) process.env.SARVAM_API_KEY = env.SARVAM_API_KEY;

      server.middlewares.use('/api/analyze', async (req, res) => {
        const chunks = [];
        let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 4 * 1024 * 1024) {
            res.statusCode = 413;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'That image is too large. Please choose a smaller image.' }));
            return;
          }
          chunks.push(chunk);
        }
        try {
          req.body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        } catch {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'We couldn’t read that request. Please try again.' }));
          return;
        }

        const response = {
          status(code) { res.statusCode = code; return this; },
          setHeader(name, value) { res.setHeader(name, value); },
          json(data) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify(data));
            return this;
          }
        };
        try {
          await analyze(req, response);
        } catch (error) {
          console.error('Local analysis route failed:', error?.message || 'unknown error');
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'We couldn’t analyse that image. Please try again.' }));
          }
        }
      });
    }
  };
}

export default defineConfig({ plugins: [react(), localAnalyzeApi()] });
