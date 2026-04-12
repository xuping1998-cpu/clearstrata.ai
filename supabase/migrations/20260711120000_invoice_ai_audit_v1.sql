/*
  AI invoice audit V1: storage + server-side context builder for Edge Function.
*/

-- ---------------------------------------------------------------------------
-- 1) Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.invoice_ai_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  fiscal_year int,
  risk_level text NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  risk_score numeric NOT NULL DEFAULT 0,
  ai_summary_zh text NOT NULL DEFAULT '',
  ai_summary_en text NOT NULL DEFAULT '',
  ai_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  model_name text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'ignored')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_invoice_ai_audits_invoice UNIQUE (invoice_id)
);

CREATE INDEX IF NOT EXISTS idx_invoice_ai_audits_property_year
  ON public.invoice_ai_audits(property_id, fiscal_year);

CREATE INDEX IF NOT EXISTS idx_invoice_ai_audits_risk_level
  ON public.invoice_ai_audits(risk_level);

CREATE INDEX IF NOT EXISTS idx_invoice_ai_audits_status
  ON public.invoice_ai_audits(status);

COMMENT ON TABLE public.invoice_ai_audits IS
  'AI invoice audit outcome; one row per invoice (re-run overwrites via upsert on invoice_id).';

CREATE TABLE IF NOT EXISTS public.invoice_ai_audit_contexts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  context_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_invoice_ai_audit_contexts_invoice UNIQUE (invoice_id)
);

CREATE INDEX IF NOT EXISTS idx_invoice_ai_audit_contexts_property
  ON public.invoice_ai_audit_contexts(property_id);

COMMENT ON TABLE public.invoice_ai_audit_contexts IS
  'Snapshot of structured context sent to the AI model for the latest run.';

-- ---------------------------------------------------------------------------
-- 2) updated_at
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._touch_invoice_ai_audits_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoice_ai_audits_touch ON public.invoice_ai_audits;
CREATE TRIGGER trg_invoice_ai_audits_touch
  BEFORE UPDATE ON public.invoice_ai_audits
  FOR EACH ROW
  EXECUTE FUNCTION public._touch_invoice_ai_audits_updated_at();

-- ---------------------------------------------------------------------------
-- 3) RLS (member read; staff write optional — Edge uses service_role)
-- ---------------------------------------------------------------------------

ALTER TABLE public.invoice_ai_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_ai_audit_contexts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoice_ai_audits_select_member" ON public.invoice_ai_audits;
CREATE POLICY "invoice_ai_audits_select_member"
  ON public.invoice_ai_audits FOR SELECT TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()));

DROP POLICY IF EXISTS "invoice_ai_audit_contexts_select_member" ON public.invoice_ai_audit_contexts;
CREATE POLICY "invoice_ai_audit_contexts_select_member"
  ON public.invoice_ai_audit_contexts FOR SELECT TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()));

GRANT SELECT ON public.invoice_ai_audits TO authenticated;
GRANT SELECT ON public.invoice_ai_audit_contexts TO authenticated;
GRANT ALL ON public.invoice_ai_audits TO service_role;
GRANT ALL ON public.invoice_ai_audit_contexts TO service_role;

-- ---------------------------------------------------------------------------
-- 4) Context builder (service_role / Edge only — aggregates rules + history + budget)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.invoice_ai_build_context(p_invoice_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv public.invoices%ROWTYPE;
  v_ocr jsonb := 'null'::jsonb;
  v_raw text;
  v_rules jsonb := '[]'::jsonb;
  v_vendor_hist jsonb := '[]'::jsonb;
  v_cat_hist jsonb := '[]'::jsonb;
  v_budget jsonb;
  v_cat uuid;
  v_pkg uuid;
  v_budget_amt numeric;
  v_committed numeric;
  v_actual numeric;
  v_fy int;
BEGIN
  SELECT * INTO v_inv FROM public.invoices WHERE id = p_invoice_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_fy := v_inv.fiscal_year;

  SELECT o.structured_json, o.raw_text INTO v_ocr, v_raw
  FROM public.invoice_ocr_raw o
  WHERE o.invoice_id = p_invoice_id
  LIMIT 1;

  IF v_ocr IS NULL THEN
    v_ocr := 'null'::jsonb;
  END IF;

  SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.created_at), '[]'::jsonb)
  INTO v_rules
  FROM public.invoice_audit_results r
  WHERE r.invoice_id = p_invoice_id
    AND r.status = 'open';

  v_cat := public.resolve_invoice_budget_category_id(v_inv);

  SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
  INTO v_vendor_hist
  FROM (
    SELECT
      i.id,
      i.vendor_name,
      i.invoice_number,
      i.invoice_date,
      i.total_amount,
      i.status,
      i.created_at
    FROM public.invoices i
    WHERE i.property_id = v_inv.property_id
      AND i.id <> v_inv.id
      AND public._invoice_norm_vendor(i.vendor_name) = public._invoice_norm_vendor(v_inv.vendor_name)
      AND coalesce(i.invoice_date::timestamptz, i.created_at) >= (now() - interval '12 months')
    ORDER BY coalesce(i.invoice_date::timestamptz, i.created_at) DESC
    LIMIT 30
  ) t;

  IF v_cat IS NOT NULL THEN
    SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
    INTO v_cat_hist
    FROM (
      SELECT
        i.id,
        i.vendor_name,
        i.invoice_number,
        i.invoice_date,
        i.total_amount,
        i.status,
        i.created_at
      FROM public.invoices i
      WHERE i.property_id = v_inv.property_id
        AND i.id <> v_inv.id
        AND public.resolve_invoice_budget_category_id(i) IS NOT DISTINCT FROM v_cat
        AND coalesce(i.invoice_date::timestamptz, i.created_at) >= (now() - interval '12 months')
      ORDER BY coalesce(i.invoice_date::timestamptz, i.created_at) DESC
      LIMIT 30
    ) t;
  END IF;

  v_pkg := public.active_budget_package_id(v_inv.property_id, v_fy);

  SELECT COALESCE(SUM(ab.amount), 0) INTO v_budget_amt
  FROM public.annual_budgets ab
  WHERE ab.package_id = v_pkg
    AND ab.fiscal_year = v_fy;

  SELECT COALESCE(SUM(pq.quoted_amount), 0) INTO v_committed
  FROM public.procurement_jobs j
  INNER JOIN public.procurement_quotes pq ON pq.id = j.selected_quote_id
  WHERE j.property_id = v_inv.property_id
    AND j.fiscal_year = v_fy
    AND j.selected_quote_id IS NOT NULL;

  SELECT COALESCE(SUM(i2.total_amount), 0) INTO v_actual
  FROM public.invoices i2
  WHERE i2.property_id = v_inv.property_id
    AND i2.fiscal_year = v_fy
    AND i2.status = 'approved';

  v_budget := jsonb_build_object(
    'fiscal_year', v_fy,
    'property_id', v_inv.property_id,
    'active_package_id', v_pkg,
    'total_budget', v_budget_amt,
    'committed', v_committed,
    'actual', v_actual,
    'budget_utilization', CASE WHEN v_budget_amt > 0 THEN round((v_actual / v_budget_amt)::numeric, 4) ELSE 0 END,
    'committed_utilization', CASE WHEN v_budget_amt > 0 THEN round((v_committed / v_budget_amt)::numeric, 4) ELSE 0 END,
    'remaining_budget', GREATEST(v_budget_amt - v_actual, 0)
  );

  RETURN jsonb_build_object(
    'invoice', to_jsonb(v_inv) || jsonb_build_object('resolved_budget_category_id', v_cat),
    'ocr', jsonb_build_object(
      'structured_json', coalesce(v_ocr, 'null'::jsonb),
      'raw_text', coalesce(v_raw, '')
    ),
    'rule_audit_open', coalesce(v_rules, '[]'::jsonb),
    'vendor_history_12m', coalesce(v_vendor_hist, '[]'::jsonb),
    'category_history_12m', coalesce(v_cat_hist, '[]'::jsonb),
    'budget_year_summary', coalesce(v_budget, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.invoice_ai_build_context(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invoice_ai_build_context(uuid) TO service_role;

COMMENT ON FUNCTION public.invoice_ai_build_context(uuid) IS
  'Build JSON context for AI invoice audit (Edge Function + service role).';
