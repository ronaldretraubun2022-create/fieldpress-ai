# Setup Domain FieldPress AI

## Rekomendasi

Gunakan Cloudflare untuk DNS.

Contoh domain:
```txt
fieldpressai.id
app.fieldpressai.id
```

## Setup di Vercel

1. Project → Settings → Domains
2. Add domain:
   ```txt
   app.fieldpressai.id
   ```
3. Vercel akan memberi DNS record.

## Setup di Cloudflare

Tambahkan record:

```txt
Type: CNAME
Name: app
Target: cname.vercel-dns.com
Proxy: DNS only atau Proxied
```

Tunggu propagasi.

## Supabase Auth Redirect URL

Masuk Supabase:

```txt
Authentication → URL Configuration
```

Tambahkan:

```txt
https://app.fieldpressai.id
https://app.fieldpressai.id/login.html
https://app.fieldpressai.id/dashboard.html
```

## Backend CORS

Di backend `.env`:

```env
CLIENT_ORIGIN=https://app.fieldpressai.id
```
