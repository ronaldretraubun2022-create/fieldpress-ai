# Deploy FieldPress AI ke Vercel

## 1. Push project ke GitHub

```bash
git init
git add .
git commit -m "FieldPress AI production"
git branch -M main
git remote add origin https://github.com/USERNAME/fieldpress-ai.git
git push -u origin main
```

## 2. Import ke Vercel

1. Buka Vercel
2. Add New Project
3. Import repository `fieldpress-ai`
4. Framework: Vite
5. Build command:
   ```bash
   npm run build
   ```
6. Output directory:
   ```txt
   dist
   ```

## 3. Environment Variables

Tambahkan env di Vercel:

```env
VITE_SUPABASE_URL=https://vmudtmujzcqsmvcrzcwi.supabase.co
VITE_SUPABASE_ANON_KEY=ISI_ANON_KEY
VITE_API_BASE=https://BACKEND_RENDER_URL/api
```

Catatan:
- Jangan taruh `SUPABASE_SERVICE_ROLE_KEY` di Vercel frontend.
- Service role hanya di backend.

## 4. Deploy

Klik Deploy.

Hasil:
```txt
https://fieldpress-ai.vercel.app
```
