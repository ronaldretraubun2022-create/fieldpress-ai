-- FIELDPRESS AI USAGE MONITORING
-- Run in Supabase SQL Editor.

create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  feature text not null default 'ai_generate',
  tokens integer not null default 0,
  audio_minutes numeric not null default 0,
  cost_usd numeric not null default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.ai_usage_logs enable row level security;

drop policy if exists "Users can read own ai usage logs" on public.ai_usage_logs;
drop policy if exists "Admins can read all ai usage logs" on public.ai_usage_logs;
drop policy if exists "Authenticated users can insert own ai usage logs" on public.ai_usage_logs;

create policy "Users can read own ai usage logs"
on public.ai_usage_logs
for select
to authenticated
using (auth.uid() = user_id);

create policy "Admins can read all ai usage logs"
on public.ai_usage_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
    and p.role in ('owner', 'admin')
  )
);

create policy "Authenticated users can insert own ai usage logs"
on public.ai_usage_logs
for insert
to authenticated
with check (auth.uid() = user_id);

-- Optional test data for current logged-in owner.
-- Uncomment if you want sample stats:
-- insert into public.ai_usage_logs (user_id, feature, tokens, audio_minutes, cost_usd, metadata)
-- select id, 'ai_generate', 1500, 0, 0.015, '{"source":"sample"}'::jsonb
-- from auth.users
-- where email = 'ronaldretraubun2022@gmail.com';
