/*
  # AGM budget lines — revenue / expense type (Phase AGM-1B)
*/

BEGIN;

ALTER TABLE public.agm_budget_lines
  ADD COLUMN IF NOT EXISTS budget_type text NOT NULL DEFAULT 'expense'
    CHECK (budget_type IN ('revenue', 'expense'));

COMMENT ON COLUMN public.agm_budget_lines.budget_type IS
  'revenue = income lines (Strata Fees, etc.); expense = operating cost lines.';

CREATE INDEX IF NOT EXISTS idx_agm_budget_lines_type
  ON public.agm_budget_lines(property_id, fiscal_year, budget_type);

COMMIT;

NOTIFY pgrst, 'reload schema';
