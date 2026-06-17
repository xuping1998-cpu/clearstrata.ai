/*
  # AGM budget — revenue/expense totals + approve with budget_type (Phase AGM-1B)
*/

BEGIN;

CREATE OR REPLACE FUNCTION public.dashboard_budget_summary(p_property_id uuid, p_year int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_budget numeric := 0;
  v_agm_revenue numeric := 0;
  v_agm_expense numeric := 0;
  v_agm_net numeric := 0;
  v_has_agm boolean := false;
  v_annual_budget numeric := 0;
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

  SELECT
    COALESCE(SUM(budget_amount) FILTER (WHERE budget_type = 'revenue'), 0),
    COALESCE(SUM(budget_amount) FILTER (WHERE budget_type = 'expense'), 0),
    COUNT(*) > 0
  INTO v_agm_revenue, v_agm_expense, v_has_agm
  FROM public.agm_budget_lines abl
  WHERE abl.property_id = p_property_id
    AND abl.fiscal_year = p_year;

  v_agm_net := v_agm_revenue - v_agm_expense;

  SELECT COALESCE(SUM(ab.amount), 0)
  INTO v_annual_budget
  FROM public.annual_budgets ab
  WHERE ab.property_id = p_property_id
    AND ab.fiscal_year = p_year;

  v_budget := CASE
    WHEN v_has_agm THEN v_agm_expense
    ELSE v_annual_budget
  END;

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
    'has_agm_breakdown', v_has_agm,
    'revenue_total', v_agm_revenue,
    'expense_total', v_agm_expense,
    'net_budget', v_agm_net,
    'total_budget', v_budget,
    'committed', v_committed,
    'actual', v_actual,
    'budget_utilization', CASE WHEN v_budget > 0 THEN round((v_actual / v_budget)::numeric, 4) ELSE 0 END,
    'committed_utilization', CASE WHEN v_budget > 0 THEN round((v_committed / v_budget)::numeric, 4) ELSE 0 END,
    'remaining_budget', GREATEST(v_budget - v_actual, 0)
  );
END;
$$;

COMMENT ON FUNCTION public.dashboard_budget_summary(uuid, int) IS
  'Dashboard: agm_budget_lines revenue/expense/net when present; utilization vs expense_total.';

CREATE OR REPLACE FUNCTION public.approve_agm_budget_document(
  p_document_id uuid,
  p_fiscal_year int,
  p_lines jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc public.agm_budget_documents%ROWTYPE;
  v_line jsonb;
  v_category text;
  v_amount numeric;
  v_budget_type text;
  v_count int := 0;
BEGIN
  SELECT * INTO v_doc FROM public.agm_budget_documents WHERE id = p_document_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'document_not_found');
  END IF;

  IF NOT (v_doc.property_id IN (SELECT public.user_property_ids())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.property_members pm
    WHERE pm.user_id = (SELECT auth.uid())
      AND pm.property_id = v_doc.property_id
      AND pm.status = 'active'
      AND pm.role IN ('council', 'admin', 'property_admin')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_fiscal_year IS NULL OR p_fiscal_year < 2000 OR p_fiscal_year > 2100 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_fiscal_year');
  END IF;

  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_lines');
  END IF;

  DELETE FROM public.agm_budget_lines
  WHERE property_id = v_doc.property_id
    AND fiscal_year = p_fiscal_year;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_category := trim(both FROM coalesce(v_line->>'category', ''));
    v_amount := (v_line->>'amount')::numeric;
    v_budget_type := lower(trim(both FROM coalesce(v_line->>'budget_type', 'expense')));
    IF v_budget_type NOT IN ('revenue', 'expense') THEN
      v_budget_type := 'expense';
    END IF;
    IF v_category = '' OR v_amount IS NULL OR v_amount < 0 THEN
      CONTINUE;
    END IF;
    INSERT INTO public.agm_budget_lines (
      property_id, fiscal_year, category, budget_amount, budget_type, source_document_id
    ) VALUES (
      v_doc.property_id, p_fiscal_year, v_category, v_amount, v_budget_type, p_document_id
    )
    ON CONFLICT (property_id, fiscal_year, category)
    DO UPDATE SET
      budget_amount = EXCLUDED.budget_amount,
      budget_type = EXCLUDED.budget_type,
      source_document_id = EXCLUDED.source_document_id;
    v_count := v_count + 1;
  END LOOP;

  IF v_count = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_valid_lines');
  END IF;

  UPDATE public.agm_budget_documents
  SET
    status = 'approved',
    fiscal_year = p_fiscal_year,
    parsed_draft = p_lines,
    updated_at = now()
  WHERE id = p_document_id;

  RETURN jsonb_build_object('ok', true, 'lines_written', v_count);
END;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';
