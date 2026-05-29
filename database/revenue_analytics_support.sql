create index if not exists idx_billing_requests_status
on public.billing_requests(status);

create index if not exists idx_billing_requests_created_at
on public.billing_requests(created_at);

create index if not exists idx_billing_requests_request_type
on public.billing_requests(request_type);

create index if not exists idx_profiles_plan
on public.profiles(plan);
