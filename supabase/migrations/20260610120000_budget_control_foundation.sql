/*
  Multi-property budget control foundation.
  Includes:
  - budget_categories
  - annual_budgets
  - procurement_quotes / invoices extensions
  - RLS
  - dashboard RPCs
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- 1) budget_categories
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.budget_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  code text NOT NULL,
  name_en text NOT NULL,
  name_zh text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_budget_categories_property_code UNIQUE (property_id, code)
);

CREATE INDEX IF NOT EXISTS idx_budget_categories_property
  ON public.budget_categories(property_id);

COMMENT ON TABLE public.budget_categories IS 'Budget categories by property';

-- ---------------------------------------------------------------------------
-- 2) annual_budgets
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.annual_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  budget_category_id uuid NOT NULL REFERENCES public.budget_categories(id) ON DELETE CASCADE,
  fiscal_year int NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active')),
  legislation_ref text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_annual_budgets_line UNIQUE (property_id, fiscal_year, budget_category_id)
);

CREATE INDEX IF NOT EXISTS idx_annual_budgets_property_year
  ON public.annual_budgets(property_id, fiscal_year)
  WHERE status = 'active';

COMMENT ON TABLE public.annual_budgets IS 'Annual budget lines; status=active means approved and effective';

-- ---------------------------------------------------------------------------
-- 3) Extend procurement_quotes / invoices
-- ---------------------------------------------------------------------------
ALTER TABLE public.procurement_quotes
  ADD COLUMN IF NOT EXISTS budget_category_id uuid REFERENCES public.budget_categories(id) ON DELETE SET NULL;

ALTER TABLE public.procurement_quotes
  ADD COLUMN IF NOT EXISTS is_budget_exceeded boolean;

COMMENT ON COLUMN public.procurement_quotes.is_budget_exceeded IS 'Whether the selected quote exceeds budget';

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS budget_category_id uuid REFERENCES public.budget_categories(id) ON DELETE SET NULL;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS budget_anomaly_flag text;

COMMENT ON COLUMN public.invoices.budget_anomaly_flag IS 'Reserved anomaly flag for invoice rules or AI';

CREATE INDEX IF NOT EXISTS idx_invoices_budget_category
  ON public.invoices(budget_category_id);

CREATE INDEX IF NOT EXISTS idx_procurement_quotes_budget_cat
  ON public.procurement_quotes(budget_category_id);

-- ---------------------------------------------------------------------------
-- 4) Seed default categories for each property
-- ---------------------------------------------------------------------------
INSERT INTO public.budget_categories (property_id, code, name_en, name_zh, sort_order)
SELECT p.id, v.code, v.name_en, v.name_zh, v.sort_order
FROM public.properties p
CROSS JOIN (
  VALUES
    ('general', 'General', '一般', 0),
    ('maintenance', 'Maintenance', '维修', 1),
    ('utilities', 'Utilities', '水电气', 2),
    ('insurance', 'Insurance', '保险', 3),
    ('professional_services', 'Professional services', '专业服务', 4),
    ('cleaning', 'Cleaning', '清洁', 5),
    ('landscaping', 'Landscaping', '绿化', 6),
    ('security', 'Security', '安保', 7),
    ('elevator', 'Elevator', '电梯', 8),
    ('plumbing', 'Plumbing', '管道', 9),
    ('electrical', 'Electrical', '电气', 10)
) AS v(code, name_en, name_zh, sort_order)
ON CONFLICT (property_id, code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5) RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annual_budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "budget_categories_select_member" ON public.budget_categories;
CREATE POLICY "budget_categories_select_member"
  ON public.budget_categories
  FOR SELECT
  TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()));

DROP POLICY IF EXISTS "budget_categories_staff_write" ON public.budget_categories;
CREATE POLICY "budget_categories_staff_write"
  ON public.budget_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (property_id IN (SELECT public.user_property_staff_ids()));

DROP POLICY IF EXISTS "budget_categories_staff_update" ON public.budget_categories;
CREATE POLICY "budget_categories_staff_update"
  ON public.budget_categories
  FOR UPDATE
  TO authenticated
  USING (property_id IN (SELECT public.user_property_staff_ids()))
  WITH CHECK (property_id IN (SELECT public.user_property_staff_ids()));

DROP POLICY IF EXISTS "annual_budgets_select_member" ON public.annual_budgets;
CREATE POLICY "annual_budgets_select_member"
  ON public.annual_budgets
  FOR SELECT
  TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()));

DROP POLICY IF EXISTS "annual_budgets_staff_write" ON public.annual_budgets;
CREATE POLICY "annual_budgets_staff_write"
  ON public.annual_budgets
  FOR INSERT
  TO authenticated
  WITH CHECK (property_id IN (SELECT public.user_property_staff_ids()));

DROP POLICY IF EXISTS "annual_budgets_staff_update" ON public.annual_budgets;
CREATE POLICY "annual_budgets_staff_update"
  ON public.annual_budgets
  FOR UPDATE
  TO authenticated
  USING (property_id IN (SELECT public.user_property_staff_ids()))
  WITH CHECK (property_id IN (SELECT public.user_property_staff_ids()));

DROP POLICY IF EXISTS "annual_budgets_staff_delete" ON public.annual_budgets;
CREATE POLICY "annual_budgets_staff_delete"
  ON public.annual_budgets
  FOR DELETE
  TO authenticated
  USING (property_id IN (SELECT public.user_property_staff_ids()));

-- ---------------------------------------------------------------------------
-- 6) Helper: resolve invoice property id
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_invoice_property_id(p_inv public.invoices)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT mt.property_id
  FROM public.manager_tasks mt
  WHERE mt.id = (p_inv).related_task_id
  LIMIT 1;
$$;
-- ---------------------------------------------------------------------------
-- 7) Helper: resolve invoice budget category id
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_invoice_budget_category_id(p_inv public.invoices)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (p_inv).budget_category_id,
    (
      SELECT bc.id
      FROM public.budget_categories bc
      WHERE bc.property_id = public.resolve_invoice_property_id(p_inv)
        AND bc.code = COALESCE(NULLIF(trim((p_inv).category), ''), 'general')
      LIMIT 1
    )
  );
$$;

COMMENT ON FUNCTION public.resolve_invoice_budget_category_id(public.invoices)
IS 'Resolve invoice budget category id';

-- ---------------------------------------------------------------------------
-- 8) Dashboard RPCs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dashboard_budget_summary(p_property_id uuid, p_year int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ts_start timestamptz;
  ts_end timestamptz;
  v_budget numeric;
  v_committed numeric;
  v_actual numeric;
BEGIN
  IF NOT (p_property_id IN (SELECT public.user_property_ids())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  ts_start := make_timestamptz(p_year, 1, 1, 0, 0, 0);
  ts_end := make_timestamptz(p_year, 12, 31, 23, 59, 59);

  SELECT COALESCE(SUM(ab.amount), 0)
  INTO v_budget
  FROM public.annual_budgets ab
  WHERE ab.property_id = p_property_id
    AND ab.fiscal_year = p_year
    AND ab.status = 'active';

  SELECT COALESCE(SUM(pq.quoted_amount), 0)
  INTO v_committed
  FROM public.procurement_jobs j
  INNER JOIN public.procurement_quotes pq
    ON pq.id = j.selected_quote_id
  WHERE j.property_id = p_property_id
    AND j.selected_quote_id IS NOT NULL
    AND j.created_at >= ts_start
    AND j.created_at <= ts_end;

  SELECT COALESCE(SUM(i.total_amount), 0)
  INTO v_actual
  FROM public.invoices i
  WHERE public.resolve_invoice_property_id(i) = p_property_id
    AND i.status IN ('approved', 'paid')
    AND i.created_at >= ts_start
    AND i.created_at <= ts_end;

  RETURN jsonb_build_object(
    'fiscal_year', p_year,
    'property_id', p_property_id,
    'total_budget', v_budget,
    'committed', v_committed,
    'actual', v_actual,
    'budget_utilization', CASE WHEN v_budget > 0 THEN round((v_actual / v_budget)::numeric, 4) ELSE 0 END,
    'committed_utilization', CASE WHEN v_budget > 0 THEN round((v_committed / v_budget)::numeric, 4) ELSE 0 END,
    'remaining_budget', v_budget - v_actual
  );
END;
$$;

REVOKE ALL ON FUNCTION public.dashboard_budget_summary(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dashboard_budget_summary(uuid, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.dashboard_budget_categories(p_property_id uuid, p_year int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ts_start timestamptz;
  ts_end timestamptz;
BEGIN
  IF NOT (p_property_id IN (SELECT public.user_property_ids())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  ts_start := make_timestamptz(p_year, 1, 1, 0, 0, 0);
  ts_end := make_timestamptz(p_year, 12, 31, 23, 59, 59);

  RETURN (
    WITH cats AS (
      SELECT bc.id, bc.code, bc.name_en, bc.name_zh, bc.sort_order
      FROM public.budget_categories bc
      WHERE bc.property_id = p_property_id
        AND bc.is_active = true
    ),
    bud AS (
      SELECT ab.budget_category_id, COALESCE(SUM(ab.amount), 0) AS amt
      FROM public.annual_budgets ab
      WHERE ab.property_id = p_property_id
        AND ab.fiscal_year = p_year
        AND ab.status = 'active'
      GROUP BY ab.budget_category_id
    ),
    comm AS (
      SELECT
        COALESCE(
          pq.budget_category_id,
          (
            SELECT bc2.id
            FROM public.budget_categories bc2
            WHERE bc2.property_id = j.property_id
              AND bc2.code = COALESCE(NULLIF(trim(j.category), ''), 'general')
            LIMIT 1
          )
        ) AS cat_id,
        SUM(pq.quoted_amount) AS amt
      FROM public.procurement_jobs j
      INNER JOIN public.procurement_quotes pq
        ON pq.id = j.selected_quote_id
      WHERE j.property_id = p_property_id
        AND j.selected_quote_id IS NOT NULL
        AND j.created_at >= ts_start
        AND j.created_at <= ts_end
      GROUP BY 1
    ),
    act AS (
      SELECT x.cat_id, SUM(x.amt) AS amt
      FROM (
        SELECT
          public.resolve_invoice_budget_category_id(i) AS cat_id,
          i.total_amount AS amt
        FROM public.invoices i
        WHERE public.resolve_invoice_property_id(i) = p_property_id
          AND i.status IN ('approved', 'paid')
          AND i.created_at >= ts_start
          AND i.created_at <= ts_end
      ) x
      GROUP BY x.cat_id
    )
    SELECT jsonb_build_object(
      'fiscal_year', p_year,
      'categories',
      COALESCE(
        (
          SELECT jsonb_agg(row_json ORDER BY sort_order, code)
          FROM (
            SELECT
              jsonb_build_object(
                'category_id', c.id,
                'code', c.code,
                'name_en', c.name_en,
                'name_zh', c.name_zh,
                'budget', COALESCE(b.amt, 0),
                'committed', COALESCE(cm.amt, 0),
                'actual', COALESCE(a.amt, 0),
                'remaining', COALESCE(b.amt, 0) - COALESCE(a.amt, 0),
                'over_budget', COALESCE(a.amt, 0) > COALESCE(b.amt, 0)
              ) AS row_json,
              c.sort_order,
              c.code
            FROM cats c
            LEFT JOIN bud b ON b.budget_category_id = c.id
            LEFT JOIN comm cm ON cm.cat_id = c.id
            LEFT JOIN act a ON a.cat_id = c.id
          ) sub
        ),
        '[]'::jsonb
      )
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.dashboard_budget_categories(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dashboard_budget_categories(uuid, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.dashboard_budget_trend(p_property_id uuid, p_year int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r jsonb;
BEGIN
  IF NOT (p_property_id IN (SELECT public.user_property_ids())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  WITH act AS (
    SELECT EXTRACT(MONTH FROM i.created_at)::int AS mo,
           SUM(i.total_amount) AS amt
    FROM public.invoices i
    WHERE public.resolve_invoice_property_id(i) = p_property_id
      AND i.status IN ('approved', 'paid')
      AND EXTRACT(YEAR FROM i.created_at) = p_year
    GROUP BY 1
  ),
  comm AS (
    SELECT EXTRACT(MONTH FROM j.created_at)::int AS mo,
           SUM(pq.quoted_amount) AS amt
    FROM public.procurement_jobs j
    INNER JOIN public.procurement_quotes pq
      ON pq.id = j.selected_quote_id
    WHERE j.property_id = p_property_id
      AND j.selected_quote_id IS NOT NULL
      AND EXTRACT(YEAR FROM j.created_at) = p_year
    GROUP BY 1
  )
  SELECT jsonb_build_object(
    'fiscal_year', p_year,
    'months',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'month', mo.m,
            'actual', COALESCE(a.amt, 0),
            'committed', COALESCE(c.amt, 0)
          )
          ORDER BY mo.m
        )
        FROM generate_series(1, 12) AS mo(m)
        LEFT JOIN act a ON a.mo = mo.m
        LEFT JOIN comm c ON c.mo = mo.m
      ),
      '[]'::jsonb
    )
  )
  INTO r;

  RETURN r;
END;
$$;

REVOKE ALL ON FUNCTION public.dashboard_budget_trend(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dashboard_budget_trend(uuid, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.dashboard_budget_alerts(p_property_id uuid, p_year int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ts_start timestamptz;
  ts_end timestamptz;
BEGIN
  IF NOT (p_property_id IN (SELECT public.user_property_ids())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  ts_start := make_timestamptz(p_year, 1, 1, 0, 0, 0);
  ts_end := make_timestamptz(p_year, 12, 31, 23, 59, 59);

  RETURN (
    WITH cats AS (
      SELECT bc.id, bc.code, bc.name_en, bc.name_zh
      FROM public.budget_categories bc
      WHERE bc.property_id = p_property_id
        AND bc.is_active = true
    ),
    bud AS (
      SELECT ab.budget_category_id, COALESCE(SUM(ab.amount), 0) AS amt
      FROM public.annual_budgets ab
      WHERE ab.property_id = p_property_id
        AND ab.fiscal_year = p_year
        AND ab.status = 'active'
      GROUP BY ab.budget_category_id
    ),
    act AS (
      SELECT x.cat_id, SUM(x.amt) AS amt
      FROM (
        SELECT public.resolve_invoice_budget_category_id(i) AS cat_id,
               i.total_amount AS amt
        FROM public.invoices i
        WHERE public.resolve_invoice_property_id(i) = p_property_id
          AND i.status IN ('approved', 'paid')
          AND i.created_at >= ts_start
          AND i.created_at <= ts_end
      ) x
      GROUP BY x.cat_id
    ),
    over_cat AS (
      SELECT jsonb_build_object(
        'type', 'category_over_actual',
        'severity', 'high',
        'code', c.code,
        'title_en', 'Over budget (actual)',
        'title_zh', '科目超支',
        'message_en', c.name_en || ' actual exceeds budget',
        'message_zh', COALESCE(c.name_zh, c.name_en) || ' 实际支出已超过预算',
        'link_hint', '/finance?tab=invoices'
      ) AS alert
      FROM cats c
      INNER JOIN bud b ON b.budget_category_id = c.id
      LEFT JOIN act a ON a.cat_id = c.id
      WHERE COALESCE(a.amt, 0) > b.amt
    ),
    bad_quotes AS (
      SELECT jsonb_build_object(
        'type', 'quote_budget_exceeded',
        'severity', 'medium',
        'quote_id', pq.id,
        'title_en', 'Quote flagged over budget',
        'title_zh', '报价超预算',
        'message_en', COALESCE(pq.vendor_name, 'Quote'),
        'message_zh', COALESCE(pq.vendor_name, '报价'),
        'link_hint', '/procurement'
      ) AS alert
      FROM public.procurement_quotes pq
      INNER JOIN public.procurement_jobs j
        ON j.id = pq.job_id
      WHERE j.property_id = p_property_id
        AND pq.is_budget_exceeded = true
        AND j.created_at >= ts_start
        AND j.created_at <= ts_end
      LIMIT 20
    ),
    anomalies AS (
      SELECT jsonb_build_object(
        'type', 'invoice_anomaly_flag',
        'severity', 'low',
        'title_en', 'Invoice anomaly flag',
        'title_zh', '发票异常标记',
        'message_en', 'Invoice flagged',
        'message_zh', '发票已标记异常',
        'link_hint', '/finance?tab=invoices'
      ) AS alert
      FROM public.invoices i
      WHERE public.resolve_invoice_property_id(i) = p_property_id
        AND (
          COALESCE(i.has_anomalies, false) = true
          OR COALESCE(i.is_over_budget, false) = true
        )
        AND i.created_at >= ts_start
        AND i.created_at <= ts_end
      LIMIT 20
    )
    SELECT jsonb_build_object(
      'fiscal_year', p_year,
      'alerts',
      COALESCE(
        (
          SELECT jsonb_agg(x.alert)
          FROM (
            SELECT alert FROM over_cat
            UNION ALL
            SELECT alert FROM bad_quotes
            UNION ALL
            SELECT alert FROM anomalies
          ) x
        ),
        '[]'::jsonb
      )
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.dashboard_budget_alerts(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dashboard_budget_alerts(uuid, int) TO authenticated;

-- ---------------------------------------------------------------------------
-- 9) PostgREST schema reload
-- ---------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

