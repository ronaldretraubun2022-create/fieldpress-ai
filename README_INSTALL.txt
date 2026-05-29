REPLACE FILE:
D:\fieldpress-ai\admin.html

IMPORTANT:
admin.html is already correct with:
<div id="aiUsageDashboard"></div>

If AI Usage still does not appear, edit:
D:\fieldpress-ai\assets\js\admin.js

Add this import near the top:
import { renderAIUsageDashboard } from "./features/ai-usage-dashboard.js";

Change reloadAdmin() to:

async function reloadAdmin() {
  await renderRevenueAnalytics();
  await renderAIUsageDashboard("#aiUsageDashboard");
  await renderAdminProductionPack();
  await renderBillingRequests();
}

Also make sure this file exists:
D:\fieldpress-ai\assets\js\features\ai-usage-dashboard.js

Deploy:
git add admin.html assets/js/admin.js assets/js/features/ai-usage-dashboard.js
git commit -m "Connect AI usage dashboard"
git push
