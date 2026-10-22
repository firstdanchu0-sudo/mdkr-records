-- MDKR RECORDS 2.0 / 7–12 point extension.
-- Run only AFTER original v1.0 mdkr_tier_v10.sql, mdkr_point_details.sql.
-- Take DB backup first. Existing 10-12 scores unchanged; top-20 selection retained.
-- 7:100, 8:160, 9:230, 10:300, 11:450, 12:650.
BEGIN;
CREATE OR REPLACE VIEW public.mdkr_player_stats WITH (security_invoker = true) AS
WITH scored AS (
 SELECT r.*, (CASE r.level WHEN 7 THEN 100 WHEN 8 THEN 160 WHEN 9 THEN 230 WHEN 10 THEN 300 WHEN 11 THEN 450 WHEN 12 THEN 650 ELSE 0 END)::numeric
 * POWER(GREATEST(0::numeric, LEAST(100::numeric, CASE WHEN r.judge='AP' THEN 100::numeric ELSE COALESCE(r.accuracy::numeric,0::numeric) END))/100::numeric,20)
 * (CASE r.judge WHEN 'AP' THEN 1.00::numeric WHEN 'FC' THEN 0.85::numeric ELSE 0.65::numeric END) AS chart_points
 FROM public.mdkr_rankings r
), top20 AS (
 SELECT user_id, COALESCE(SUM(chart_points),0)::numeric AS points FROM (
 SELECT user_id, chart_points, ROW_NUMBER() OVER(PARTITION BY user_id ORDER BY chart_points DESC, chart_id ASC) AS rn FROM scored
 ) q WHERE rn<=20 GROUP BY user_id
), agg AS (
 SELECT user_id, COUNT(*) FILTER(WHERE rank=1) AS total_firsts, COUNT(*) FILTER(WHERE rank<=10) AS top10_count,
 COUNT(*) FILTER(WHERE judge='AP') AS ap_count, COUNT(*) AS charts_count,
 AVG(accuracy) FILTER(WHERE accuracy IS NOT NULL) AS avg_accuracy,
 AVG(early::numeric) AS avg_early, AVG(late::numeric) AS avg_late,
 AVG((early+late)::numeric) AS avg_el, AVG(detail_score::numeric) AS avg_detail
 FROM public.mdkr_rankings GROUP BY user_id
)
SELECT pr.id AS user_id,pr.nickname,pr.avatar_url,
 COALESCE(a.total_firsts,0) AS total_firsts, COALESCE(a.top10_count,0) AS top10_count,
 COALESCE(a.ap_count,0) AS ap_count, COALESCE(a.charts_count,0) AS charts_count,
 a.avg_accuracy,a.avg_early,a.avg_late,a.avg_el,a.avg_detail,COALESCE(t.points,0)::numeric AS points
FROM public.profiles pr LEFT JOIN agg a ON a.user_id=pr.id LEFT JOIN top20 t ON t.user_id=pr.id;
GRANT SELECT ON public.mdkr_player_stats TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.mdkr_point_top20(p_user_id uuid)
RETURNS TABLE(chart_id text, level integer, judge text, accuracy numeric, chart_points numeric)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $fn$
 SELECT q.chart_id,q.level::integer,q.judge,q.accuracy,ROUND(q.chart_points,3)
 FROM (SELECT r.chart_id,r.level,r.judge,r.accuracy,
  (CASE r.level WHEN 7 THEN 100 WHEN 8 THEN 160 WHEN 9 THEN 230 WHEN 10 THEN 300 WHEN 11 THEN 450 WHEN 12 THEN 650 ELSE 0 END)::numeric
  * POWER(GREATEST(0::numeric,LEAST(100::numeric,CASE WHEN r.judge='AP' THEN 100::numeric ELSE COALESCE(r.accuracy::numeric,0::numeric) END))/100::numeric,20)
  * (CASE r.judge WHEN 'AP' THEN 1.00::numeric WHEN 'FC' THEN 0.85::numeric ELSE 0.65::numeric END) AS chart_points
  FROM public.mdkr_rankings r WHERE r.user_id=p_user_id
 ) q ORDER BY q.chart_points DESC,q.chart_id ASC LIMIT 20;
$fn$;
REVOKE ALL ON FUNCTION public.mdkr_point_top20(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mdkr_point_top20(uuid) TO anon, authenticated;
COMMIT;
-- Sanity check (must be read-only):
-- SELECT level, count(*) FROM public.mdkr_rankings GROUP BY level ORDER BY level;
-- SELECT user_id, points FROM public.mdkr_player_stats ORDER BY points DESC LIMIT 5;
