/*
USAGE:
1. Copy file quota-card.js into:
   assets/js/features/quota-card.js

2. In dashboard.html, add this where you want the card:

   <div id="quotaCard" class="mb-8"></div>

3. In assets/js/app.js or dashboard JS, add:

   import { renderQuotaCard } from "./features/quota-card.js";

   await renderQuotaCard("#quotaCard");

4. You can also use it in reporter.js or notulen.js:

   import { renderQuotaCard } from "./features/quota-card.js";
   await renderQuotaCard("#quotaCard");

5. Make sure database/security_quota.sql already created:
   audio_usage_logs
   token_topups
   subscription_plans
*/

export {};
