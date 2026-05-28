-- FIELDPRESS AI SECURITY + QUOTA HARDENING

alter table public.profiles
add column if not exists is_internal boolean default false;

alter table public.profiles
add column if not exists monthly_audio_minutes_limit integer default 0;

alter table public.profiles
add column if not exists monthly_ai_generate_limit integer default 0;

create table if not exists public.audio_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  duration_seconds integer default 0,
  source text default 'upload',
  created_at timestamptz default now()
);

create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  severity text default 'info',
  ip text,
  user_agent text,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

alter table public.audio_usage_logs enable row level security;
alter table public.security_events enable row level security;

drop policy if exists "Users can read own audio usage" on public.audio_usage_logs;
drop policy if exists "Users can insert own audio usage" on public.audio_usage_logs;
drop policy if exists "Users can read own security events" on public.security_events;

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

create policy "Users can read own security events"
on public.security_events
for select
to authenticated
using (auth.uid() = user_id);

update public.profiles
set role = 'owner',
    plan = 'enterprise_internal',
    is_internal = true,
    monthly_ai_generate_limit = 1000000,
    monthly_audio_minutes_limit = 1000000
where email = 'ronaldretraubun2022@gmail.com';
