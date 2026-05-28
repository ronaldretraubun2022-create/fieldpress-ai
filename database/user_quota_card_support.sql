-- FIELDPRESS AI USER QUOTA CARD SUPPORT

create table if not exists public.audio_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  duration_seconds integer default 0,
  source text default 'upload',
  created_at timestamptz default now()
);

alter table public.audio_usage_logs enable row level security;

drop policy if exists "Users can read own audio usage" on public.audio_usage_logs;
drop policy if exists "Users can insert own audio usage" on public.audio_usage_logs;

create policy "Users can read own audio usage"
on public.audio_usage_logs
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own audio usage"
on public.audio_usage_logs
for insert
to authenticated
with check (auth.uid() = user_id);

insert into public.subscription_plans (
  code,
  name,
  price_idr,
  ai_generates,
  audio_minutes,
  storage_mb,
  allow_pdf,
  allow_docx,
  allow_cms,
  allow_collaboration,
  support_level
)
values
  ('free', 'Free', 0, 3, 3, 100, false, false, false, false, 'community'),
  ('basic', 'Basic', 99000, 100, 180, 1000, true, true, false, false, 'standard'),
  ('pro', 'Pro', 299000, 500, 1200, 10000, true, true, true, true, 'priority'),
  ('enterprise', 'Enterprise', 0, 1000000, 1000000, 1000000, true, true, true, true, 'dedicated'),
  ('enterprise_internal', 'Internal Owner', 0, 1000000, 1000000, 1000000, true, true, true, true, 'internal')
on conflict (code)
do update set
  name = excluded.name,
  price_idr = excluded.price_idr,
  ai_generates = excluded.ai_generates,
  audio_minutes = excluded.audio_minutes,
  storage_mb = excluded.storage_mb,
  allow_pdf = excluded.allow_pdf,
  allow_docx = excluded.allow_docx,
  allow_cms = excluded.allow_cms,
  allow_collaboration = excluded.allow_collaboration,
  support_level = excluded.support_level;
