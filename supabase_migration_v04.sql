-- MDKR RECORDS v0.4 migration
-- 실행 위치: Supabase SQL Editor

alter table public.submissions add column if not exists accuracy numeric(6,3);
alter table public.submissions add column if not exists great integer not null default 0 check (great>=0 and great<=100000);
alter table public.submissions add column if not exists miss integer not null default 0 check (miss>=0 and miss<=100000);
alter table public.submissions add column if not exists level integer;
alter table public.submissions add column if not exists chart_type text;
alter table public.submissions add column if not exists song_title text;

update public.submissions set great=coalesce(great,0), miss=coalesce(miss,0);

grant execute on function public.is_mdkr_admin() to anon, authenticated;
grant select on table public.submissions to anon, authenticated;
grant insert on table public.submissions to authenticated;
grant select on table public.review_logs to authenticated;
grant select on table public.profiles to anon, authenticated;
grant insert, update on table public.profiles to authenticated;

create or replace function public.delete_mdkr_submission(p_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_path text;
begin
  if not public.is_mdkr_admin() then raise exception 'ADMIN_ONLY'; end if;
  select screenshot_path into v_path from public.submissions where id=p_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  delete from public.review_logs where submission_id=p_id;
  delete from public.submissions where id=p_id;
  -- storage object itself is left as-is; optional cleanup can be added with service role later.
end;
$$;
revoke all on function public.delete_mdkr_submission(uuid) from public;
grant execute on function public.delete_mdkr_submission(uuid) to authenticated;

drop view if exists public.mdkr_rankings;
create or replace view public.mdkr_rankings with (security_invoker=true) as
with best as (
  select s.*,
         coalesce(s.great,0) as great0,
         coalesce(s.miss,0) as miss0,
         (coalesce(s.early,0)+coalesce(s.late,0)+coalesce(s.great,0)+coalesce(s.miss,0)*2) as detail_score,
         row_number() over(
           partition by s.chart_id, s.user_id
           order by (coalesce(s.early,0)+coalesce(s.late,0)+coalesce(s.great,0)+coalesce(s.miss,0)*2),
                    case s.judge when 'AP' then 0 when 'FC' then 1 else 2 end,
                    s.created_at, s.id
         ) as personal_num
  from public.submissions s
  where s.status='APPROVED'
), placed as (
  select best.*,
         dense_rank() over(
           partition by best.chart_id
           order by best.detail_score,
                    case best.judge when 'AP' then 0 when 'FC' then 1 else 2 end
         ) as rank
  from best
  where personal_num=1
)
select p.id, p.user_id, p.chart_id, p.song_title, p.level, p.chart_type,
       p.judge, p.accuracy, p.early, p.late, p.great0 as great, p.miss0 as miss,
       p.detail_score, p.created_at, p.rank,
       pr.nickname, pr.avatar_url
from placed p
join public.profiles pr on pr.id=p.user_id;

grant select on public.mdkr_rankings to anon, authenticated;

drop view if exists public.mdkr_player_stats;
create or replace view public.mdkr_player_stats with (security_invoker=true) as
with ranked as (
  select * from public.mdkr_rankings
), agg as (
  select
    user_id,
    count(*) filter (where rank=1) as total_firsts,
    count(*) filter (where rank<=10) as top10_count,
    count(*) filter (where judge='AP') as ap_count,
    count(*) as charts_count,
    avg(accuracy) filter (where accuracy is not null) as avg_accuracy,
    avg(early::numeric) as avg_early,
    avg(late::numeric) as avg_late,
    avg((early+late)::numeric) as avg_el,
    avg(detail_score::numeric) as avg_detail,
    sum(
      (case coalesce(level,10) when 10 then 100 when 11 then 180 when 12 then 300 else 100 end) +
      (case rank when 1 then 80 when 2 then 60 when 3 then 45 when 4 then 35 when 5 then 30 when 6 then 26 when 7 then 22 when 8 then 18 when 9 then 14 when 10 then 10 else 0 end) +
      (case judge when 'AP' then 40 when 'FC' then 20 else 0 end) +
      greatest(0, 20 - detail_score) +
      greatest(0, floor((coalesce(accuracy,95) - 95) * 4))
    )::numeric as points
  from ranked
  group by user_id
)
select pr.id as user_id, pr.nickname, pr.avatar_url,
       coalesce(a.total_firsts,0) as total_firsts,
       coalesce(a.top10_count,0) as top10_count,
       coalesce(a.ap_count,0) as ap_count,
       coalesce(a.charts_count,0) as charts_count,
       a.avg_accuracy, a.avg_early, a.avg_late, a.avg_el, a.avg_detail,
       coalesce(a.points,0) as points
from public.profiles pr
left join agg a on a.user_id=pr.id;

grant select on public.mdkr_player_stats to anon, authenticated;
