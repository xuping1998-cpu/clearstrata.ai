-- Public demo read + post-signup claim for allowlisted property (BCS3736).
-- Anonymous may only call RPCs that resolve to this demo row; no broad table access.

CREATE OR REPLACE FUNCTION public.resolve_public_demo_property(p_code text)
RETURNS TABLE(id uuid, name text, property_code text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm text := lower(trim(coalesce(p_code, '')));
BEGIN
  IF v_norm <> 'bcs3736' THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT p.id, p.name, p.property_code
  FROM public.properties p
  WHERE lower(trim(coalesce(p.property_code, ''))) = 'bcs3736'
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_public_demo_property(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_public_demo_property(text) TO anon, authenticated;

COMMENT ON FUNCTION public.resolve_public_demo_property(text) IS
  'Resolve name/id for public demo QR; only property_code BCS3736.';

-- Budget summary for demo property only (does not use user_property_ids; same math as dashboard_budget_summary).
CREATE OR REPLACE FUNCTION public.demo_dashboard_budget_summary(p_code text, p_year int)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pid uuid;
  v_pkg uuid;
  v_budget numeric;
  v_committed numeric;
  v_actual numeric;
BEGIN
  SELECT r.id INTO v_pid FROM public.resolve_public_demo_property(p_code) r;
  IF v_pid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'not_found');
  END IF;

  v_pkg := public.active_budget_package_id(v_pid, p_year);

  SELECT COALESCE(SUM(ab.amount), 0) INTO v_budget
  FROM public.annual_budgets ab
  WHERE ab.package_id = v_pkg
    AND ab.fiscal_year = p_year;

  SELECT COALESCE(SUM(pq.quoted_amount), 0) INTO v_committed
  FROM public.procurement_jobs j
  INNER JOIN public.procurement_quotes pq ON pq.id = j.selected_quote_id
  WHERE j.property_id = v_pid
    AND j.fiscal_year = p_year
    AND j.selected_quote_id IS NOT NULL;

  SELECT COALESCE(SUM(i.total_amount), 0) INTO v_actual
  FROM public.invoices i
  WHERE i.property_id = v_pid
    AND i.fiscal_year = p_year
    AND i.status = 'approved';

  RETURN jsonb_build_object(
    'ok', true,
    'fiscal_year', p_year,
    'property_id', v_pid,
    'active_package_id', v_pkg,
    'budget_scope', CASE WHEN v_pkg IS NULL THEN 'property_year' ELSE 'package' END,
    'total_budget', v_budget,
    'committed', v_committed,
    'actual', v_actual,
    'budget_utilization', CASE WHEN v_budget > 0 THEN round((v_actual / v_budget)::numeric, 4) ELSE 0 END,
    'committed_utilization', CASE WHEN v_budget > 0 THEN round((v_committed / v_budget)::numeric, 4) ELSE 0 END,
    'remaining_budget', GREATEST(v_budget - v_actual, 0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.demo_dashboard_budget_summary(text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.demo_dashboard_budget_summary(text, int) TO anon, authenticated;

-- AI risk aggregates + recent abnormal rows (non-sensitive invoice fields only).
CREATE OR REPLACE FUNCTION public.demo_ai_home_snapshot(p_code text, p_fiscal_year int, p_recent_limit int DEFAULT 12)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pid uuid;
  v_now date := (timezone('utc', now()))::date;
  v_month_start date := date_trunc('month', v_now)::date;
  v_month_end date := (date_trunc('month', v_now) + interval '1 month - 1 day')::date;
  v_lim int := greatest(1, least(p_recent_limit, 50));
  j_ai jsonb;
  j_recent jsonb;
BEGIN
  SELECT x.id INTO v_pid FROM public.resolve_public_demo_property(p_code) x;
  IF v_pid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'not_found');
  END IF;

  WITH fy AS (
    SELECT
      iar.invoice_id,
      iar.risk_score,
      iar.risk_level,
      iar.updated_at,
      iar.over_budget,
      iar.bypass_approval,
      i.fiscal_year,
      coalesce(i.invoice_date::date, i.created_at::date) AS inv_day
    FROM public.invoice_ai_audit_results iar
    INNER JOIN public.invoices i ON i.id = iar.invoice_id AND i.property_id = v_pid
    WHERE iar.property_id = v_pid
      AND i.fiscal_year IS NOT NULL
      AND i.fiscal_year = p_fiscal_year
  )
  SELECT jsonb_build_object(
    'monthlyAbnormalInvoices',
    coalesce((
      SELECT count(DISTINCT invoice_id) FROM fy
      WHERE inv_day IS NOT NULL AND inv_day >= v_month_start AND inv_day <= v_month_end
        AND (
          coalesce(risk_score, 0) > 0.6
          OR lower(coalesce(risk_level, '')) IN ('medium', 'high', 'critical')
        )
    ), 0),
    'pendingRiskItems',
    coalesce((
      SELECT count(DISTINCT invoice_id) FROM fy
      WHERE coalesce(risk_score, 0) > 0.5 OR lower(coalesce(risk_level, '')) IN ('medium', 'high', 'critical')
    ), 0),
    'highRiskCount',
    coalesce((SELECT count(DISTINCT invoice_id) FROM fy WHERE lower(coalesce(risk_level, '')) IN ('high', 'critical')), 0),
    'criticalRiskCount',
    coalesce((SELECT count(DISTINCT invoice_id) FROM fy WHERE lower(coalesce(risk_level, '')) = 'critical'), 0),
    'abnormalInvoiceCount',
    coalesce((SELECT count(DISTINCT invoice_id) FROM fy WHERE coalesce(risk_score, 0) > 0.6), 0),
    'overBudgetCount',
    coalesce((SELECT count(DISTINCT invoice_id) FROM fy WHERE over_budget IS TRUE), 0),
    'bypassApprovalCount',
    coalesce((SELECT count(DISTINCT invoice_id) FROM fy WHERE bypass_approval IS TRUE), 0),
    'lastUpdatedAt',
    (SELECT max(updated_at)::text FROM fy)
  )
  INTO j_ai;

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'invoice_id', q.invoice_id,
        'vendor_name', q.vendor_name,
        'total_amount', q.total_amount,
        'invoice_date', q.invoice_date,
        'status', q.status,
        'risk_level', q.risk_level,
        'risk_score', q.risk_score,
        'summary', q.summary,
        'over_budget', q.over_budget,
        'bypass_approval', q.bypass_approval
      )
      ORDER BY q.sort_ts DESC
    ),
    '[]'::jsonb
  )
  INTO j_recent
  FROM (
    SELECT
      iar.invoice_id,
      i.vendor_name,
      i.total_amount,
      i.invoice_date::text AS invoice_date,
      i.status,
      iar.risk_level,
      iar.risk_score,
      left(trim(coalesce(iar.summary, '')), 2000) AS summary,
      iar.over_budget,
      iar.bypass_approval,
      iar.updated_at AS sort_ts
    FROM public.invoice_ai_audit_results iar
    INNER JOIN public.invoices i ON i.id = iar.invoice_id AND i.property_id = v_pid
    WHERE iar.property_id = v_pid
      AND i.fiscal_year = p_fiscal_year
      AND (
        coalesce(iar.risk_score, 0) > 0.6
        OR iar.over_budget IS TRUE
        OR iar.bypass_approval IS TRUE
      )
    ORDER BY iar.updated_at DESC
    LIMIT v_lim
  ) q;

  RETURN jsonb_build_object('ok', true, 'aiRisk', j_ai, 'recentItems', j_recent);
END;
$$;

REVOKE ALL ON FUNCTION public.demo_ai_home_snapshot(text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.demo_ai_home_snapshot(text, int, int) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.demo_meetings_preview(p_code text, p_limit int DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pid uuid;
BEGIN
  SELECT x.id INTO v_pid FROM public.resolve_public_demo_property(p_code) x;
  IF v_pid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'not_found');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'items',
    coalesce(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', m.id,
            'title_en', m.title_en,
            'title_zh', m.title_zh,
            'scheduled_date', m.scheduled_date::text,
            'status', m.status
          )
          ORDER BY m.scheduled_date DESC NULLS LAST
        )
        FROM (
          SELECT id, title_en, title_zh, scheduled_date, status
          FROM public.meetings
          WHERE property_id = v_pid
          ORDER BY scheduled_date DESC NULLS LAST
          LIMIT greatest(1, least(p_limit, 80))
        ) m
      ),
      '[]'::jsonb
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.demo_meetings_preview(text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.demo_meetings_preview(text, int) TO anon, authenticated;

-- Post-registration: bind user to the single public demo property (BCS3736 row only).
CREATE OR REPLACE FUNCTION public.claim_public_demo_property_membership(p_property_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_demo uuid;
BEGIN
  SELECT p.id INTO v_demo
  FROM public.properties p
  WHERE lower(trim(coalesce(p.property_code, ''))) = 'bcs3736'
  LIMIT 1;

  IF v_demo IS NULL OR p_property_id IS DISTINCT FROM v_demo OR v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.property_members pm
    WHERE pm.user_id = v_uid AND pm.property_id = v_demo
  ) THEN
    RETURN v_demo;
  END IF;

  INSERT INTO public.property_members (user_id, property_id, role, status)
  VALUES (v_uid, v_demo, 'owner'::public.user_role, 'active');

  RETURN v_demo;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_public_demo_property_membership(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_public_demo_property_membership(uuid) TO authenticated;

COMMENT ON FUNCTION public.claim_public_demo_property_membership(uuid) IS
  'After signup from public demo: add active membership for BCS3736 demo property only.';
