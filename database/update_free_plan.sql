
update public.subscription_plans
set
  ai_generates = 3,
  audio_minutes = 3
where code = 'free';

update public.subscription_plans
set
  ai_generates = 100,
  audio_minutes = 180
where code = 'basic';

update public.subscription_plans
set
  ai_generates = 500,
  audio_minutes = 1200
where code = 'pro';
