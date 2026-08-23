# Prompt Engine

A React/Vite prompt-refinement UI with a small Node backend that calls Groq.

## Local Development

Create an env file from the example:

```bash
cp .env.example .env
```

Set `GROQ_API_KEY` in `.env`, then run the frontend and backend:

```bash
npm run dev
npm run server
```

The Vite app runs on `http://localhost:5173`. The backend runs on `http://localhost:3001`.

Local Vite dev already proxies `/api` to `http://localhost:3001`, so `VITE_API_BASE` is usually not needed locally.

If you bypass the Vite proxy, add this to `.env`:

```bash
VITE_API_BASE=http://localhost:3001
```

## Production Deployment

The prompt generation endpoint is implemented in `src/backend/server.js`. Static hosts like GitHub Pages cannot run that file.

If the live site shows:

```text
Prompt Engine API not found
/api/refine returned a web page instead of API JSON
HTTP 405
```

then the frontend is deployed, but the backend is not.

### Option 1: Deploy One Node App

Deploy this repo to a Node host such as Render, Railway, or Fly.

Build command:

```bash
npm install && npm run build
```

Start command:

```bash
npm run server
```

Environment variables:

```bash
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b
```

The Node server serves both `dist` and `/api/refine`, so `VITE_API_BASE` is not needed.

### Option 2: GitHub Pages Frontend + Separate Backend

Deploy the backend to a Node host with:

```bash
npm run server
```

Set backend environment variables:

```bash
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b
ALLOWED_ORIGINS=https://danielkolp.github.io
```

Then deploy the GitHub Pages frontend with the Render backend URL available during the Vite build:

```bash
VITE_API_BASE=https://promptengine.onrender.com npm run deploy
```

On Windows PowerShell:

```powershell
$env:VITE_API_BASE='https://promptengine.onrender.com'
npm run deploy
```

Verify the backend directly:

```bash
curl https://promptengine.onrender.com/api/health
```

It should return JSON, not an HTML page.
