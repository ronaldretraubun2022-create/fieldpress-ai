# FieldPress Admin Production Pack

Copy to project root:
- admin.html
- assets/js/features/admin-production.js
- database/admin_production_pack.sql
- docs/INSTALL_ADMIN_PRODUCTION_PACK.md

Run SQL:
Supabase -> SQL Editor -> New Query -> paste database/admin_production_pack.sql -> Run

Patch assets/js/admin.js:

Add import at top:
import { renderAdminProductionPack } from "./features/admin-production.js";

Change reloadAdmin to:
async function reloadAdmin() {
  await renderRevenueAnalytics();
  await renderAdminProductionPack();
  await renderBillingRequests();
}

Deploy:
git add .
git commit -m "Add admin production pack"
git push
