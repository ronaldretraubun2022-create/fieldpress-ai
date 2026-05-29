# FieldPress Revenue Dashboard + Billing Analytics

## Copy files

Copy to project root:

```txt
assets/js/features/revenue-dashboard.js
assets/js/features/admin-revenue-install-helper.js
database/revenue_analytics_support.sql
```

## Run SQL

Supabase → SQL Editor → New Query:

```txt
database/revenue_analytics_support.sql
```

Run.

## Update admin.html

Inside `<main>`, above Billing Requests, add:

```html
<section>
  <div id="revenueAnalytics"></div>
</section>
```

## Update assets/js/admin.js

Add import at top:

```js
import { renderRevenueDashboard } from "./features/revenue-dashboard.js";
```

Inside init(), after access check:

```js
await renderRevenueDashboard("#revenueAnalytics");
```

After approve/reject success:

```js
await renderRevenueDashboard("#revenueAnalytics");
```
