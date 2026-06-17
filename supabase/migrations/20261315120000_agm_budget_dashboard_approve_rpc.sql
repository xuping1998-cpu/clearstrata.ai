/*
  # AGM budget — dashboard summary + approve RPC (Phase AGM-1)
*/

BEGIN;

-- ---------------------------------------------------------------------------
-- dashboard_budget_summary: prefer agm_budget_lines when present
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dashboard_budget_summary(p_property_id uuid, p_year int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_budget numeric := 0;
  v_agm_budget numeric := 0;
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

  SELECT COALESCE(SUM(abl.budget_amount), 0)
  INTO v_agm_budget
  FROM public.agm_budget_lines abl
  WHERE abl.property_id = p_property_id
    AND abl.fiscal_year = p_year;

  SELECT COALESCE(SUM(ab.amount), 0)
  INTO v_annual_budget
  FROM public.annual_budgets ab
  WHERE ab.property_id = p_property_id
    AND ab.fiscal_year = p_year;

  v_budget := CASE
    WHEN v_agm_budget > 0 THEN v_agm_budget
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
  'Dashboard totals: agm_budget_lines when present, else annual_budgets; committed/actual unchanged.';

-- ---------------------------------------------------------------------------
-- approve_agm_budget_document — council writes approved lines
-- ---------------------------------------------------------------------------
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
    IF v_category = '' OR v_amount IS NULL OR v_amount < 0 THEN
      CONTINUE;
    END IF;
    INSERT INTO public.agm_budget_lines (
      property_id, fiscal_year, category, budget_amount, source_document_id
    ) VALUES (
      v_doc.property_id, p_fiscal_year, v_category, v_amount, p_document_id
    )
    ON CONFLICT (property_id, fiscal_year, category)
    DO UPDATE SET
      budget_amount = EXCLUDED.budget_amount,
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

REVOKE ALL ON FUNCTION public.approve_agm_budget_document(uuid, int, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_agm_budget_document(uuid, int, jsonb) TO authenticated, service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
