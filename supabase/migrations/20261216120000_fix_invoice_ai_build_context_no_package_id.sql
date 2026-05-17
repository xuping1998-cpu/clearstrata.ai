-- Fix invoice_ai_build_context: annual_budgets has no package_id on production.
-- Budget totals scoped by property_id + fiscal_year (aligned with dashboard_budget_summary).

CREATE OR REPLACE FUNCTION public.invoice_ai_build_context(p_invoice_id uuid, p_property_id uuid)
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
  SELECT * INTO v_inv
  FROM public.invoices
  WHERE id = p_invoice_id
    AND property_id = p_property_id;
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
  WHERE ab.property_id = p_property_id
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

REVOKE ALL ON FUNCTION public.invoice_ai_build_context(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invoice_ai_build_context(uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.invoice_ai_build_context(uuid, uuid) IS
  'Build JSON context for AI invoice audit (Edge + service_role). Requires matching property_id. Budget totals by property_id + fiscal_year.';
