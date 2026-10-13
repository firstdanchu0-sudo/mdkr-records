-- MDKR v0.9 profile: approved records by chart and top-song aggregates.
-- Run in Supabase SQL editor. Read-only RPC; does not modify submitted records.
create or replace function public.mdkr_profile_chart_summary(p_user_id uuid)
returns table (
 chart_id text,
 record_count bigint,
 avg_el numeric,
 best_detail bigint,
 best_el bigint,
 best_judge text,
 best_created_at timestamptz
)
language sql stable security invoker set search_path = '' as $sql$
 with approved as (
  select s.chart_id, s.judge, s.created_at,
         (coalesce(s.early,0)+coalesce(s.late,0))::bigint as el,
         (coalesce(s.early,0)+coalesce(s.late,0)+coalesce(s.great,0)+2*coalesce(s.miss,0))::bigint as detail,
         s.id
  from public.submissions s
  where s.user_id=p_user_id and s.status='APPROVED'
 ), ranked as (
  select *, row_number() over (
   partition by chart_id
   order by detail asc,
     case judge when 'AP' then 0 when 'FC' then 1 else 2 end,
     created_at desc,id desc
  ) as num
  from approved
 )
 select r.chart_id, count(*)::bigint as record_count,
        round(avg(r.el),2) as avg_el,
        max(r.detail) filter (where r.num=1) as best_detail,
        max(r.el) filter (where r.num=1) as best_el,
        max(r.judge) filter (where r.num=1) as best_judge,
        max(r.created_at) filter (where r.num=1) as best_created_at
 from ranked r
 group by r.chart_id
 order by count(*) desc, r.chart_id;
$sql$;
revoke all on function public.mdkr_profile_chart_summary(uuid) from public;
grant execute on function public.mdkr_profile_chart_summary(uuid) to anon,authenticated;
