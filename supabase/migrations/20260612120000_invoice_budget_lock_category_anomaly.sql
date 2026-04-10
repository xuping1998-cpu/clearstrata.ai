/*
  Budget rules:

  1) Invoice:
     When status becomes approved / paid:
     - compute and lock is_budget_exceeded
     - lock budget_anomaly_flag
     After that, if still approved/paid, do not recompute when amount/category/etc. changes.

  2) budget_package switch to active:
     - do NOT retroactively modify quotes/invoices
     - dashboard RPCs read the current active package only

  3) Category unmatched (invoice / quote, reserved for OCR audit):
     - is_budget_exceeded = true
     - budget_anomaly_flag = 'category_unmatched'
*/

-- ------------------------------------------------------------
-- Column comments
-- ------------------------------------------------------------
COMMENT ON COLUMN public.invoices.budget_anomaly_flag IS
  'Anomaly flag. category_unmatched: category could not be matched to budget_categories (OCR/audit); locked with is_budget_exceeded after approval.';

ALTER TABLE public.procurement_quotes
  ADD COLUMN IF NOT EXISTS budget_anomaly_flag text;

COMMENT ON COLUMN public.procurement_quotes.budget_anomaly_flag IS
  'Anomaly flag for quotes. category_unmatched: unmatched category; kept in sync with is_budget_exceeded when the selected quote is recomputed.';

COMMENT ON TABLE public.budget_package IS
  'Annual budget package. Switching active does not retroactively change historical quotes/invoices; dashboard aggregates only the current fiscal year active package.';

-- ------------------------------------------------------------
-- Quotes: recompute is_budget_exceeded and budget_anomaly_flag
-- category_unmatched when resolve_quote_budget_category_id returns NULL
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_budget_exceeded_to_quote(p_job_id uuid, p_quote_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pid uuid;
  v_fy int;
  v_amt numeric;
  v_cat uuid;
  v_pkg uuid;
  v_budget numeric;
  v_committed numeric;
BEGIN
  SELECT j.property_id, j.fiscal_year, pq.quoted_amount
  INTO v_pid, v_fy, v_amt
  FROM public.procurement_jobs j
  INNER JOIN public.procurement_quotes pq ON pq.id = p_quote_id AND pq.job_id = j.id
  WHERE j.id = p_job_id;

  IF v_pid IS NULL OR v_amt IS NULL THEN
    RETURN;
  END IF;

  v_cat := public.resolve_quote_budget_category_id(p_quote_id);
  v_pkg := public.active_budget_package_id(v_pid, v_fy);

  IF v_pkg IS NULL THEN
    UPDATE public.procurement_quotes
    SET is_budget_exceeded = true,
        budget_anomaly_flag = NULL
    WHERE id = p_quote_id;
    RETURN;
  END IF;

  IF v_cat IS NULL THEN
    UPDATE public.procurement_quotes
    SET is_budget_exceeded = true,
        budget_anomaly_flag = 'category_unmatched'
    WHERE id = p_quote_id;
    RETURN;
  END IF;

  SELECT ab.amount INTO v_budget
  FROM public.annual_budgets ab
  WHERE ab.package_id = v_pkg
    AND ab.budget_category_id = v_cat
    AND ab.fiscal_year = v_fy
  LIMIT 1;

  IF v_budget IS NULL THEN
    UPDATE public.procurement_quotes
    SET is_budget_exceeded = true,
        budget_anomaly_flag = NULL
    WHERE id = p_quote_id;
    RETURN;
  END IF;

  SELECT COALESCE(SUM(pq2.quoted_amount), 0) INTO v_committed
  FROM public.procurement_jobs j2
  INNER JOIN public.procurement_quotes pq2 ON pq2.id = j2.selected_quote_id
  WHERE j2.property_id = v_pid
    AND j2.fiscal_year = v_fy
    AND j2.id <> p_job_id
    AND public.resolve_quote_budget_category_id(pq2.id) IS NOT DISTINCT FROM v_cat;

  IF v_committed + v_amt > v_budget THEN
    UPDATE public.procurement_quotes
    SET is_budget_exceeded = true,
        budget_anomaly_flag = NULL
    WHERE id = p_quote_id;
  ELSE
    UPDATE public.procurement_quotes
    SET is_budget_exceeded = false,
        budget_anomaly_flag = NULL
    WHERE id = p_quote_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.procurement_jobs_selected_quote_budget_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.selected_quote_id IS NOT NULL THEN
      PERFORM public.apply_budget_exceeded_to_quote(NEW.id, NEW.selected_quote_id);
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.selected_quote_id IS NOT NULL
     AND (OLD.selected_quote_id IS DISTINCT FROM NEW.selected_quote_id) THEN
    UPDATE public.procurement_quotes
    SET is_budget_exceeded = NULL,
        budget_anomaly_flag = NULL
    WHERE id = OLD.selected_quote_id;
  END IF;

  IF NEW.selected_quote_id IS NOT NULL
     AND (
       OLD.selected_quote_id IS DISTINCT FROM NEW.selected_quote_id
       OR OLD.fiscal_year IS DISTINCT FROM NEW.fiscal_year
       OR OLD.property_id IS DISTINCT FROM NEW.property_id
     ) THEN
    PERFORM public.apply_budget_exceeded_to_quote(NEW.id, NEW.selected_quote_id);
  END IF;

  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- Invoices: compute once when entering approved/paid; then lock
-- is_budget_exceeded and budget_anomaly_flag
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.invoices_before_budget_exceeded()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cat uuid;
  v_pkg uuid;
  v_budget numeric;
  v_act numeric;
BEGIN
  -- Not approved/paid: do not keep locked values
  IF NEW.status NOT IN ('approved', 'paid') THEN
    NEW.is_budget_exceeded := NULL;
    IF TG_OP = 'UPDATE' AND OLD.status IN ('approved', 'paid') THEN
      NEW.budget_anomaly_flag := NULL;
    END IF;
    RETURN NEW;
  END IF;

  -- Staying within approved/paid: lock, no recompute
  IF TG_OP = 'UPDATE'
     AND OLD.status IN ('approved', 'paid')
     AND NEW.status IN ('approved', 'paid') THEN
    NEW.is_budget_exceeded := OLD.is_budget_exceeded;
    NEW.budget_anomaly_flag := OLD.budget_anomaly_flag;
    RETURN NEW;
  END IF;

  -- First transition to approved/paid (or INSERT as approved/paid)
  IF NEW.fiscal_year IS NULL THEN
    NEW.fiscal_year := EXTRACT(YEAR FROM COALESCE(NEW.invoice_date::date, CURRENT_DATE))::int;
  END IF;

  v_cat := public.resolve_invoice_budget_category_id(NEW);

  IF v_cat IS NULL THEN
    NEW.is_budget_exceeded := true;
    NEW.budget_anomaly_flag := 'category_unmatched';
    RETURN NEW;
  END IF;

  IF NEW.budget_anomaly_flag = 'category_unmatched' THEN
    NEW.budget_anomaly_flag := NULL;
  END IF;

  v_pkg := public.active_budget_package_id(NEW.property_id, NEW.fiscal_year);

  IF v_pkg IS NULL THEN
    NEW.is_budget_exceeded := true;
    RETURN NEW;
  END IF;

  SELECT ab.amount INTO v_budget
  FROM public.annual_budgets ab
  WHERE ab.package_id = v_pkg
    AND ab.budget_category_id = v_cat
    AND ab.fiscal_year = NEW.fiscal_year
  LIMIT 1;

  IF v_budget IS NULL THEN
    NEW.is_budget_exceeded := true;
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(i.total_amount), 0) INTO v_act
  FROM public.invoices i
  WHERE i.property_id = NEW.property_id
    AND i.fiscal_year = NEW.fiscal_year
    AND i.status IN ('approved', 'paid')
    AND public.resolve_invoice_budget_category_id(i) IS NOT DISTINCT FROM v_cat
    AND i.id IS DISTINCT FROM COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF v_act + COALESCE(NEW.total_amount, 0) > v_budget THEN
    NEW.is_budget_exceeded := true;
  ELSE
    NEW.is_budget_exceeded := false;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.dashboard_budget_summary(uuid, int) IS
  'Dashboard: aggregate budget rows only from the current fiscal year active budget_package; no backfill of historical packages.';

COMMENT ON FUNCTION public.dashboard_budget_categories(uuid, int) IS
  'Dashboard: budgets from current active package; committed/actual from current data, not recomputed for past packages.';

COMMENT ON FUNCTION public.dashboard_budget_alerts(uuid, int) IS
  'Dashboard: same scope as summary, based on current active package only.';

-- ------------------------------------------------------------
-- Alerts: quote category unmatched as its own type; over-budget
-- commitment excludes pure category_unmatched (avoid duplicates)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dashboard_budget_alerts(p_property_id uuid, p_year int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pkg uuid;
BEGIN
  IF NOT (p_property_id IN (SELECT public.user_property_ids())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_pkg := public.active_budget_package_id(p_property_id, p_year);

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
      WHERE ab.package_id = v_pkg
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
        'title_zh', '???????????',
        'message_en', c.name_en || ' actual exceeds budget',
        'message_zh', COALESCE(c.name_zh, c.name_en) || ' ???????????',
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
        'title_zh', '???????????',
        'message_en', coalesce(i.vendor_name, 'Invoice'),
        'message_zh', coalesce(i.vendor_name, '??'),
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
            WHERE ab.package_id = v_pkg
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
        'title_zh', '????????',
        'message_en', coalesce(pq.vendor_name, 'Quote'),
        'message_zh', coalesce(pq.vendor_name, '??'),
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
        'title_zh', '????????',
        'message_en', coalesce(pq.vendor_name, 'Quote'),
        'message_zh', coalesce(pq.vendor_name, '??'),
        'link_hint', '/procurement'
      ) AS alert
      FROM public.procurement_quotes pq
      INNER JOIN public.procurement_jobs j ON j.id = pq.job_id
      WHERE j.property_id = p_property_id
        AND j.fiscal_year = p_year
        AND pq.is_budget_exceeded = true
        AND (pq.budget_anomaly_flag IS DISTINCT FROM 'category_unmatched')
      LIMIT 20
    ),
    anomalies AS (
      SELECT jsonb_build_object(
        'type', 'invoice_anomaly_flag',
        'severity', 'low',
        'invoice_id', i.id,
        'title_en', 'Invoice anomaly flag',
        'title_zh', '??????',
        'message_en', coalesce(i.budget_anomaly_flag, 'flagged'),
        'message_zh', coalesce(i.budget_anomaly_flag, '???'),
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
        'title_zh', '?????????OCR ???',
        'message_en', coalesce(i.vendor_name, 'Invoice'),
        'message_zh', coalesce(i.vendor_name, '??'),
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
        (SELECT jsonb_agg(x.alert) FROM (
          SELECT alert FROM over_cat
          UNION ALL SELECT alert FROM unbudgeted_inv
          UNION ALL SELECT alert FROM quote_cat_unmatched
          UNION ALL SELECT alert FROM bad_quotes
          UNION ALL SELECT alert FROM invoice_cat_anomaly
          UNION ALL SELECT alert FROM anomalies
        ) x),
        '[]'::jsonb
      )
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.dashboard_budget_alerts(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dashboard_budget_alerts(uuid, int) TO authenticated;

-- Backfill selected quotes (refresh is_budget_exceeded / anomaly flags)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT j.id AS job_id, j.selected_quote_id AS qid
    FROM public.procurement_jobs j
    WHERE j.selected_quote_id IS NOT NULL
  LOOP
    PERFORM public.apply_budget_exceeded_to_quote(r.job_id, r.qid);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
