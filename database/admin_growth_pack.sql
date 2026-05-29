-- FIELDPRESS AI ADMIN GROWTH PACK
-- Run in Supabase SQL Editor.

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.admin_audit_logs enable row level security;

drop policy if exists "Admins can read audit logs" on public.admin_audit_logs;
drop policy if exists "Admins can insert audit logs" on public.admin_audit_logs;

create policy "Admins can read audit logs"
on public.admin_audit_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
    and p.role in ('admin', 'owner')
  )
);

create policy "Admins can insert audit logs"
on public.admin_audit_logs
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
    and p.role in ('admin', 'owner')
  )
);

alter table public.profiles
add column if not exists status text default 'active';

alter table public.profiles
add column if not exists quota_override_ai integer;

alter table public.profiles
add column if not exists quota_override_audio_minutes integer;
