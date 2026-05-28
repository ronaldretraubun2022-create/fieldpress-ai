alter table public.profiles enable row level security;
alter table public.ai_usage_logs enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.articles enable row level security;
alter table public.recordings enable row level security;
alter table public.transcripts enable row level security;
alter table public.meeting_notes enable row level security;
alter table public.exports enable row level security;
alter table public.activity_logs enable row level security;

create policy "profiles read own" on public.profiles for select using (auth.uid() = id);
create policy "profiles update own" on public.profiles for update using (auth.uid() = id);
create policy "profiles insert own" on public.profiles for insert with check (auth.uid() = id);

create policy "plans public read" on public.subscription_plans for select using (true);

create policy "usage read own" on public.ai_usage_logs for select using (auth.uid() = user_id);
create policy "usage insert service or own" on public.ai_usage_logs for insert with check (auth.uid() = user_id);

create policy "articles crud own" on public.articles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "recordings crud own" on public.recordings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "transcripts crud own" on public.transcripts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notes crud own" on public.meeting_notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "exports crud own" on public.exports for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "activities read own" on public.activity_logs for select using (auth.uid() = user_id);
create policy "activities insert own" on public.activity_logs for insert with check (auth.uid() = user_id);

create policy "audio own read" on storage.objects for select using (bucket_id='audio' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "audio own insert" on storage.objects for insert with check (bucket_id='audio' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "exports own read" on storage.objects for select using (bucket_id='exports' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "exports own insert" on storage.objects for insert with check (bucket_id='exports' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "thumbnail public read" on storage.objects for select using (bucket_id='thumbnails');
create policy "thumbnail own insert" on storage.objects for insert with check (bucket_id='thumbnails' and auth.uid()::text = (storage.foldername(name))[1]);
