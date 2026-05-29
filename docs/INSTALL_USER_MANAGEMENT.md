# FieldPress User Management Admin

## Files
Copy to project root:

```txt
assets/js/features/user-management.js
database/user_management.sql
docs/INSTALL_USER_MANAGEMENT.md
```

## SQL
Supabase → SQL Editor → New Query:

Paste:

```txt
database/user_management.sql
```

Run.

## admin.html
Tambahkan di dalam `<main>`, setelah revenueAnalytics:

```html
<section>
  <div id="userManagementAdmin"></div>
</section>
```

## assets/js/admin.js
Tambahkan import di atas:

```js
import { renderUserManagementAdmin } from "./features/user-management.js";
```

Di function `reloadAdmin()` tambahkan:

```js
await renderUserManagementAdmin("#userManagementAdmin");
```

Contoh:

```js
async function reloadAdmin() {
  await renderRevenueAnalytics();
  await renderUserManagementAdmin("#userManagementAdmin");
  await renderBillingRequests();
}
```

## Deploy
```powershell
git add .
git commit -m "Add user management admin"
git push
```
