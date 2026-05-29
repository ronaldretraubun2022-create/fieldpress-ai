# FieldPress Admin Growth Pack

## Fitur
- Revenue Chart bulanan
- Export Revenue CSV
- User Management
- Plan management
- Role management
- Suspend user
- Quota override
- Admin Audit Logs

## 1. Copy files

Copy ke project root:

```txt
assets/js/features/admin-growth.js
database/admin_growth_pack.sql
docs/INSTALL_ADMIN_GROWTH_PACK.md
```

## 2. Run SQL

Supabase → SQL Editor → New Query:

```txt
database/admin_growth_pack.sql
```

Klik RUN.

## 3. Update admin.html

Tambahkan di dalam `<main>`, setelah revenueAnalytics dan sebelum Billing Requests:

```html
<section>
  <div id="revenueChart"></div>
</section>

<section>
  <div id="userManagement"></div>
</section>

<section>
  <div id="adminAuditLogs"></div>
</section>
```

## 4. Update assets/js/admin.js

Tambahkan import di atas:

```js
import { renderAdminGrowthPack } from "./features/admin-growth.js";
```

Di dalam `reloadAdmin()` tambahkan:

```js
await renderAdminGrowthPack();
```

Contoh:

```js
async function reloadAdmin() {
  await renderRevenueAnalytics();
  await renderAdminGrowthPack();
  await renderBillingRequests();
}
```

## 5. Push

```powershell
git add .
git commit -m "Add admin growth analytics"
git push
```
