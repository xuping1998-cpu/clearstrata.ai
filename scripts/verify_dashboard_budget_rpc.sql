-- 在生产 Supabase SQL Editor 执行：确认四个 Dashboard RPC 存在且签名为 (uuid, int)
-- 期望：4 行，且 regprocedure 含 (uuid, integer) 或 (uuid, int)（等价）

SELECT
  p.proname,
  pg_get_function_identity_arguments(p.oid) AS args,
  p.oid::regprocedure AS regproc
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'dashboard_budget_summary',
    'dashboard_budget_categories',
    'dashboard_budget_trend',
    'dashboard_budget_alerts'
  )
ORDER BY p.proname;
