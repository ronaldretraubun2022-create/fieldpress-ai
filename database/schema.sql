create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'user' check (role in ('admin','wartawan','notulen','user')),
  plan text not null default 'free' check (plan in ('free','basic','pro','enterprise')),
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.subscription_plans (
  id uuid primary key default uuid_generate_v4(),
  name text unique not null,
  period text not null check (period in ('day','month')),
  ai_limit int not null,
  price text,
  created_at timestamptz default now()
);

insert into public.subscription_plans(name,period,ai_limit,price) values
('free','day',5,'0'),('basic','month',50,'99000'),('pro','month',300,'299000'),('enterprise','month',1000000,'custom')
on conflict (name) do update set ai_limit=excluded.ai_limit, price=excluded.price;

create table if not exists public.ai_usage_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  feature text not null,
  tokens_used int default 0,
  created_at timestamptz default now()
);

create table if not exists public.recordings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  file_path text,
  mode text check (mode in ('reporter','meeting')),
  duration_seconds int,
  created_at timestamptz default now()
);

create table if not exists public.transcripts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  recording_id uuid references public.recordings(id) on delete set null,
  raw_text text,
  cleaned_text text,
  mode text,
  created_at timestamptz default now()
);

create table if not exists public.articles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  transcript_id uuid references public.transcripts(id) on delete set null,
  title text,
  lead text,
  body text,
  genre text,
  seo_keywords text[] default '{}',
  status text default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.meeting_notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  meeting_date date,
  participants text[] default '{}',
  transcript text,
  summary text,
  key_points text[] default '{}',
  decisions text[] default '{}',
  action_items text[] default '{}',
  created_at timestamptz default now()
);

create table if not exists public.exports (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  export_type text check (export_type in ('txt','pdf','doc','docx')),
  source_table text,
  source_id uuid,
  file_path text,
  created_at timestamptz default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  action text not null,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create index if not exists idx_articles_user on public.articles(user_id, created_at desc);
create index if not exists idx_usage_user on public.ai_usage_logs(user_id, created_at desc);
create index if not exists idx_notes_user on public.meeting_notes(user_id, created_at desc);

insert into storage.buckets (id, name, public) values
('audio','audio',false),('thumbnails','thumbnails',true),('exports','exports',false)
on conflict (id) do nothing;
