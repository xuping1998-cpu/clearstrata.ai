/*
  20260611120000_budget_package_fiscal_year_rpc.sql
  Budget package + fiscal year + dashboard RPC
  Compatible version for mixed legacy schemas

  DEPRECATED: use property_id instead — Any ELSIF branch that checks column `strata_id`
  or builds indexes on (strata_id, fiscal_year) exists ONLY for legacy databases that
  predate property_id on invoices / annual_budgets / procurement_jobs. New environments
  must use property_id; do not add new strata_id-based logic here (phase 1 freeze).
*/

BEGIN;

-- ---------------------------------------------------------------------------
-- 0) Ensure each property has one compliance doc
--    - Only runs if compliance_docs.property_id exists
--    - Uses status='valid' to satisfy current compliance_docs_status_check
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_has_property_id boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'compliance_docs'
      AND column_name = 'property_id'
  )
  INTO v_has_property_id;

  IF v_has_property_id THEN
    EXECUTE $sql$
      INSERT INTO public.compliance_docs (
        title_en,
        title_zh,
        category,
        description_en,
        property_id,
        status
      )
      SELECT
        'Budget baseline (system)',
        'Budget baseline',
        'legal',
        'Placeholder document for budget linkage',
        p.id,
        'valid'
      FROM public.properties p
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.compliance_docs cd
        WHERE cd.property_id = p.id
      )
    $sql$;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 1) budget_package
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.budget_package (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  fiscal_year int NOT NULL,
  document_id uuid REFERENCES public.compliance_docs(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT budget_package_status_check
    CHECK (status IN ('draft', 'active', 'archived'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_budget_package_property_year
  ON public.budget_package(property_id, fiscal_year);

CREATE INDEX IF NOT EXISTS idx_budget_package_property_year
  ON public.budget_package(property_id, fiscal_year);

-- ---------------------------------------------------------------------------
-- 1.1) updated_at trigger
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'set_updated_at'
  ) THEN
    CREATE FUNCTION public.set_updated_at()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $fn$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $fn$;
  END IF;
END
$$;

DROP TRIGGER IF EXISTS trg_budget_package_updated_at ON public.budget_package;

CREATE TRIGGER trg_budget_package_updated_at
BEFORE UPDATE ON public.budget_package
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2) fiscal_year columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.procurement_jobs
  ADD COLUMN IF NOT EXISTS fiscal_year int;

UPDATE public.procurement_jobs
SET fiscal_year = EXTRACT(YEAR FROM created_at)::int
WHERE fiscal_year IS NULL
  AND created_at IS NOT NULL;

ALTER TABLE public.procurement_quotes
  ADD COLUMN IF NOT EXISTS fiscal_year int;

UPDATE public.procurement_quotes q
SET fiscal_year = j.fiscal_year
FROM public.procurement_jobs j
WHERE q.job_id = j.id
  AND q.fiscal_year IS NULL;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS fiscal_year int;

UPDATE public.invoices
SET fiscal_year = EXTRACT(YEAR FROM created_at)::int
WHERE fiscal_year IS NULL
  AND created_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2.1) indexes, fully compatible with mixed schemas
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  -- procurement_jobs
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'procurement_jobs'
      AND column_name = 'property_id'
  ) THEN
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_procurement_jobs_property_year
      ON public.procurement_jobs(property_id, fiscal_year)
    ';
  -- DEPRECATED: use property_id instead — legacy index branch only (strata phase 1 freeze).
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'procurement_jobs'
      AND column_name = 'strata_id'
  ) THEN
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_procurement_jobs_strata_year
      ON public.procurement_jobs(strata_id, fiscal_year)
    ';
  ELSE
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_procurement_jobs_year
      ON public.procurement_jobs(fiscal_year)
    ';
  END IF;

  -- procurement_quotes
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'procurement_quotes'
      AND column_name = 'fiscal_year'
  ) THEN
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_procurement_quotes_year
      ON public.procurement_quotes(fiscal_year)
    ';
  END IF;

  -- invoices
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invoices'
      AND column_name = 'property_id'
  ) THEN
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_invoices_property_year
      ON public.invoices(property_id, fiscal_year)
    ';
  -- DEPRECATED: use property_id instead — legacy index branch only.
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invoices'
      AND column_name = 'strata_id'
  ) THEN
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_invoices_strata_year
      ON public.invoices(strata_id, fiscal_year)
    ';
  ELSE
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_invoices_year
      ON public.invoices(fiscal_year)
    ';
  END IF;

  -- annual_budgets
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'annual_budgets'
      AND column_name = 'property_id'
  ) THEN
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_annual_budgets_property_year
      ON public.annual_budgets(property_id, fiscal_year)
    ';
  -- DEPRECATED: use property_id instead — legacy index branch only.
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'annual_budgets'
      AND column_name = 'strata_id'
  ) THEN
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_annual_budgets_strata_year
      ON public.annual_budgets(strata_id, fiscal_year)
    ';
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'annual_budgets'
      AND column_name = 'fiscal_year'
  ) THEN
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_annual_budgets_year
      ON public.annual_budgets(fiscal_year)
    ';
  END IF;
END
$$;
-- ---------------------------------------------------------------------------
-- 3) helper: active package
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.active_budget_package_id(uuid, int);

CREATE OR REPLACE FUNCTION public.active_budget_package_id(
  p_property_id uuid,
  p_year int
)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT id
  FROM public.budget_package
  WHERE property_id = p_property_id
    AND fiscal_year = p_year
    AND status = 'active'
  ORDER BY updated_at DESC, created_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.active_budget_package_id(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.active_budget_package_id(uuid, int) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4) dashboard summary
--    Dynamic + schema-compatible version
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.dashboard_budget_summary(uuid, int);

CREATE OR REPLACE FUNCTION public.dashboard_budget_summary(
  p_property_id uuid,
  p_year int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_budget numeric := 0;
  v_actual numeric := 0;
  v_sql text;
BEGIN
  IF p_property_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'bad_property',
      'message', 'property_id is required'
    );
  END IF;

  -- annual_budgets
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'annual_budgets'
      AND column_name = 'property_id'
  ) THEN
    v_sql := $q$
      SELECT COALESCE(SUM(amount), 0)
      FROM public.annual_budgets
      WHERE property_id = $1
        AND fiscal_year = $2
    $q$;
    EXECUTE v_sql INTO v_budget USING p_property_id, p_year;

  -- DEPRECATED: use property_id instead — RPC branch for legacy annual_budgets.strata_id only.
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'annual_budgets'
      AND column_name = 'strata_id'
  ) THEN
    v_sql := $q$
      SELECT COALESCE(SUM(amount), 0)
      FROM public.annual_budgets
      WHERE strata_id = $1
        AND fiscal_year = $2
    $q$;
    EXECUTE v_sql INTO v_budget USING p_property_id, p_year;

  ELSE
    v_sql := $q$
      SELECT COALESCE(SUM(amount), 0)
      FROM public.annual_budgets
      WHERE fiscal_year = $1
    $q$;
    EXECUTE v_sql INTO v_budget USING p_year;
  END IF;

  -- invoices
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invoices'
      AND column_name = 'property_id'
  ) THEN
    v_sql := $q$
      SELECT COALESCE(SUM(total_amount), 0)
      FROM public.invoices
      WHERE property_id = $1
        AND fiscal_year = $2
        AND status = 'approved'
    $q$;
    EXECUTE v_sql INTO v_actual USING p_property_id, p_year;

  -- DEPRECATED: use property_id instead — RPC branch for legacy invoices.strata_id only.
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invoices'
      AND column_name = 'strata_id'
  ) THEN
    v_sql := $q$
      SELECT COALESCE(SUM(total_amount), 0)
      FROM public.invoices
      WHERE strata_id = $1
        AND fiscal_year = $2
        AND status = 'approved'
    $q$;
    EXECUTE v_sql INTO v_actual USING p_property_id, p_year;

  ELSE
    v_sql := $q$
      SELECT COALESCE(SUM(total_amount), 0)
      FROM public.invoices
      WHERE fiscal_year = $1
        AND status = 'approved'
    $q$;
    EXECUTE v_sql INTO v_actual USING p_year;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'year', p_year,
    'property_id', p_property_id,
    'budget', v_budget,
    'actual', v_actual,
    'remaining', v_budget - v_actual,
    'usage_rate',
      CASE
        WHEN v_budget > 0 THEN ROUND((v_actual / v_budget) * 100, 2)
        ELSE 0
      END
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', SQLERRM,
      'message', 'Unexpected error in dashboard_budget_summary'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.dashboard_budget_summary(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dashboard_budget_summary(uuid, int) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;

