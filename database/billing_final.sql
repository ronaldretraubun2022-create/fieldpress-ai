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

alter table public.billing_requests enable row level security;

drop policy if exists "Users can insert own billing requests" on public.billing_requests;
drop policy if exists "Users can read own billing requests" on public.billing_requests;
drop policy if exists "Admins can read all billing requests" on public.billing_requests;
drop policy if exists "Admins can update all billing requests" on public.billing_requests;

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

create policy "Admins can read all billing requests"
on public.billing_requests
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

create policy "Admins can update all billing requests"
on public.billing_requests
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
    and p.role in ('admin', 'owner')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
    and p.role in ('admin', 'owner')
  )
);
