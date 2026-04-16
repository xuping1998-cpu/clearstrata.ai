/*
  V1 rule-based invoice audit:
  - Table public.invoice_audit_results (open | resolved | ignored)
  - run_invoice_audit_for_property(property, fiscal_year)
  - dashboard_budget_alerts: invoice alerts from audit rows + existing quote alerts
  - dashboard_recent_abnormal_invoices, dashboard_monthly_abnormal_distinct_count

  metadata reserved for future AI/OCR: ai_explanation, confidence, ocr_fields, baselines, etc.
*/

-- ---------------------------------------------------------------------------
-- 1) invoice_audit_results
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoice_audit_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  fiscal_year int,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  rule_code text NOT NULL,
  title_zh text NOT NULL DEFAULT '',
  message_zh text NOT NULL DEFAULT '',
  title_en text NOT NULL DEFAULT '',
  message_en text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'ignored')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_audit_results_property_year
  ON public.invoice_audit_results(property_id, fiscal_year);

CREATE INDEX IF NOT EXISTS idx_invoice_audit_results_invoice
  ON public.invoice_audit_results(invoice_id);

CREATE INDEX IF NOT EXISTS idx_invoice_audit_results_severity
  ON public.invoice_audit_results(severity);

CREATE INDEX IF NOT EXISTS idx_invoice_audit_results_status
  ON public.invoice_audit_results(status);

COMMENT ON TABLE public.invoice_audit_results IS
  'Rule and future AI audit findings per invoice; V1 rule engine. metadata: OCR, AI explanation, confidence, baselines.';

COMMENT ON COLUMN public.invoice_audit_results.metadata IS
  'Extensible: ocr_structured, ai_explanation, confidence, comparison_baselines, peer_invoice_id, etc.';

ALTER TABLE public.invoice_audit_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoice_audit_results_select_member" ON public.invoice_audit_results;
CREATE POLICY "invoice_audit_results_select_member"
  ON public.invoice_audit_results
  FOR SELECT
  TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()));

-- Staff may manage rows (optional UI later); audit runner is SECURITY DEFINER
DROP POLICY IF EXISTS "invoice_audit_results_staff_all" ON public.invoice_audit_results;
CREATE POLICY "invoice_audit_results_staff_all"
  ON public.invoice_audit_results
  FOR ALL
  TO authenticated
  USING (property_id IN (SELECT public.user_property_staff_ids()))
  WITH CHECK (property_id IN (SELECT public.user_property_staff_ids()));

GRANT SELECT ON public.invoice_audit_results TO authenticated;
GRANT ALL ON public.invoice_audit_results TO service_role;

-- ---------------------------------------------------------------------------
-- 2) run_invoice_audit_for_property
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.run_invoice_audit_for_property(
  p_property_id uuid,
  p_year int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_audited int := 0;
  v_hit int := 0;
  v_high int := 0;
  v_med int := 0;
  v_low int := 0;
BEGIN
  IF NOT (p_property_id IN (SELECT public.user_property_ids())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  DELETE FROM public.invoice_audit_results
  WHERE property_id = p_property_id
    AND fiscal_year = p_year
    AND status = 'open';

  SELECT COUNT(*)::int INTO v_audited
  FROM public.invoices i
  WHERE i.property_id = p_property_id
    AND i.fiscal_year = p_year;

  -- Rule: missing_required_fields (medium)
  INSERT INTO public.invoice_audit_results (
    invoice_id, property_id, fiscal_year, severity, rule_code,
    title_zh, title_en, message_zh, message_en, metadata
  )
  SELECT
    i.id,
    i.property_id,
    i.fiscal_year,
    'medium',
    'missing_required_fields',
    '发票关键字段缺失',
    'Missing required invoice fields',
    '供应商名称、金额或开票日期缺失，请补全后再入账。',
    'Vendor name, amount, or invoice date is missing; complete before posting.',
    jsonb_build_object(
      'missing_vendor', (trim(coalesce(i.vendor_name, '')) = ''),
      'missing_amount', (i.total_amount IS NULL OR i.total_amount <= 0),
      'missing_invoice_date', (i.invoice_date IS NULL)
    )
  FROM public.invoices i
  WHERE i.property_id = p_property_id
    AND i.fiscal_year = p_year
    AND (
      trim(coalesce(i.vendor_name, '')) = ''
      OR i.total_amount IS NULL
      OR i.total_amount <= 0
      OR i.invoice_date IS NULL
    );

  -- Rule: category_unmatched (high)
  INSERT INTO public.invoice_audit_results (
    invoice_id, property_id, fiscal_year, severity, rule_code,
    title_zh, title_en, message_zh, message_en, metadata
  )
  SELECT
    i.id,
    i.property_id,
    i.fiscal_year,
    'high',
    'category_unmatched',
    '预算科目无法匹配',
    'Category could not be matched to budget',
    COALESCE(i.vendor_name, '发票') || '：科目无法匹配年度预算行，请核对分类或预算。',
    COALESCE(i.vendor_name, 'Invoice') || ': category does not match an annual budget line.',
    jsonb_build_object('budget_anomaly_flag', i.budget_anomaly_flag)
  FROM public.invoices i
  WHERE i.property_id = p_property_id
    AND i.fiscal_year = p_year
    AND i.status IN ('approved', 'paid', 'pending_review', 'pending', 'flagged')
    AND (
      i.budget_anomaly_flag = 'category_unmatched'
      OR (
        public.resolve_invoice_budget_category_id(i) IS NULL
        OR NOT EXISTS (
          SELECT 1
          FROM public.annual_budgets ab
          WHERE ab.property_id = p_property_id
            AND ab.budget_category_id = public.resolve_invoice_budget_category_id(i)
            AND ab.fiscal_year = p_year
            AND ab.status = 'active'
        )
      )
    );

  -- Rule: budget_over_limit — category actual > annual budget (high), per invoice in that category
  INSERT INTO public.invoice_audit_results (
    invoice_id, property_id, fiscal_year, severity, rule_code,
    title_zh, title_en, message_zh, message_en, metadata
  )
  SELECT DISTINCT
    i.id,
    i.property_id,
    i.fiscal_year,
    'high',
    'budget_over_limit',
    '科目支出超过年度预算',
    'Category spend over annual budget',
    COALESCE(c.name_zh, c.name_en) || '：该科目已入账金额超过本年度预算。',
    c.name_en || ': posted amount exceeds the annual budget for this category.',
    jsonb_build_object(
      'budget_category_id', c.id,
      'category_code', c.code
    )
  FROM public.invoices i
  INNER JOIN public.budget_categories c
    ON c.id = public.resolve_invoice_budget_category_id(i)
   AND c.property_id = p_property_id
   AND c.is_active = true
  INNER JOIN (
    SELECT ab.budget_category_id, COALESCE(SUM(ab.amount), 0) AS budget_amt
    FROM public.annual_budgets ab
    WHERE ab.property_id = p_property_id
      AND ab.fiscal_year = p_year
      AND ab.status = 'active'
    GROUP BY ab.budget_category_id
  ) b ON b.budget_category_id = c.id
  INNER JOIN (
    SELECT x.cat_id, SUM(x.amt) AS actual_amt
    FROM (
      SELECT public.resolve_invoice_budget_category_id(ii) AS cat_id, ii.total_amount AS amt
      FROM public.invoices ii
      WHERE ii.property_id = p_property_id
        AND ii.fiscal_year = p_year
        AND ii.status IN ('approved', 'paid')
    ) x
    WHERE x.cat_id IS NOT NULL
    GROUP BY x.cat_id
  ) a ON a.cat_id = c.id
  WHERE i.property_id = p_property_id
    AND i.fiscal_year = p_year
    AND i.status IN ('approved', 'paid')
    AND public.resolve_invoice_budget_category_id(i) = c.id
    AND COALESCE(a.actual_amt, 0) > COALESCE(b.budget_amt, 0);

  -- Rule: duplicate_invoice_suspected (medium)
  INSERT INTO public.invoice_audit_results (
    invoice_id, property_id, fiscal_year, severity, rule_code,
    title_zh, title_en, message_zh, message_en, metadata
  )
  SELECT DISTINCT
    i.id,
    i.property_id,
    i.fiscal_year,
    'medium',
    'duplicate_invoice_suspected',
    '疑似重复发票',
    'Possible duplicate invoice',
    '与同物业下另一张发票供应商、金额相同，且日期接近或发票号相同。',
    'Same vendor and amount as another invoice, with close dates or same invoice number.',
    jsonb_build_object(
      'peer_invoice_id',
      (
        SELECT i2.id
        FROM public.invoices i2
        WHERE i2.property_id = i.property_id
          AND i2.fiscal_year = i.fiscal_year
          AND i2.id <> i.id
          AND public._invoice_norm_vendor(i2.vendor_name) = public._invoice_norm_vendor(i.vendor_name)
          AND public._invoice_norm_vendor(i.vendor_name) <> ''
          AND COALESCE(i2.total_amount, -1) = COALESCE(i.total_amount, -2)
          AND COALESCE(i.total_amount, 0) > 0
          AND (
            (
              i.invoice_number IS NOT NULL AND trim(i.invoice_number) <> ''
              AND i2.invoice_number IS NOT NULL AND trim(i2.invoice_number) <> ''
              AND trim(i.invoice_number) = trim(i2.invoice_number)
            )
            OR (
              i.invoice_date IS NOT NULL AND i2.invoice_date IS NOT NULL
              AND abs(i.invoice_date - i2.invoice_date) <= 7
            )
          )
        ORDER BY i2.created_at
        LIMIT 1
      )
    )
  FROM public.invoices i
  WHERE i.property_id = p_property_id
    AND i.fiscal_year = p_year
    AND EXISTS (
      SELECT 1
      FROM public.invoices i2
      WHERE i2.property_id = i.property_id
        AND i2.fiscal_year = i.fiscal_year
        AND i2.id <> i.id
        AND public._invoice_norm_vendor(i2.vendor_name) = public._invoice_norm_vendor(i.vendor_name)
        AND public._invoice_norm_vendor(i.vendor_name) <> ''
        AND COALESCE(i2.total_amount, -1) = COALESCE(i.total_amount, -2)
        AND COALESCE(i.total_amount, 0) > 0
        AND (
          (
            i.invoice_number IS NOT NULL AND trim(i.invoice_number) <> ''
            AND i2.invoice_number IS NOT NULL AND trim(i2.invoice_number) <> ''
            AND trim(i.invoice_number) = trim(i2.invoice_number)
          )
          OR (
            i.invoice_date IS NOT NULL AND i2.invoice_date IS NOT NULL
            AND abs(i.invoice_date - i2.invoice_date) <= 7
          )
        )
    );

  -- Rule: price_outlier (medium) — same vendor, amount > 2.5x peer average (peers exclude self), peers >= 3
  INSERT INTO public.invoice_audit_results (
    invoice_id, property_id, fiscal_year, severity, rule_code,
    title_zh, title_en, message_zh, message_en, metadata
  )
  SELECT
    i.id,
    i.property_id,
    i.fiscal_year,
    'medium',
    'price_outlier',
    '金额偏离历史均值',
    'Amount above typical for this vendor',
    COALESCE(i.vendor_name, '供应商') || '：本张发票金额明显高于该供应商本年度历史均值（简单阈值）。',
    COALESCE(i.vendor_name, 'Vendor') || ': amount is significantly above this vendor''s FY average (threshold rule).',
    jsonb_build_object(
      'vendor_norm', public._invoice_norm_vendor(i.vendor_name),
      'peer_avg', vs.peer_avg,
      'peer_count', vs.peer_cnt
    )
  FROM public.invoices i
  INNER JOIN LATERAL (
    SELECT
      AVG(ii.total_amount) AS peer_avg,
      COUNT(*)::int AS peer_cnt
    FROM public.invoices ii
    WHERE ii.property_id = p_property_id
      AND ii.fiscal_year = p_year
      AND ii.status IN ('approved', 'paid')
      AND ii.id <> i.id
      AND public._invoice_norm_vendor(ii.vendor_name) = public._invoice_norm_vendor(i.vendor_name)
      AND public._invoice_norm_vendor(i.vendor_name) <> ''
      AND ii.total_amount IS NOT NULL
      AND ii.total_amount > 0
  ) vs ON vs.peer_cnt >= 3
    AND vs.peer_avg IS NOT NULL
    AND vs.peer_avg > 0
    AND i.total_amount IS NOT NULL
    AND i.total_amount > vs.peer_avg * 2.5
  WHERE i.property_id = p_property_id
    AND i.fiscal_year = p_year
    AND i.status IN ('approved', 'paid', 'pending_review', 'pending')
    AND public._invoice_norm_vendor(i.vendor_name) <> '';

  SELECT
    COUNT(*)::int,
    COUNT(*) FILTER (WHERE severity = 'high')::int,
    COUNT(*) FILTER (WHERE severity = 'medium')::int,
    COUNT(*) FILTER (WHERE severity = 'low')::int
  INTO v_hit, v_high, v_med, v_low
  FROM public.invoice_audit_results
  WHERE property_id = p_property_id
    AND fiscal_year = p_year
    AND status = 'open';

  RETURN jsonb_build_object(
    'audited_invoice_count', v_audited,
    'hit_count', v_hit,
    'high_count', v_high,
    'medium_count', v_med,
    'low_count', v_low,
    'fiscal_year', p_year,
    'property_id', p_property_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.run_invoice_audit_for_property(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_invoice_audit_for_property(uuid, int) TO authenticated, service_role;

COMMENT ON FUNCTION public.run_invoice_audit_for_property(uuid, int) IS
  'V1 rule audit: deletes open rows for property+year, re-runs 5 rules, returns counts. Call after invoice changes or on a schedule.';

-- ---------------------------------------------------------------------------
-- 3) dashboard_monthly_abnormal_distinct_count
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dashboard_monthly_abnormal_distinct_count(
  p_property_id uuid,
  p_year int
)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT r.invoice_id)::int
  FROM public.invoice_audit_results r
  INNER JOIN public.invoices i ON i.id = r.invoice_id
  WHERE p_property_id IN (SELECT public.user_property_ids())
    AND r.property_id = p_property_id
    AND r.status = 'open'
    AND i.fiscal_year = p_year
    AND r.created_at >= date_trunc('month', now())
    AND r.created_at < date_trunc('month', now()) + interval '1 month';
$$;

REVOKE ALL ON FUNCTION public.dashboard_monthly_abnormal_distinct_count(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dashboard_monthly_abnormal_distinct_count(uuid, int) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4) dashboard_recent_abnormal_invoices
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dashboard_recent_abnormal_invoices(
  p_property_id uuid,
  p_year int,
  p_limit int DEFAULT 12
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v jsonb;
BEGIN
  IF NOT (p_property_id IN (SELECT public.user_property_ids())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 THEN
    p_limit := 12;
  END IF;

  SELECT COALESCE(
    (
      SELECT jsonb_agg(to_jsonb(s))
      FROM (
        SELECT
          q.id,
          q.vendor_name,
          q.total_amount,
          q.status,
          q.budget_anomaly_flag,
          q.invoice_date,
          q.created_at,
          q.audit_message_zh,
          q.audit_message_en,
          q.audit_rule_code,
          q.audit_severity
        FROM (
          SELECT
            i.id,
            i.vendor_name,
            i.total_amount,
            i.status,
            i.budget_anomaly_flag,
            i.invoice_date,
            i.created_at,
            a.primary_message_zh AS audit_message_zh,
            a.primary_message_en AS audit_message_en,
            a.primary_rule_code AS audit_rule_code,
            a.primary_severity AS audit_severity
          FROM public.invoices i
          LEFT JOIN LATERAL (
            SELECT
              r.message_zh AS primary_message_zh,
              r.message_en AS primary_message_en,
              r.rule_code AS primary_rule_code,
              r.severity AS primary_severity
            FROM public.invoice_audit_results r
            WHERE r.invoice_id = i.id
              AND r.status = 'open'
            ORDER BY
              CASE r.severity WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
              r.created_at DESC
            LIMIT 1
          ) a ON TRUE
          WHERE i.property_id = p_property_id
            AND i.fiscal_year = p_year
            AND (
              EXISTS (
                SELECT 1
                FROM public.invoice_audit_results r2
                WHERE r2.invoice_id = i.id
                  AND r2.status = 'open'
              )
              OR COALESCE(i.is_abnormal, false) = true
              OR (
                i.budget_anomaly_flag IS NOT NULL
                AND trim(i.budget_anomaly_flag) <> ''
              )
            )
          ORDER BY COALESCE(i.invoice_date::timestamptz, i.created_at) DESC NULLS LAST
          LIMIT p_limit
        ) q
      ) s
    ),
    '[]'::jsonb
  )
  INTO v;

  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public.dashboard_recent_abnormal_invoices(uuid, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dashboard_recent_abnormal_invoices(uuid, int, int) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5) dashboard_budget_alerts — invoice alerts from audit + quote alerts
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
        AND ab.status = 'active'
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
    audit_inv AS (
      SELECT z.alert
      FROM (
        SELECT jsonb_build_object(
          'type', 'invoice_audit_' || r.rule_code,
          'severity', r.severity,
          'invoice_id', r.invoice_id,
          'code', r.rule_code,
          'title_en', r.title_en,
          'title_zh', r.title_zh,
          'message_en', r.message_en,
          'message_zh', r.message_zh,
          'link_hint', '/finance?tab=invoices&invoice=' || r.invoice_id::text
        ) AS alert
        FROM public.invoice_audit_results r
        WHERE r.property_id = p_property_id
          AND r.fiscal_year = p_year
          AND r.status = 'open'
        ORDER BY
          CASE r.severity WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
          r.created_at DESC
        LIMIT 80
      ) z
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
    )
    SELECT jsonb_build_object(
      'fiscal_year', p_year,
      'alerts', COALESCE(
        (
          SELECT jsonb_agg(x.alert)
          FROM (
            SELECT alert FROM audit_inv
            UNION ALL
            SELECT alert FROM over_cat
            UNION ALL
            SELECT alert FROM quote_cat_unmatched
            UNION ALL
            SELECT alert FROM bad_quotes
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
  'Dashboard alerts: open invoice_audit_results (V1 rules) + category_over_actual + procurement quote alerts.';

NOTIFY pgrst, 'reload schema';
