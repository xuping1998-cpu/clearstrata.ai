-- 生产 Supabase SQL Editor：验证预算 Dashboard 依赖是否齐全

-- 1) 成员辅助函数
SELECT
  p.proname,
  pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('user_property_ids', 'user_property_staff_ids')
ORDER BY p.proname;

-- 2) 预算包与解析函数
SELECT
  p.proname,
  pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'active_budget_package_id',
    'resolve_invoice_budget_category_id',
    'resolve_quote_budget_category_id'
  )
ORDER BY p.proname;

-- 3) Dashboard RPC
SELECT
  p.proname,
  pg_get_function_identity_arguments(p.oid) AS args
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

-- 4) 关键表
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'budget_package',
    'annual_budgets',
    'budget_categories',
    'procurement_jobs',
    'procurement_quotes'
  )
ORDER BY table_name;

-- 5) invoices.fiscal_year
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'invoices'
  AND column_name = 'fiscal_year';
