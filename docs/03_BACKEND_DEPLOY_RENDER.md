# Deploy Backend ke Render

## 1. Buat Web Service

Render → New → Web Service → Connect GitHub repo.

## 2. Settings

Build Command:
```bash
npm install
```

Start Command:
```bash
node server/server.js
```

## 3. Environment Variables

```env
SUPABASE_URL=https://vmudtmujzcqsmvcrzcwi.supabase.co
SUPABASE_ANON_KEY=ISI_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=ISI_SERVICE_ROLE_KEY
OPENAI_API_KEY=ISI_OPENAI_API_KEY
CLIENT_ORIGIN=https://app.fieldpressai.id
PORT=10000
```

## 4. Update frontend API base

Di Vercel env:

```env
VITE_API_BASE=https://fieldpress-ai-api.onrender.com/api
```
