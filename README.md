# Re — Give Everything a Second Life

An image-led material reuse discovery app built with React, Vite, and a Vercel serverless function. The browser compresses uploaded photos and sends them to `/api/analyze`; the server calls Sarvam's `glm5.3-flash` model and returns three safety-minded project guides.

## Run locally

Requirements: Node.js 20 or newer and npm.

```sh
npm install
```

Copy `.env.example` to `.env.local` and set `SARVAM_API_KEY` to your Sarvam subscription key. The key is read only by the server side; it is never bundled into the browser.

Start the complete local app, including `/api/analyze`, with:

```sh
npm run dev
```

Vite serves it at `http://localhost:5173` and runs the same API handler locally. The standalone `npx vercel dev` command also works if you prefer Vercel's local runtime.

## Deploy to Vercel Hobby

```sh
npm install
npx vercel
```

Add `SARVAM_API_KEY` in the Vercel project settings under **Settings → Environment Variables** (Production and Preview as needed), then deploy:

```sh
npx vercel --prod
```

The included `api/analyze.js` is deployed as a Node.js serverless function. Vercel detects the Vite build from `npm run build`; no database or authentication configuration is needed.

## Notes

- Accepted uploads: JPG, PNG, and WebP, up to 15 MB before browser compression. The compressed image is capped at 2 MB before submission.
- The endpoint validates the MIME type and payload size, bounds preference values, handles upstream throttling and errors, and returns user-friendly messages.
- Visual observations and assumptions are returned in separate fields so an uncertain material identification is clear to the user.
- AI estimates and material identification are guidance only. The prompt forbids structural/load-bearing, electrical, hazardous, and food-contact reuse recommendations.
