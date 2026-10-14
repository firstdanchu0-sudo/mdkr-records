-- MDKR point detail RPC: read-only, same source and formula as v1.0 mdkr_player_stats.
CREATE OR REPLACE FUNCTION public.mdkr_point_top20(p_user_id uuid)
RETURNS TABLE(chart_id text, level integer, judge text, accuracy numeric, chart_points numeric)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $fn$
  SELECT q.chart_id, q.level::integer, q.judge, q.accuracy,
         ROUND(q.chart_points, 3) AS chart_points
  FROM (
    SELECT r.chart_id, r.level, r.judge, r.accuracy,
      (CASE r.level WHEN 10 THEN 300 WHEN 11 THEN 450 WHEN 12 THEN 650 ELSE 0 END)::numeric
      * POWER(GREATEST(0::numeric, LEAST(100::numeric,
          CASE WHEN r.judge='AP' THEN 100::numeric ELSE COALESCE(r.accuracy::numeric,0::numeric) END
        )) / 100::numeric,20)
      * (CASE r.judge WHEN 'AP' THEN 1.00::numeric WHEN 'FC' THEN 0.85::numeric ELSE 0.65::numeric END)
      AS chart_points
    FROM public.mdkr_rankings r
    WHERE r.user_id=p_user_id
  ) q
  ORDER BY q.chart_points DESC, q.chart_id ASC
  LIMIT 20;
$fn$;
REVOKE ALL ON FUNCTION public.mdkr_point_top20(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mdkr_point_top20(uuid) TO anon, authenticated;
