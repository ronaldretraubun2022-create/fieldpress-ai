FieldPress AI - Billing History Filter Patch

FILE:
assets/js/admin.js

ACTION:
Replace your current assets/js/admin.js with this file.

CHANGES:
- Preserves existing admin dashboard features.
- Keeps Billing Requests as pending-only.
- Keeps Billing History using updated_at ordering.
- Adds working Billing History filter:
  - Semua
  - Approved
  - Rejected
- Preserves selected filter after re-render.
- Shows empty state when selected filter has no records.

COMMAND:
git add assets/js/admin.js
git commit -m "Add billing history filter"
git push

TEST:
1. Open admin.html
2. Scroll to Billing History
3. Change filter to Approved
4. Change filter to Rejected
5. Confirm list changes without console errors
