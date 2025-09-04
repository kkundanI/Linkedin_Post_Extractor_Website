# LinkedIn Post Extractor

Extract text, all carousel images, videos, and documents from public LinkedIn posts. View the content in the UI and download everything as a ZIP.

  ** [Linkedin Post Extractor ] (https://youtube.com/watch?v=4ixwoUR6fUc&feature=shared)

- Frontend: React + Vite (TypeScript)
- Backend: Express (TypeScript)
- Extraction: Cheerio (HTML parsing), Puppeteer (dynamic fallback)
- Downloading: JSZip (zip creation), file-saver (client-side save)
- Reliability: Optional media proxy to bypass CDN/CORS referer issues

---

## Features

- Extracts:
  - Post text
  - All images (including carousel posts)
  - Videos (if available)
  - Documents (PDF/PPT/etc., if available)
- Download:
  - Download all content or selected items as a ZIP (from the UI)
- Endpoints:
  - POST /api/linkedin/extract — returns structured content (text/images/videos/documents)
  - GET /api/proxy?url=... — streams media via the backend for reliable downloads
  - GET /api/health — health check

---

## Requirements

- Node.js 18+ and npm
- Internet access to LinkedIn CDN
- Windows/macOS/Linux supported

Optional (for best extraction coverage):
- BROWSERLESS_API_KEY for browserless cloud rendering (extracts more media on heavy JS pages)

Notes:
- On first run, Puppeteer may download a Chromium build (can take a few minutes).
- Ensure the LinkedIn post is public (not behind login).

---

## Quick Start (Windows PowerShell)

1) Install dependencies
```powershell
npm install
```

2) Start the development server
```powershell
npx tsx server\index.ts
```

3) Open the app
- http://localhost:5000/

If port 5000 is busy:
```powershell
$env:PORT="5173"
npx tsx server\index.ts
```
Then open http://localhost:5173/

---

## Quick Start (macOS/Linux)

1) Install dependencies
```bash
npm install
```

2) Start the development server
```bash
npx tsx server/index.ts
```

3) Open the app
- http://localhost:5000/

If port 5000 is busy:
```bash
export PORT=5173
npx tsx server/index.ts
```
Then open http://localhost:5173/

---

## Environment Variables

- PORT: Port for the server (default: 5000)
- BROWSERLESS_API_KEY: Optional. Enables cloud-rendered extraction for posts that rely on heavy client-side rendering.

Set in PowerShell:
```powershell
$env:BROWSERLESS_API_KEY="your_key_here"
```

Set in macOS/Linux:
```bash
export BROWSERLESS_API_KEY="your_key_here"
```

---

## How to Use

1) In the UI, paste a public LinkedIn post URL.
2) Click “Extract”.
3) Review extracted content:
   - Text
   - Images (all carousel items)
   - Videos
   - Documents
4) Download options:
   - “Download All as ZIP” — bundles all content into a single zip
   - “Download Selected” — pick specific items to include in the zip

Downloads are performed on the client using JSZip + file-saver, fetching assets via the backend proxy (to avoid CDN/CORS issues).

---

## API (for testing and integrations)

- POST /api/linkedin/extract  
  Request body:
  ```json
  { "url": "https://www.linkedin.com/posts/..." }
  ```
  Response:
  ```json
  {
    "text": "Post text...",
    "images": [{ "url": "...", "alt": "...", "filename": "..." }],
    "videos": [{ "url": "...", "title": "...", "duration": "...", "filename": "..." }],
    "documents": [{ "url": "...", "title": "...", "type": "...", "size": "...", "filename": "..." }]
  }
  ```

- GET /api/proxy?url=<encoded_media_url>  
  Streams media through the server so assets are downloadable without CORS/referer issues.

- GET /api/health  
  Returns a simple status payload.

---

## Project Structure
