# FieldPress AI Usage Monitoring Pack

## Files

Copy to project root:

```txt
assets/js/features/ai-usage-dashboard.js
database/ai_usage.sql
docs/INSTALL_AI_USAGE_MONITORING.md
```

## 1. Run SQL

Supabase → SQL Editor → New Query.

Paste:

```txt
database/ai_usage.sql
```

Run.

## 2. Update admin.html

Inside `<main>`, place this after `revenueAnalytics`:

```html
<section>
  <div id="aiUsageDashboard"></div>
</section>
```

Recommended order:

```html
<section>
  <div id="revenueAnalytics"></div>
</section>

<section>
  <div id="aiUsageDashboard"></div>
</section>

<section>
  <div id="userManagementAdmin"></div>
</section>
```

## 3. Update assets/js/admin.js

Add import at the top:

```js
import { renderAIUsageDashboard } from "./features/ai-usage-dashboard.js";
```

Then update `reloadAdmin()`:

```js
async function reloadAdmin() {
  await renderRevenueAnalytics();
  await renderAIUsageDashboard("#aiUsageDashboard");
  await renderAdminProductionPack();
  await renderBillingRequests();
}
```

## 4. Deploy

```powershell
git add .
git commit -m "Add AI usage monitoring dashboard"
git push
```

## 5. Optional test data

Run in Supabase SQL Editor:

```sql
insert into public.ai_usage_logs (
  user_id,
  feature,
  tokens,
  audio_minutes,
  cost_usd,
  metadata
)
select
  id,
  'ai_generate',
  2500,
  0,
  0.025,
  '{"source":"manual-test"}'::jsonb
from auth.users
where email = 'ronaldretraubun2022@gmail.com';

insert into public.ai_usage_logs (
  user_id,
  feature,
  tokens,
  audio_minutes,
  cost_usd,
  metadata
)
select
  id,
  'audio_transcription',
  0,
  12,
  0.072,
  '{"source":"manual-test"}'::jsonb
from auth.users
where email = 'ronaldretraubun2022@gmail.com';
```
