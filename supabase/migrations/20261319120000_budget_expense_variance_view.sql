/*
  # Budget expense variance view (Phase P2B-4B)

  AGM expense budget vs mapped invoice actuals (invoices only, no bank double-count).
*/

BEGIN;

CREATE OR REPLACE VIEW public.budget_expense_variance AS
WITH invoice_actuals AS (
  SELECT
    mia.property_id,
    mia.fiscal_year,
    mia.budget_category,
    coalesce(sum(mia.total_amount), 0) AS actual_amount,
    count(DISTINCT mia.invoice_id) AS invoice_count
  FROM public.mapped_invoice_actuals mia
  INNER JOIN public.invoices i
    ON i.id = mia.invoice_id
   AND i.status = 'approved'
  GROUP BY mia.property_id, mia.fiscal_year, mia.budget_category
)
SELECT
  bl.property_id,
  bl.fiscal_year,
  bl.category AS budget_category,
  bl.budget_amount,
  coalesce(ia.actual_amount, 0) AS actual_amount,
  coalesce(ia.actual_amount, 0) - bl.budget_amount AS variance_amount,
  bl.budget_amount - coalesce(ia.actual_amount, 0) AS remaining_budget,
  CASE
    WHEN bl.budget_amount <= 0 THEN NULL
    ELSE round((coalesce(ia.actual_amount, 0) / bl.budget_amount) * 100, 1)
  END AS variance_percent,
  coalesce(ia.invoice_count, 0)::integer AS invoice_count,
  CASE
    WHEN bl.budget_amount <= 0 THEN 'green'
    WHEN coalesce(ia.actual_amount, 0) / bl.budget_amount < 0.8 THEN 'green'
    WHEN coalesce(ia.actual_amount, 0) / bl.budget_amount < 1.0 THEN 'yellow'
    ELSE 'red'
  END AS status
FROM public.agm_budget_lines bl
LEFT JOIN invoice_actuals ia
  ON ia.property_id = bl.property_id
 AND ia.fiscal_year = bl.fiscal_year
 AND ia.budget_category = bl.category
WHERE bl.budget_type = 'expense';

COMMENT ON VIEW public.budget_expense_variance IS
  'Expense budget vs approved mapped invoice actuals per AGM category.';

GRANT SELECT ON public.budget_expense_variance TO authenticated, service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
