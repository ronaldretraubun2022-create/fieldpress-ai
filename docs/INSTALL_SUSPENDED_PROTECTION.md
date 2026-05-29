Replace files:
D:\fieldpress-ai\assets\js\auth.js
D:\fieldpress-ai\assets\js\supabase.js
D:\fieldpress-ai\assets\js\features\admin-production.js

Then:
git add assets/js/auth.js assets/js/supabase.js assets/js/features/admin-production.js
git commit -m "Add suspended user protection"
git push

Test:
- Owner stays active and cannot be suspended from UI.
- Normal suspended user cannot login.
- Active user can login normally.
