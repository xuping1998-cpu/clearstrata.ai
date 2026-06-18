/*
  # Budget risk alerts view (Phase P2B-4D)

  Read-only aggregation of expense variance + revenue reconciliation + unmapped / no-activity signals.
*/

BEGIN;

CREATE OR REPLACE VIEW public.budget_risk_alerts AS
WITH fiscal_ctx AS (
  SELECT
    extract(year FROM current_date)::integer AS current_fy,
    (
      (current_date - make_date(extract(year FROM current_date)::integer, 1, 1) + 1)::numeric
      / (
        make_date(extract(year FROM current_date)::integer, 12, 31)
        - make_date(extract(year FROM current_date)::integer, 1, 1)
        + 1
      )::numeric
    ) AS fy_progress
),
expense_over AS (
  SELECT
    ev.property_id,
    ev.fiscal_year,
    'EXPENSE_OVER_BUDGET'::text AS alert_type,
    ev.budget_category,
    'critical'::text AS severity,
    '已超预算'::text AS message,
    ev.budget_amount,
    ev.actual_amount,
    ev.variance_amount,
    ev.variance_percent AS percent_value
  FROM public.budget_expense_variance ev
  WHERE ev.budget_amount > 0
    AND ev.actual_amount >= ev.budget_amount
),
expense_near AS (
  SELECT
    ev.property_id,
    ev.fiscal_year,
    'EXPENSE_NEAR_LIMIT'::text AS alert_type,
    ev.budget_category,
    'warning'::text AS severity,
    '预算使用率超过80%'::text AS message,
    ev.budget_amount,
    ev.actual_amount,
    ev.variance_amount,
    ev.variance_percent AS percent_value
  FROM public.budget_expense_variance ev
  WHERE ev.budget_amount > 0
    AND ev.actual_amount >= ev.budget_amount * 0.8
    AND ev.actual_amount < ev.budget_amount
),
revenue_critical AS (
  SELECT
    rr.property_id,
    rr.fiscal_year,
    'REVENUE_COLLECTION_CRITICAL'::text AS alert_type,
    rr.category AS budget_category,
    'critical'::text AS severity,
    '收款进度严重偏低'::text AS message,
    rr.budget_amount,
    rr.actual_amount,
    rr.remaining_amount AS variance_amount,
    rr.collection_percent AS percent_value
  FROM public.budget_revenue_reconciliation rr
  CROSS JOIN fiscal_ctx fc
  WHERE rr.budget_amount > 0
    AND rr.fiscal_year = fc.current_fy
    AND coalesce(rr.collection_percent, 0) < 25
    AND fc.fy_progress >= 0.5
),
revenue_low AS (
  SELECT
    rr.property_id,
    rr.fiscal_year,
    'REVENUE_COLLECTION_LOW'::text AS alert_type,
    rr.category AS budget_category,
    'warning'::text AS severity,
    '收款进度明显低于预期'::text AS message,
    rr.budget_amount,
    rr.actual_amount,
    rr.remaining_amount AS variance_amount,
    rr.collection_percent AS percent_value
  FROM public.budget_revenue_reconciliation rr
  CROSS JOIN fiscal_ctx fc
  WHERE rr.budget_amount > 0
    AND rr.fiscal_year = fc.current_fy
    AND coalesce(rr.collection_percent, 0) < 50
    AND fc.fy_progress >= 0.25
    AND NOT (
      coalesce(rr.collection_percent, 0) < 25
      AND fc.fy_progress >= 0.5
    )
),
unmapped_expense AS (
  SELECT
    i.property_id,
    coalesce(i.accounting_year, i.fiscal_year) AS fiscal_year,
    'UNMAPPED_EXPENSE'::text AS alert_type,
    NULL::text AS budget_category,
    'warning'::text AS severity,
    '发现未映射支出'::text AS message,
    0::numeric AS budget_amount,
    coalesce(sum(i.total_amount), 0) AS actual_amount,
    count(*)::numeric AS variance_amount,
    NULL::numeric AS percent_value
  FROM public.invoices i
  LEFT JOIN public.mapped_invoice_actuals mia ON mia.invoice_id = i.id
  WHERE i.status = 'approved'
    AND mia.invoice_id IS NULL
    AND coalesce(i.accounting_year, i.fiscal_year) IS NOT NULL
  GROUP BY i.property_id, coalesce(i.accounting_year, i.fiscal_year)
  HAVING count(*) > 0
),
unmapped_revenue AS (
  SELECT
    bt.property_id,
    extract(year FROM bt.transaction_date)::integer AS fiscal_year,
    'UNMAPPED_REVENUE'::text AS alert_type,
    NULL::text AS budget_category,
    'warning'::text AS severity,
    '发现未映射收入'::text AS message,
    0::numeric AS budget_amount,
    coalesce(sum(bt.amount), 0) AS actual_amount,
    count(*)::numeric AS variance_amount,
    NULL::numeric AS percent_value
  FROM public.bank_transactions bt
  LEFT JOIN public.mapped_bank_transactions mbt ON mbt.bank_transaction_id = bt.id
  WHERE bt.amount > 0
    AND mbt.bank_transaction_id IS NULL
    AND bt.transaction_date IS NOT NULL
  GROUP BY bt.property_id, extract(year FROM bt.transaction_date)::integer
  HAVING count(*) > 0
),
no_activity_expense AS (
  SELECT
    ev.property_id,
    ev.fiscal_year,
    'NO_ACTIVITY'::text AS alert_type,
    ev.budget_category,
    'info'::text AS severity,
    '预算科目长期无活动'::text AS message,
    ev.budget_amount,
    ev.actual_amount,
    ev.variance_amount,
    ev.variance_percent AS percent_value
  FROM public.budget_expense_variance ev
  CROSS JOIN fiscal_ctx fc
  WHERE ev.budget_amount > 0
    AND ev.actual_amount = 0
    AND ev.fiscal_year = fc.current_fy
    AND current_date >= make_date(ev.fiscal_year, 1, 1) + interval '90 days'
),
no_activity_revenue AS (
  SELECT
    rr.property_id,
    rr.fiscal_year,
    'NO_ACTIVITY'::text AS alert_type,
    rr.category AS budget_category,
    'info'::text AS severity,
    '预算科目长期无活动'::text AS message,
    rr.budget_amount,
    rr.actual_amount,
    rr.remaining_amount AS variance_amount,
    rr.collection_percent AS percent_value
  FROM public.budget_revenue_reconciliation rr
  CROSS JOIN fiscal_ctx fc
  WHERE rr.budget_amount > 0
    AND rr.actual_amount = 0
    AND rr.fiscal_year = fc.current_fy
    AND current_date >= make_date(rr.fiscal_year, 1, 1) + interval '90 days'
)
SELECT
  property_id,
  fiscal_year,
  alert_type,
  budget_category,
  severity,
  message,
  budget_amount,
  actual_amount,
  variance_amount,
  percent_value,
  now() AS created_at
FROM expense_over
UNION ALL
SELECT property_id, fiscal_year, alert_type, budget_category, severity, message,
       budget_amount, actual_amount, variance_amount, percent_value, now()
FROM expense_near
UNION ALL
SELECT property_id, fiscal_year, alert_type, budget_category, severity, message,
       budget_amount, actual_amount, variance_amount, percent_value, now()
FROM revenue_critical
UNION ALL
SELECT property_id, fiscal_year, alert_type, budget_category, severity, message,
       budget_amount, actual_amount, variance_amount, percent_value, now()
FROM revenue_low
UNION ALL
SELECT property_id, fiscal_year, alert_type, budget_category, severity, message,
       budget_amount, actual_amount, variance_amount, percent_value, now()
FROM unmapped_expense
UNION ALL
SELECT property_id, fiscal_year, alert_type, budget_category, severity, message,
       budget_amount, actual_amount, variance_amount, percent_value, now()
FROM unmapped_revenue
UNION ALL
SELECT property_id, fiscal_year, alert_type, budget_category, severity, message,
       budget_amount, actual_amount, variance_amount, percent_value, now()
FROM no_activity_expense
UNION ALL
SELECT property_id, fiscal_year, alert_type, budget_category, severity, message,
       budget_amount, actual_amount, variance_amount, percent_value, now()
FROM no_activity_revenue;

COMMENT ON VIEW public.budget_risk_alerts IS
  'Read-only budget risk alerts from variance, reconciliation, unmapped, and no-activity rules.';

GRANT SELECT ON public.budget_risk_alerts TO authenticated, service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
