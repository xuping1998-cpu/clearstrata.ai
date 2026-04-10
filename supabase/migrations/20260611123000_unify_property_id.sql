/*
  20260611123000_unify_property_id.sql
  SAFE VERSION: add property_id without assuming legacy columns
*/

BEGIN;

-- -------------------------------------------------------
-- 0) procurement_jobs
-- -------------------------------------------------------
ALTER TABLE public.procurement_jobs
ADD COLUMN IF NOT EXISTS property_id uuid;

-- 不做回填（因为没有 strata_id）

CREATE INDEX IF NOT EXISTS idx_procurement_jobs_property
ON public.procurement_jobs(property_id);

-- -------------------------------------------------------
-- 1) invoices
-- -------------------------------------------------------
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS property_id uuid;

CREATE INDEX IF NOT EXISTS idx_invoices_property
ON public.invoices(property_id);

-- -------------------------------------------------------
-- 2) annual_budgets
-- -------------------------------------------------------
ALTER TABLE public.annual_budgets
ADD COLUMN IF NOT EXISTS property_id uuid;

CREATE INDEX IF NOT EXISTS idx_annual_budgets_property
ON public.annual_budgets(property_id);

-- -------------------------------------------------------
-- 3) procurement_quotes
-- -------------------------------------------------------
ALTER TABLE public.procurement_quotes
ADD COLUMN IF NOT EXISTS property_id uuid;

CREATE INDEX IF NOT EXISTS idx_procurement_quotes_property
ON public.procurement_quotes(property_id);

-- -------------------------------------------------------
-- 4) compliance_docs（确保存在）
-- -------------------------------------------------------
ALTER TABLE public.compliance_docs
ADD COLUMN IF NOT EXISTS property_id uuid;

CREATE INDEX IF NOT EXISTS idx_compliance_docs_property
ON public.compliance_docs(property_id);

-- -------------------------------------------------------
-- 5) 外键（仅当字段存在才加）
-- -------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'procurement_jobs_property_id_fkey'
  ) THEN
    ALTER TABLE public.procurement_jobs
    ADD CONSTRAINT procurement_jobs_property_id_fkey
    FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invoices_property_id_fkey'
  ) THEN
    ALTER TABLE public.invoices
    ADD CONSTRAINT invoices_property_id_fkey
    FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'annual_budgets_property_id_fkey'
  ) THEN
    ALTER TABLE public.annual_budgets
    ADD CONSTRAINT annual_budgets_property_id_fkey
    FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'procurement_quotes_property_id_fkey'
  ) THEN
    ALTER TABLE public.procurement_quotes
    ADD CONSTRAINT procurement_quotes_property_id_fkey
    FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
