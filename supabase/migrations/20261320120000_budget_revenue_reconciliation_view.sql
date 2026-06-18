/*
  # Budget revenue reconciliation view (Phase P2B-4C)

  AGM revenue budget vs mapped bank credits (bank only, no invoices).
*/

BEGIN;

CREATE OR REPLACE VIEW public.budget_revenue_reconciliation AS
WITH bank_revenue AS (
  SELECT
    mbt.property_id,
    mbt.fiscal_year,
    mbt.budget_category,
    coalesce(sum(mbt.amount), 0) AS actual_amount,
    count(DISTINCT mbt.bank_transaction_id) AS transaction_count
  FROM public.mapped_bank_transactions mbt
  WHERE mbt.amount > 0
    AND mbt.budget_type = 'revenue'
  GROUP BY mbt.property_id, mbt.fiscal_year, mbt.budget_category
)
SELECT
  bl.property_id,
  bl.fiscal_year,
  bl.category,
  bl.budget_amount,
  coalesce(br.actual_amount, 0) AS actual_amount,
  bl.budget_amount - coalesce(br.actual_amount, 0) AS remaining_amount,
  CASE
    WHEN bl.budget_amount <= 0 THEN NULL
    ELSE round((coalesce(br.actual_amount, 0) / bl.budget_amount) * 100, 1)
  END AS collection_percent,
  coalesce(br.transaction_count, 0)::integer AS transaction_count,
  CASE
    WHEN bl.budget_amount <= 0 THEN 'normal'
    WHEN coalesce(br.actual_amount, 0) >= bl.budget_amount THEN 'complete'
    WHEN coalesce(br.actual_amount, 0) >= bl.budget_amount * 0.8 THEN 'warning'
    ELSE 'normal'
  END AS status
FROM public.agm_budget_lines bl
LEFT JOIN bank_revenue br
  ON br.property_id = bl.property_id
 AND br.fiscal_year = bl.fiscal_year
 AND br.budget_category = bl.category
WHERE bl.budget_type = 'revenue';

COMMENT ON VIEW public.budget_revenue_reconciliation IS
  'Revenue budget vs mapped bank inflows per AGM category.';

GRANT SELECT ON public.budget_revenue_reconciliation TO authenticated, service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
