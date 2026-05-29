Replace:
D:\fieldpress-ai\admin.html

Then make sure assets/js/admin.js imports:
import { renderAIUsageDashboard } from "./features/ai-usage-dashboard.js";

And reloadAdmin() includes:
await renderAIUsageDashboard("#aiUsageDashboard");

Deploy:
git add admin.html assets/js/admin.js
git commit -m "Add AI usage section to admin"
git push
