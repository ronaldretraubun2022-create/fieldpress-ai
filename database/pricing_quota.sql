-- =========================================
-- FIELDPRESS AI PRICING + QUOTA + TOPUP
-- =========================================

alter table public.profiles
add column if not exists plan text default 'free';

alter table public.profiles
add column if not exists role text default 'user';

alter table public.profiles
add column if not exists is_internal boolean default false;

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  price_idr integer not null default 0,
  ai_generates integer not null default 0,
  audio_minutes integer not null default 0,
  storage_mb integer not null default 0,
  allow_pdf boolean default false,
  allow_docx boolean default false,
  allow_cms boolean default false,
  allow_collaboration boolean default false,
  support_level text default 'standard',
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.token_topups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  package_code text not null,
  extra_generates integer not null default 0,
  extra_audio_minutes integer not null default 0,
  price_idr integer not null default 0,
  payment_status text default 'pending',
  note text default '',
  created_at timestamptz default now()
);

create table if not exists public.billing_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  request_type text not null,
  plan_code text,
  topup_code text,
  amount_idr integer default 0,
  whatsapp_message text,
  status text default 'pending',
  created_at timestamptz default now()
);

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
  ('free', 'Free', 0, 5, 10, 100, false, false, false, false, 'community'),
  ('basic', 'Basic', 99000, 100, 120, 1000, true, true, false, false, 'standard'),
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
  support_level = excluded.support_level,
  is_active = true;

alter table public.token_topups enable row level security;
alter table public.billing_requests enable row level security;

drop policy if exists "Users can read own topups" on public.token_topups;
drop policy if exists "Users can insert own billing requests" on public.billing_requests;
drop policy if exists "Users can read own billing requests" on public.billing_requests;

create policy "Users can read own topups"
on public.token_topups
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own billing requests"
on public.billing_requests
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can read own billing requests"
on public.billing_requests
for select
to authenticated
using (auth.uid() = user_id);

-- Jadikan akun pemilik internal unlimited.
-- Ganti email jika perlu.
update public.profiles
set role = 'owner',
    plan = 'enterprise_internal',
    is_internal = true
where email = 'ronaldretraubun2022@gmail.com';
