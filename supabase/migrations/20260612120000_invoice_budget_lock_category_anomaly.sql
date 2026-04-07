/*
  # 最终规则补充

  1) 发票：status 进入 approved / paid 时计算并锁定 is_budget_exceeded 与 budget_anomaly_flag；
     之后若仍为 approved/paid，不因预算/分类/金额等变更而重算。
  2) budget_package 切换 active：不回溯修改报价/发票历史字段；Dashboard RPC 仅读取当前 active package。
  3) 科目无法解析：is_budget_exceeded = true，budget_anomaly_flag = 'category_unmatched'（发票/报价，供 OCR 审计预留）。
*/

-- ---------------------------------------------------------------------------
-- 常量说明（应用层可与之一致）
-- ---------------------------------------------------------------------------
COMMENT ON COLUMN public.invoices.budget_anomaly_flag IS
  '异常标记；category_unmatched 表示科目无法匹配到 budget_categories（OCR/审计预留）；审批通过后与 is_budget_exceeded 一并锁定。';

ALTER TABLE public.procurement_quotes
  ADD COLUMN IF NOT EXISTS budget_anomaly_flag text;

COMMENT ON COLUMN public.procurement_quotes.budget_anomaly_flag IS
  '异常标记；category_unmatched 表示科目无法匹配；与 is_budget_exceeded 同步维护（选中报价重算时更新）。';

COMMENT ON TABLE public.budget_package IS
  '年度预算包。切换 active 不会触发系统回溯修改历史报价/发票；Dashboard 仅汇总当前财年 status=active 的包。';

-- ---------------------------------------------------------------------------
-- 报价：category_unmatched 仅当 resolve 为 NULL
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 发票：审批通过（approved / paid）时计算一次；通过后锁定 is_budget_exceeded 与 budget_anomaly_flag
-- ---------------------------------------------------------------------------
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
  -- 非已批准/已支付：不保留锁定字段
  IF NEW.status NOT IN ('approved', 'paid') THEN
    NEW.is_budget_exceeded := NULL;
    IF TG_OP = 'UPDATE' AND OLD.status IN ('approved', 'paid') THEN
      NEW.budget_anomaly_flag := NULL;
    END IF;
    RETURN NEW;
  END IF;

  -- 已在批准态之间更新：锁定，不重算
  IF TG_OP = 'UPDATE'
     AND OLD.status IN ('approved', 'paid')
     AND NEW.status IN ('approved', 'paid') THEN
    NEW.is_budget_exceeded := OLD.is_budget_exceeded;
    NEW.budget_anomaly_flag := OLD.budget_anomaly_flag;
    RETURN NEW;
  END IF;

  -- 首次进入 approved/paid（或 INSERT 即为 approved/paid）
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
  'Dashboard：仅汇总当前财年 active 的 budget_package 下预算行；不回溯历史包。';

COMMENT ON FUNCTION public.dashboard_budget_categories(uuid, int) IS
  'Dashboard：预算来自当前 active package；committed/actual 为当前数据，不因曾用包而重算历史行。';

COMMENT ON FUNCTION public.dashboard_budget_alerts(uuid, int) IS
  'Dashboard：与 summary 一致，仅基于当前 active package。';

-- ---------------------------------------------------------------------------
-- Alerts：报价科目未匹配单独一类；超预算承诺不含纯 category_unmatched（避免重复）
-- ---------------------------------------------------------------------------
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
        'message_en', coalesce(i.vendor_name, 'Invoice'),
        'message_zh', coalesce(i.vendor_name, '发票'),
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
        'title_zh', '报价科目无法匹配',
        'message_en', coalesce(pq.vendor_name, 'Quote'),
        'message_zh', coalesce(pq.vendor_name, '报价'),
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
        'message_en', coalesce(pq.vendor_name, 'Quote'),
        'message_zh', coalesce(pq.vendor_name, '报价'),
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
        'title_zh', '发票异常标记',
        'message_en', coalesce(i.budget_anomaly_flag, 'flagged'),
        'message_zh', coalesce(i.budget_anomaly_flag, '已标记'),
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
        'message_en', coalesce(i.vendor_name, 'Invoice'),
        'message_zh', coalesce(i.vendor_name, '发票'),
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

-- 回填选中报价（刷新 anomaly 标记）
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
