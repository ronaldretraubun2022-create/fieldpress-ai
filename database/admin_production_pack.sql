alter table public.profiles add column if not exists status text default 'active';
alter table public.profiles add column if not exists quota_override_ai integer;
alter table public.profiles add column if not exists quota_override_audio_minutes integer;

create table if not exists public.token_topups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  package_code text,
  topup_code text,
  extra_generates integer not null default 0,
  extra_audio_minutes integer not null default 0,
  price_idr integer not null default 0,
  payment_status text not null default 'pending',
  note text default '',
  created_at timestamptz default now()
);

alter table public.token_topups enable row level security;

drop policy if exists "Users can read own topups" on public.token_topups;
drop policy if exists "Admins can read all topups" on public.token_topups;
drop policy if exists "Admins can insert topups" on public.token_topups;
drop policy if exists "Admins can update topups" on public.token_topups;

create policy "Users can read own topups"
on public.token_topups
for select
to authenticated
using (auth.uid() = user_id);

create policy "Admins can read all topups"
on public.token_topups
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.role in ('admin', 'owner')
  )
);

create policy "Admins can insert topups"
on public.token_topups
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.role in ('admin', 'owner')
  )
);

create policy "Admins can update topups"
on public.token_topups
for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.role in ('admin', 'owner')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.role in ('admin', 'owner')
  )
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.admin_audit_logs enable row level security;

drop policy if exists "Admins can read admin audit logs" on public.admin_audit_logs;
drop policy if exists "Admins can insert admin audit logs" on public.admin_audit_logs;

create policy "Admins can read admin audit logs"
on public.admin_audit_logs
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.role in ('admin', 'owner')
  )
);

create policy "Admins can insert admin audit logs"
on public.admin_audit_logs
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.role in ('admin', 'owner')
  )
);

drop policy if exists "Admins can update all profiles" on public.profiles;

create policy "Admins can update all profiles"
on public.profiles
for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.role in ('admin', 'owner')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.role in ('admin', 'owner')
  )
);
