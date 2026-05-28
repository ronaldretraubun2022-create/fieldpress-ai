create or replace view public.newsroom_dashboard_stats as
select
  p.id as user_id,
  count(distinct a.id) as total_articles,
  count(distinct r.id) as total_recordings,
  count(distinct m.id) as total_meeting_notes,
  count(distinct u.id) as total_ai_usage
from public.profiles p
left join public.articles a on a.user_id = p.id
left join public.recordings r on r.user_id = p.id
left join public.meeting_notes m on m.user_id = p.id
left join public.ai_usage_logs u on u.user_id = p.id
group by p.id;
