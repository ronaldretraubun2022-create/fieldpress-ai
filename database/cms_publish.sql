create table if not exists public.cms_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  article_id uuid references public.articles(id) on delete set null,
  title text not null,
  slug text not null,
  excerpt text default '',
  content text not null,
  seo_keywords text[] default '{}',
  status text default 'draft',
  published_at timestamptz,
  created_at timestamptz default now()
);

alter table public.cms_posts enable row level security;

drop policy if exists "Users can insert own cms posts" on public.cms_posts;
drop policy if exists "Users can read own cms posts" on public.cms_posts;
drop policy if exists "Users can update own cms posts" on public.cms_posts;
drop policy if exists "Users can delete own cms posts" on public.cms_posts;

create policy "Users can insert own cms posts"
on public.cms_posts
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can read own cms posts"
on public.cms_posts
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can update own cms posts"
on public.cms_posts
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own cms posts"
on public.cms_posts
for delete
to authenticated
using (auth.uid() = user_id);
