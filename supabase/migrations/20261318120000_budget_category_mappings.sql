/*
  # Budget category mappings — table, views, suggestion RPC (Phase P2B-4A)
*/

BEGIN;

-- ---------------------------------------------------------------------------
-- budget_category_mappings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.budget_category_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  fiscal_year integer NOT NULL,
  budget_line_id uuid REFERENCES public.agm_budget_lines(id) ON DELETE CASCADE,
  budget_category text NOT NULL,
  budget_type text NOT NULL CHECK (budget_type IN ('revenue', 'expense')),
  source_type text NOT NULL CHECK (source_type IN (
    'invoice_vendor',
    'invoice_category',
    'bank_description',
    'bank_source',
    'procurement_vendor',
    'manual'
  )),
  match_pattern text NOT NULL,
  match_mode text NOT NULL DEFAULT 'icontains'
    CHECK (match_mode IN ('icontains', 'exact', 'regex')),
  confidence numeric(5, 2) NOT NULL DEFAULT 1.00,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_budget_category_mappings_dedupe
    UNIQUE (property_id, fiscal_year, budget_category, source_type, match_pattern)
);

CREATE INDEX IF NOT EXISTS idx_budget_category_mappings_property_year
  ON public.budget_category_mappings(property_id, fiscal_year);

CREATE INDEX IF NOT EXISTS idx_budget_category_mappings_line
  ON public.budget_category_mappings(budget_line_id);

CREATE INDEX IF NOT EXISTS idx_budget_category_mappings_source
  ON public.budget_category_mappings(source_type);

CREATE INDEX IF NOT EXISTS idx_budget_category_mappings_active
  ON public.budget_category_mappings(property_id, fiscal_year, is_active)
  WHERE is_active = true;

COMMENT ON TABLE public.budget_category_mappings IS
  'Maps invoice/bank/procurement text to AGM budget categories for variance and reconciliation.';

-- updated_at trigger
DO $trg$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'set_updated_at'
  ) THEN
    CREATE FUNCTION public.set_updated_at()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $fn$
    BEGIN
      NEW.updated_at := now();
      RETURN NEW;
    END;
    $fn$;
  END IF;
END $trg$;

DROP TRIGGER IF EXISTS trg_budget_category_mappings_updated_at ON public.budget_category_mappings;
CREATE TRIGGER trg_budget_category_mappings_updated_at
  BEFORE UPDATE ON public.budget_category_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.budget_category_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bcm_select_tenant" ON public.budget_category_mappings;
DROP POLICY IF EXISTS "bcm_insert_council" ON public.budget_category_mappings;
DROP POLICY IF EXISTS "bcm_update_council" ON public.budget_category_mappings;
DROP POLICY IF EXISTS "bcm_delete_council" ON public.budget_category_mappings;

CREATE POLICY "bcm_select_tenant"
  ON public.budget_category_mappings FOR SELECT TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "bcm_insert_council"
  ON public.budget_category_mappings FOR INSERT TO authenticated
  WITH CHECK (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = budget_category_mappings.property_id
        AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'property_admin')
    )
  );

CREATE POLICY "bcm_update_council"
  ON public.budget_category_mappings FOR UPDATE TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = budget_category_mappings.property_id
        AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'property_admin')
    )
  )
  WITH CHECK (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = budget_category_mappings.property_id
        AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'property_admin')
    )
  );

CREATE POLICY "bcm_delete_council"
  ON public.budget_category_mappings FOR DELETE TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = budget_category_mappings.property_id
        AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'property_admin')
    )
  );

-- ---------------------------------------------------------------------------
-- Match helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._budget_mapping_mode_rank(p_mode text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(trim(coalesce(p_mode, '')))
    WHEN 'exact' THEN 3
    WHEN 'regex' THEN 2
    WHEN 'icontains' THEN 1
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public._budget_mapping_field_matches(
  p_mode text,
  p_pattern text,
  p_value text
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_mode text := lower(trim(coalesce(p_mode, 'icontains')));
  v_pat text := coalesce(p_pattern, '');
  v_val text := coalesce(p_value, '');
BEGIN
  IF v_pat = '' THEN
    RETURN false;
  END IF;
  IF v_mode = 'exact' THEN
    RETURN upper(v_val) = upper(v_pat);
  ELSIF v_mode = 'regex' THEN
    RETURN v_val ~* v_pat;
  ELSE
    RETURN upper(v_val) LIKE '%' || upper(v_pat) || '%';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- mapped_invoice_actuals
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.mapped_invoice_actuals AS
WITH candidates AS (
  SELECT
    i.id AS invoice_id,
    i.property_id,
    coalesce(i.accounting_year, i.fiscal_year) AS fiscal_year,
    i.vendor_name,
    i.invoice_date,
    i.total_amount,
    m.budget_category,
    m.budget_type,
    m.id AS mapping_id,
    m.match_pattern,
    m.confidence AS match_confidence,
    public._budget_mapping_mode_rank(m.match_mode) AS mode_rank
  FROM public.invoices i
  INNER JOIN public.budget_category_mappings m
    ON m.property_id = i.property_id
   AND m.fiscal_year = coalesce(i.accounting_year, i.fiscal_year)
   AND m.budget_type = 'expense'
   AND m.is_active = true
   AND m.source_type IN ('invoice_vendor', 'invoice_category')
  WHERE
    (
      m.source_type = 'invoice_vendor'
      AND public._budget_mapping_field_matches(m.match_mode, m.match_pattern, i.vendor_name)
    )
    OR (
      m.source_type = 'invoice_category'
      AND public._budget_mapping_field_matches(m.match_mode, m.match_pattern, i.category::text)
    )
),
ranked AS (
  SELECT
    c.*,
    row_number() OVER (
      PARTITION BY c.invoice_id
      ORDER BY c.mode_rank DESC, c.match_confidence DESC, c.mapping_id
    ) AS rn
  FROM candidates c
)
SELECT
  invoice_id,
  property_id,
  fiscal_year,
  vendor_name,
  invoice_date,
  total_amount,
  budget_category,
  budget_type,
  mapping_id,
  match_pattern,
  match_confidence
FROM ranked
WHERE rn = 1;

COMMENT ON VIEW public.mapped_invoice_actuals IS
  'Approved-expense invoices mapped to AGM budget categories via active mapping rules.';

-- ---------------------------------------------------------------------------
-- mapped_bank_transactions
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.mapped_bank_transactions AS
WITH candidates AS (
  SELECT
    bt.id AS bank_transaction_id,
    bt.property_id,
    extract(year FROM bt.transaction_date)::integer AS fiscal_year,
    bt.transaction_date,
    bt.description,
    bt.amount,
    m.budget_category,
    m.budget_type,
    m.id AS mapping_id,
    m.match_pattern,
    m.confidence AS match_confidence,
    public._budget_mapping_mode_rank(m.match_mode) AS mode_rank
  FROM public.bank_transactions bt
  INNER JOIN public.budget_category_mappings m
    ON m.property_id = bt.property_id
   AND m.fiscal_year = extract(year FROM bt.transaction_date)::integer
   AND m.is_active = true
   AND m.source_type IN ('bank_description', 'bank_source')
   AND (
     (bt.amount > 0 AND m.budget_type = 'revenue')
     OR (bt.amount < 0 AND m.budget_type = 'expense')
   )
  WHERE
    (
      m.source_type = 'bank_description'
      AND public._budget_mapping_field_matches(m.match_mode, m.match_pattern, bt.description)
    )
    OR (
      m.source_type = 'bank_source'
      AND public._budget_mapping_field_matches(m.match_mode, m.match_pattern, bt.source_bank)
    )
),
ranked AS (
  SELECT
    c.*,
    row_number() OVER (
      PARTITION BY c.bank_transaction_id
      ORDER BY c.mode_rank DESC, c.match_confidence DESC, c.mapping_id
    ) AS rn
  FROM candidates c
)
SELECT
  bank_transaction_id,
  property_id,
  fiscal_year,
  transaction_date,
  description,
  amount,
  budget_category,
  budget_type,
  mapping_id,
  match_pattern,
  match_confidence
FROM ranked
WHERE rn = 1;

COMMENT ON VIEW public.mapped_bank_transactions IS
  'Bank transactions mapped to AGM categories; revenue from credits, expense for payment confirmation only.';

GRANT SELECT ON public.mapped_invoice_actuals TO authenticated, service_role;
GRANT SELECT ON public.mapped_bank_transactions TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- generate_budget_category_mapping_suggestions
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_budget_category_mapping_suggestions(
  p_property_id uuid,
  p_fiscal_year integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted integer := 0;
BEGIN
  IF p_property_id IS NULL OR p_fiscal_year IS NULL THEN
    RETURN 0;
  END IF;

  IF NOT (p_property_id IN (SELECT public.user_property_ids())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.property_members pm
    WHERE pm.user_id = (SELECT auth.uid())
      AND pm.property_id = p_property_id
      AND pm.status = 'active'
      AND pm.role IN ('council', 'admin', 'property_admin')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  WITH seeds AS (
    SELECT * FROM (VALUES
      -- Revenue
      ('%strata%fee%', 'revenue', 'bank_description', 'PREAUTHORIZED CREDIT (DWELL PROPERTY MGMT)'),
      ('%strata%fee%', 'revenue', 'bank_description', 'DWELL PROPERTY MGMT'),
      ('%strata%fee%', 'revenue', 'bank_description', 'STRATA FEE'),
      ('%strata%fee%', 'revenue', 'bank_description', 'DD TRANSFER'),
      ('%ev%charg%', 'revenue', 'bank_description', 'EV'),
      ('%ev%charg%', 'revenue', 'bank_description', 'CHARGING'),
      ('%key%', 'revenue', 'bank_description', 'KEY'),
      ('%key%', 'revenue', 'bank_description', 'FOB'),
      ('%fob%', 'revenue', 'bank_description', 'FOB'),
      ('%key%fob%', 'revenue', 'bank_description', 'ACCESS CARD'),
      ('%access%card%', 'revenue', 'bank_description', 'ACCESS CARD'),
      ('%move%in%out%', 'revenue', 'bank_description', 'MOVE IN'),
      ('%move%in%out%', 'revenue', 'bank_description', 'MOVE OUT'),
      ('%interest%income%', 'revenue', 'bank_description', 'INTEREST CREDITED'),
      ('%interest%income%', 'revenue', 'bank_description', 'CREDIT INTEREST'),
      -- Expense
      ('%natural%gas%', 'expense', 'invoice_vendor', 'FORTISBC'),
      ('%natural%gas%', 'expense', 'invoice_vendor', 'NATURAL GAS'),
      ('%natural%gas%', 'expense', 'bank_description', 'FORTISBC'),
      ('%electric%', 'expense', 'invoice_vendor', 'BC HYDRO'),
      ('%electric%', 'expense', 'invoice_vendor', 'HYDRO'),
      ('%electric%', 'expense', 'bank_description', 'B.C. HYDRO'),
      ('%electric%', 'expense', 'bank_description', 'BC HYDRO'),
      ('%telephone%', 'expense', 'invoice_vendor', 'TELUS'),
      ('%elevator%', 'expense', 'invoice_vendor', 'RICHMOND ELEVATOR'),
      ('%elevator%', 'expense', 'invoice_vendor', 'ELEVATOR'),
      ('%property%management%', 'expense', 'invoice_vendor', 'DWELL PROPERTY MANAGEMENT'),
      ('%property%management%', 'expense', 'invoice_vendor', 'DWELL'),
      ('%insurance%', 'expense', 'invoice_vendor', 'ACERA'),
      ('%insurance%', 'expense', 'invoice_vendor', 'HUB'),
      ('%insurance%', 'expense', 'invoice_vendor', 'INSURANCE'),
      ('%garbage%', 'expense', 'invoice_vendor', 'WASTE'),
      ('%garbage%', 'expense', 'invoice_vendor', 'GARBAGE'),
      ('%garbage%', 'expense', 'invoice_vendor', 'HARRODS HAULING'),
      ('%recycl%', 'expense', 'invoice_vendor', 'WASTE'),
      ('%recycl%', 'expense', 'invoice_vendor', 'HAULING'),
      ('%janitorial%', 'expense', 'invoice_vendor', 'AIVAC'),
      ('%janitorial%', 'expense', 'invoice_vendor', 'JANITORIAL'),
      ('%janitorial%', 'expense', 'invoice_vendor', 'CLEANING'),
      ('%alarm%', 'expense', 'invoice_vendor', 'D & L SECURITY'),
      ('%alarm%', 'expense', 'invoice_vendor', 'SECURITY'),
      ('%alarm%', 'expense', 'invoice_vendor', 'ALARM'),
      ('%fire%alarm%', 'expense', 'invoice_vendor', 'D & L SECURITY'),
      ('%fire%alarm%', 'expense', 'invoice_vendor', 'ALARM'),
      ('%repair%maintenance%', 'expense', 'invoice_category', 'repair'),
      ('%repair%maintenance%', 'expense', 'invoice_category', 'maintenance'),
      ('%repair%maintenance%', 'expense', 'invoice_vendor', 'REPAIR'),
      ('%repair%maintenance%', 'expense', 'invoice_vendor', 'MAINTENANCE'),
      ('%general%repair%', 'expense', 'invoice_category', 'repair'),
      ('%general%repair%', 'expense', 'invoice_category', 'maintenance'),
      ('%general%repair%', 'expense', 'invoice_vendor', 'REPAIR'),
      ('%general%repair%', 'expense', 'invoice_vendor', 'MAINTENANCE'),
      ('%snow%', 'expense', 'invoice_vendor', 'SNOW'),
      ('%landscap%', 'expense', 'invoice_vendor', 'LANDSCAPING'),
      ('%landscap%', 'expense', 'invoice_vendor', 'GOOD EARTH'),
      ('%legal%', 'expense', 'invoice_vendor', 'LEGAL'),
      ('%legal%', 'expense', 'invoice_vendor', 'LAW'),
      ('%accounting%', 'expense', 'invoice_vendor', 'ACCOUNTING'),
      ('%accounting%', 'expense', 'invoice_vendor', 'CPA'),
      ('%bank%charge%', 'expense', 'bank_description', 'BANK CHARGE'),
      ('%bank%charge%', 'expense', 'bank_description', 'SERVICE CHARGE'),
      ('%contingency%', 'expense', 'bank_description', 'CRF'),
      ('%contingency%', 'expense', 'bank_description', 'CONTINGENCY'),
      ('%contingency%', 'expense', 'bank_description', 'RESERVE FUND'),
      ('%reserve%fund%', 'expense', 'bank_description', 'CRF'),
      ('%reserve%fund%', 'expense', 'bank_description', 'RESERVE FUND')
    ) AS t(line_match, budget_type, source_type, match_pattern)
  ),
  matched AS (
    SELECT DISTINCT
      abl.id AS budget_line_id,
      abl.category AS budget_category,
      abl.budget_type,
      s.source_type,
      s.match_pattern
    FROM public.agm_budget_lines abl
    INNER JOIN seeds s
      ON abl.budget_type = s.budget_type
     AND abl.category ILIKE s.line_match
    WHERE abl.property_id = p_property_id
      AND abl.fiscal_year = p_fiscal_year
  ),
  ins AS (
    INSERT INTO public.budget_category_mappings (
      property_id,
      fiscal_year,
      budget_line_id,
      budget_category,
      budget_type,
      source_type,
      match_pattern,
      match_mode,
      confidence,
      is_active,
      created_by
    )
    SELECT
      p_property_id,
      p_fiscal_year,
      m.budget_line_id,
      m.budget_category,
      m.budget_type,
      m.source_type,
      m.match_pattern,
      'icontains',
      1.00,
      true,
      (SELECT auth.uid())
    FROM matched m
    ON CONFLICT (property_id, fiscal_year, budget_category, source_type, match_pattern)
    DO NOTHING
    RETURNING id
  )
  SELECT count(*)::integer INTO v_inserted FROM ins;

  RETURN coalesce(v_inserted, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.generate_budget_category_mapping_suggestions(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_budget_category_mapping_suggestions(uuid, integer)
  TO authenticated, service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
