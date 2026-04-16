/*
  Dashboard budget RPCs: do not depend on annual_budgets.package_id.
  Aggregate by property_id + fiscal_year (+ budget_category_id where needed).
  Compatible with schemas that only have property_id on annual_budgets.
*/

-- ---------------------------------------------------------------------------
-- dashboard_budget_summary
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dashboard_budget_summary(p_property_id uuid, p_year int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_budget numeric := 0;
  v_committed numeric := 0;
  v_actual numeric := 0;
BEGIN
  IF p_property_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'bad_property',
      'message', 'property_id is required'
    );
  END IF;

  IF NOT (p_property_id IN (SELECT public.user_property_ids())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT COALESCE(SUM(ab.amount), 0)
  INTO v_budget
  FROM public.annual_budgets ab
  WHERE ab.property_id = p_property_id
    AND ab.fiscal_year = p_year;

  SELECT COALESCE(SUM(pq.quoted_amount), 0)
  INTO v_committed
  FROM public.procurement_jobs j
  INNER JOIN public.procurement_quotes pq ON pq.id = j.selected_quote_id
  WHERE j.property_id = p_property_id
    AND j.fiscal_year = p_year
    AND j.selected_quote_id IS NOT NULL;

  SELECT COALESCE(SUM(i.total_amount), 0)
  INTO v_actual
  FROM public.invoices i
  WHERE i.property_id = p_property_id
    AND i.fiscal_year = p_year
    AND i.status = 'approved';

  RETURN jsonb_build_object(
    'ok', true,
    'budget_scope', 'property_year',
    'fiscal_year', p_year,
    'property_id', p_property_id,
    'active_package_id', NULL::uuid,
    'total_budget', v_budget,
    'committed', v_committed,
    'actual', v_actual,
    'budget_utilization', CASE WHEN v_budget > 0 THEN round((v_actual / v_budget)::numeric, 4) ELSE 0 END,
    'committed_utilization', CASE WHEN v_budget > 0 THEN round((v_committed / v_budget)::numeric, 4) ELSE 0 END,
    'remaining_budget', GREATEST(v_budget - v_actual, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.dashboard_budget_summary(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dashboard_budget_summary(uuid, int) TO authenticated, service_role;

COMMENT ON FUNCTION public.dashboard_budget_summary(uuid, int) IS
  'Dashboard: totals from annual_budgets by property_id + fiscal_year; committed from selected quotes; actual from approved invoices.';

-- ---------------------------------------------------------------------------
-- dashboard_budget_categories
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dashboard_budget_categories(p_property_id uuid, p_year int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (p_property_id IN (SELECT public.user_property_ids())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

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
      GROUP BY ab.budget_category_id
    ),
    comm AS (
      SELECT
        public.resolve_quote_budget_category_id(pq.id) AS cat_id,
        SUM(pq.quoted_amount) AS amt
      FROM public.procurement_jobs j
      INNER JOIN public.procurement_quotes pq ON pq.id = j.selected_quote_id
      WHERE j.property_id = p_property_id
        AND j.fiscal_year = p_year
        AND j.selected_quote_id IS NOT NULL
      GROUP BY 1
    ),
    act AS (
      SELECT x.cat_id, SUM(x.amt) AS amt
      FROM (
        SELECT public.resolve_invoice_budget_category_id(i) AS cat_id,
               i.total_amount AS amt
        FROM public.invoices i
        WHERE i.property_id = p_property_id
          AND i.fiscal_year = p_year
          AND i.status = 'approved'
      ) x
      GROUP BY x.cat_id
    )
    SELECT jsonb_build_object(
      'fiscal_year', p_year,
      'active_package_id', NULL::uuid,
      'categories', COALESCE(
        (
          SELECT jsonb_agg(row_json ORDER BY sort_order, code)
          FROM (
            SELECT jsonb_build_object(
              'category_id', c.id,
              'code', c.code,
              'name_en', c.name_en,
              'name_zh', c.name_zh,
              'budget', COALESCE(b.amt, 0),
              'committed', COALESCE(cm.amt, 0),
              'actual', COALESCE(a.amt, 0),
              'remaining', GREATEST(COALESCE(b.amt, 0) - COALESCE(a.amt, 0), 0),
              'over_budget',
                COALESCE(a.amt, 0) > COALESCE(b.amt, 0)
                OR (b.amt IS NULL AND COALESCE(a.amt, 0) > 0)
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
GRANT EXECUTE ON FUNCTION public.dashboard_budget_categories(uuid, int) TO authenticated, service_role;

COMMENT ON FUNCTION public.dashboard_budget_categories(uuid, int) IS
  'Dashboard: per-category budget from annual_budgets by property + year; no package_id.';

-- ---------------------------------------------------------------------------
-- dashboard_budget_alerts
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dashboard_budget_alerts(
  p_property_id uuid,
  p_year int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (p_property_id IN (SELECT public.user_property_ids())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

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
      GROUP BY ab.budget_category_id
    ),
    act AS (
      SELECT x.cat_id, SUM(x.amt) AS amt
      FROM (
        SELECT public.resolve_invoice_budget_category_id(i) AS cat_id,
               i.total_amount AS amt
        FROM public.invoices i
        WHERE i.property_id = p_property_id
          AND i.fiscal_year = p_year
          AND i.status = 'approved'
      ) x
      GROUP BY x.cat_id
    ),
    over_cat AS (
      SELECT jsonb_build_object(
        'type', 'category_over_actual',
        'severity', 'high',
        'code', c.code,
        'title_en', 'Over budget (actual)',
        'title_zh', '科目超支（实际已入账）',
        'message_en', c.name_en || ' actual exceeds budget',
        'message_zh', COALESCE(c.name_zh, c.name_en) || ' 实际支出已超过年度预算',
        'link_hint', '/finance?tab=invoices'
      ) AS alert
      FROM cats c
      INNER JOIN bud b ON b.budget_category_id = c.id
      LEFT JOIN act a ON a.cat_id = c.id
      WHERE COALESCE(a.amt, 0) > b.amt
    ),
    unbudgeted_inv AS (
      SELECT jsonb_build_object(
        'type', 'invoice_unbudgeted_category',
        'severity', 'high',
        'invoice_id', i.id,
        'title_en', 'Invoice outside budget lines',
        'title_zh', '发票科目无对应年度预算',
        'message_en', COALESCE(i.vendor_name, 'Invoice'),
        'message_zh', COALESCE(i.vendor_name, '发票'),
        'link_hint', '/finance?tab=invoices&invoice=' || i.id::text
      ) AS alert
      FROM public.invoices i
      WHERE i.property_id = p_property_id
        AND i.fiscal_year = p_year
        AND i.status IN ('approved', 'paid')
        AND i.is_budget_exceeded = true
        AND i.budget_anomaly_flag IS DISTINCT FROM 'category_unmatched'
        AND (
          public.resolve_invoice_budget_category_id(i) IS NULL
          OR NOT EXISTS (
            SELECT 1
            FROM public.annual_budgets ab
            WHERE ab.property_id = p_property_id
              AND ab.budget_category_id = public.resolve_invoice_budget_category_id(i)
              AND ab.fiscal_year = p_year
          )
        )
      LIMIT 20
    ),
    quote_cat_unmatched AS (
      SELECT jsonb_build_object(
        'type', 'quote_category_unmatched',
        'severity', 'medium',
        'quote_id', pq.id,
        'title_en', 'Quote category not matched',
        'title_zh', '报价科目无法匹配',
        'message_en', COALESCE(pq.vendor_name, 'Quote'),
        'message_zh', COALESCE(pq.vendor_name, '报价'),
        'link_hint', '/procurement'
      ) AS alert
      FROM public.procurement_quotes pq
      INNER JOIN public.procurement_jobs j ON j.id = pq.job_id
      WHERE j.property_id = p_property_id
        AND j.fiscal_year = p_year
        AND j.selected_quote_id = pq.id
        AND pq.budget_anomaly_flag = 'category_unmatched'
      LIMIT 20
    ),
    bad_quotes AS (
      SELECT jsonb_build_object(
        'type', 'quote_budget_exceeded',
        'severity', 'medium',
        'quote_id', pq.id,
        'title_en', 'Quote over budget commitment',
        'title_zh', '报价超出预算承诺',
        'message_en', COALESCE(pq.vendor_name, 'Quote'),
        'message_zh', COALESCE(pq.vendor_name, '报价'),
        'link_hint', '/procurement'
      ) AS alert
      FROM public.procurement_quotes pq
      INNER JOIN public.procurement_jobs j ON j.id = pq.job_id
      WHERE j.property_id = p_property_id
        AND j.fiscal_year = p_year
        AND pq.is_budget_exceeded = true
        AND pq.budget_anomaly_flag IS DISTINCT FROM 'category_unmatched'
      LIMIT 20
    ),
    anomalies AS (
      SELECT jsonb_build_object(
        'type', 'invoice_anomaly_flag',
        'severity', 'low',
        'invoice_id', i.id,
        'title_en', 'Invoice anomaly flag',
        'title_zh', '发票异常标记',
        'message_en', COALESCE(i.budget_anomaly_flag, 'flagged'),
        'message_zh', COALESCE(i.budget_anomaly_flag, '已标记'),
        'link_hint', '/finance?tab=invoices&invoice=' || i.id::text
      ) AS alert
      FROM public.invoices i
      WHERE i.property_id = p_property_id
        AND i.fiscal_year = p_year
        AND i.budget_anomaly_flag IS NOT NULL
        AND trim(i.budget_anomaly_flag) <> ''
        AND i.budget_anomaly_flag IS DISTINCT FROM 'category_unmatched'
      LIMIT 20
    ),
    invoice_cat_anomaly AS (
      SELECT jsonb_build_object(
        'type', 'invoice_category_unmatched',
        'severity', 'high',
        'invoice_id', i.id,
        'title_en', 'Invoice category not matched (OCR audit)',
        'title_zh', '发票科目无法匹配（OCR 审计）',
        'message_en', COALESCE(i.vendor_name, 'Invoice'),
        'message_zh', COALESCE(i.vendor_name, '发票'),
        'link_hint', '/finance?tab=invoices&invoice=' || i.id::text
      ) AS alert
      FROM public.invoices i
      WHERE i.property_id = p_property_id
        AND i.fiscal_year = p_year
        AND i.status IN ('approved', 'paid')
        AND i.budget_anomaly_flag = 'category_unmatched'
      LIMIT 20
    )
    SELECT jsonb_build_object(
      'fiscal_year', p_year,
      'alerts', COALESCE(
        (
          SELECT jsonb_agg(x.alert)
          FROM (
            SELECT alert FROM over_cat
            UNION ALL
            SELECT alert FROM unbudgeted_inv
            UNION ALL
            SELECT alert FROM quote_cat_unmatched
            UNION ALL
            SELECT alert FROM bad_quotes
            UNION ALL
            SELECT alert FROM anomalies
            UNION ALL
            SELECT alert FROM invoice_cat_anomaly
          ) x
        ),
        '[]'::jsonb
      )
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.dashboard_budget_alerts(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dashboard_budget_alerts(uuid, int) TO authenticated, service_role;

COMMENT ON FUNCTION public.dashboard_budget_alerts(uuid, int) IS
  'Dashboard alerts: no annual_budgets.package_id; budgets scoped by property + fiscal year.';

NOTIFY pgrst, 'reload schema';
