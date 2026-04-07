/*
  # 预算包 + 财年 + 法规文档同物业约束 + 超预算触发器 + Dashboard RPC

  1) budget_package：document_id → compliance_docs，与 property_id 同物业（触发器）
  2) annual_budgets：挂 package_id；删除行级 status（以 package 状态为准）
  3) procurement_jobs / procurement_quotes / invoices：fiscal_year（显式财年）
  4) selected_quote_id 变更：先清除旧报价 is_budget_exceeded，再按「其他任务 committed + 本报价」重算，防双计
  5) 科目无对应年度预算行：报价/发票视为预算外（is_budget_exceeded = true）
  6) Dashboard RPC：仅 active package 的预算行；Actual 仅 approved；Committed 按 fiscal_year
*/

-- ---------------------------------------------------------------------------
-- 0) 每个物业至少一条 compliance_docs（供 budget_package.document_id 引用）
-- ---------------------------------------------------------------------------
INSERT INTO public.compliance_docs (
  title_en,
  title_zh,
  category,
  description_en,
  property_id,
  status
)
SELECT
  'Budget baseline (system)',
  '预算基准（系统）',
  'legal',
  'Placeholder document for annual budget package linkage; replace with board-approved document as needed.',
  p.id,
  'active'
FROM public.properties p
WHERE NOT EXISTS (
  SELECT 1 FROM public.compliance_docs cd WHERE cd.property_id = p.id
);

-- ---------------------------------------------------------------------------
-- 1) budget_package
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.budget_package (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  fiscal_year int NOT NULL CHECK (fiscal_year >= 2000 AND fiscal_year <= 2100),
  document_id uuid NOT NULL REFERENCES public.compliance_docs(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_package_property_year ON public.budget_package(property_id, fiscal_year);

CREATE UNIQUE INDEX IF NOT EXISTS uq_budget_package_one_active_per_year
  ON public.budget_package(property_id, fiscal_year)
  WHERE status = 'active';

COMMENT ON TABLE public.budget_package IS '年度预算包；法规文档 document_id 必须与 property_id 同物业';

-- ---------------------------------------------------------------------------
-- 2) 法规文档与物业一致（INSERT/UPDATE budget_package）
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_budget_package_document_property()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.compliance_docs cd
    WHERE cd.id = NEW.document_id
      AND cd.property_id = NEW.property_id
  ) THEN
    RAISE EXCEPTION 'budget_package.document_id must reference compliance_docs for the same property_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_budget_package_document_property ON public.budget_package;
CREATE TRIGGER trg_budget_package_document_property
  BEFORE INSERT OR UPDATE OF document_id, property_id ON public.budget_package
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_budget_package_document_property();

-- ---------------------------------------------------------------------------
-- 3) fiscal_year 列
-- ---------------------------------------------------------------------------
ALTER TABLE public.procurement_jobs
  ADD COLUMN IF NOT EXISTS fiscal_year int;

UPDATE public.procurement_jobs j
SET fiscal_year = COALESCE(
  j.fiscal_year,
  EXTRACT(YEAR FROM COALESCE(j.created_at, now()))::int
)
WHERE j.fiscal_year IS NULL;

ALTER TABLE public.procurement_jobs
  ALTER COLUMN fiscal_year SET NOT NULL;

ALTER TABLE public.procurement_quotes
  ADD COLUMN IF NOT EXISTS fiscal_year int;

UPDATE public.procurement_quotes q
SET fiscal_year = COALESCE(q.fiscal_year, j.fiscal_year)
FROM public.procurement_jobs j
WHERE q.job_id = j.id
  AND (q.fiscal_year IS NULL OR q.fiscal_year IS DISTINCT FROM j.fiscal_year);

UPDATE public.procurement_quotes q
SET fiscal_year = EXTRACT(YEAR FROM COALESCE(q.created_at, now()))::int
WHERE q.fiscal_year IS NULL;

ALTER TABLE public.procurement_quotes
  ALTER COLUMN fiscal_year SET NOT NULL;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS fiscal_year int;

UPDATE public.invoices i
SET fiscal_year = COALESCE(
  i.fiscal_year,
  EXTRACT(YEAR FROM COALESCE(i.invoice_date::timestamptz, i.created_at, now()))::int
)
WHERE i.fiscal_year IS NULL;

ALTER TABLE public.invoices
  ALTER COLUMN fiscal_year SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_procurement_jobs_fy ON public.procurement_jobs(property_id, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_procurement_quotes_fy ON public.procurement_quotes(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_invoices_fy ON public.invoices(property_id, fiscal_year);

-- job 更新财年时同步报价财年
CREATE OR REPLACE FUNCTION public.procurement_jobs_sync_child_fiscal_year()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND (OLD.fiscal_year IS DISTINCT FROM NEW.fiscal_year
          OR OLD.property_id IS DISTINCT FROM NEW.property_id) THEN
    UPDATE public.procurement_quotes q
    SET fiscal_year = NEW.fiscal_year
    WHERE q.job_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_procurement_jobs_sync_quote_fy ON public.procurement_jobs;
CREATE TRIGGER trg_procurement_jobs_sync_quote_fy
  AFTER UPDATE OF fiscal_year, property_id ON public.procurement_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.procurement_jobs_sync_child_fiscal_year();

-- ---------------------------------------------------------------------------
-- 4) 从 annual_budgets 种子 budget_package 并挂接 package_id
-- ---------------------------------------------------------------------------
INSERT INTO public.budget_package (property_id, fiscal_year, document_id, status)
SELECT
  ab.property_id,
  ab.fiscal_year,
  (
    SELECT cd.id
    FROM public.compliance_docs cd
    WHERE cd.property_id = ab.property_id
    ORDER BY cd.created_at ASC NULLS LAST
    LIMIT 1
  ),
  CASE WHEN bool_or(ab.status = 'active') THEN 'active' ELSE 'draft' END
FROM public.annual_budgets ab
WHERE NOT EXISTS (
  SELECT 1
  FROM public.budget_package bp
  WHERE bp.property_id = ab.property_id
    AND bp.fiscal_year = ab.fiscal_year
)
GROUP BY ab.property_id, ab.fiscal_year;

ALTER TABLE public.annual_budgets
  ADD COLUMN IF NOT EXISTS package_id uuid REFERENCES public.budget_package(id) ON DELETE CASCADE;

UPDATE public.annual_budgets ab
SET package_id = (
  SELECT bp.id
  FROM public.budget_package bp
  WHERE bp.property_id = ab.property_id
    AND bp.fiscal_year = ab.fiscal_year
  ORDER BY
    CASE bp.status
      WHEN 'active' THEN 0
      WHEN 'draft' THEN 1
      ELSE 2
    END,
    bp.created_at DESC
  LIMIT 1
);

ALTER TABLE public.annual_budgets
  ALTER COLUMN package_id SET NOT NULL;

ALTER TABLE public.annual_budgets
  DROP CONSTRAINT IF EXISTS uq_annual_budgets_line;

ALTER TABLE public.annual_budgets
  ADD CONSTRAINT uq_annual_budgets_pkg_category UNIQUE (package_id, budget_category_id);

DROP INDEX IF EXISTS public.idx_annual_budgets_property_year;

ALTER TABLE public.annual_budgets
  DROP COLUMN IF EXISTS status;

CREATE INDEX IF NOT EXISTS idx_annual_budgets_package_year
  ON public.annual_budgets(package_id, fiscal_year);

COMMENT ON COLUMN public.annual_budgets.package_id IS '预算行所属预算包（仅 active 包参与 Dashboard 汇总）';

-- ---------------------------------------------------------------------------
-- 5) 辅助函数
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.active_budget_package_id(p_property_id uuid, p_fiscal_year int)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bp.id
  FROM public.budget_package bp
  WHERE bp.property_id = p_property_id
    AND bp.fiscal_year = p_fiscal_year
    AND bp.status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.resolve_quote_budget_category_id(p_quote_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    pq.budget_category_id,
    (
      SELECT bc.id
      FROM public.budget_categories bc
      WHERE bc.property_id = j.property_id
        AND bc.code = COALESCE(nullif(trim(j.category), ''), 'general')
      LIMIT 1
    )
  )
  FROM public.procurement_quotes pq
  INNER JOIN public.procurement_jobs j ON j.id = pq.job_id
  WHERE pq.id = p_quote_id;
$$;

COMMENT ON FUNCTION public.resolve_quote_budget_category_id(uuid) IS '报价行 → budget_categories.id（优先 budget_category_id，否则 job.category → code）';

-- ---------------------------------------------------------------------------
-- 6) 选中报价超预算：排除本任务旧报价后再与其他 committed 比较
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
    UPDATE public.procurement_quotes SET is_budget_exceeded = true WHERE id = p_quote_id;
    RETURN;
  END IF;

  IF v_cat IS NULL THEN
    UPDATE public.procurement_quotes SET is_budget_exceeded = true WHERE id = p_quote_id;
    RETURN;
  END IF;

  SELECT ab.amount INTO v_budget
  FROM public.annual_budgets ab
  WHERE ab.package_id = v_pkg
    AND ab.budget_category_id = v_cat
    AND ab.fiscal_year = v_fy
  LIMIT 1;

  IF v_budget IS NULL THEN
    UPDATE public.procurement_quotes SET is_budget_exceeded = true WHERE id = p_quote_id;
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
    UPDATE public.procurement_quotes SET is_budget_exceeded = true WHERE id = p_quote_id;
  ELSE
    UPDATE public.procurement_quotes SET is_budget_exceeded = false WHERE id = p_quote_id;
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
    SET is_budget_exceeded = NULL
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

DROP TRIGGER IF EXISTS trg_procurement_jobs_selected_quote_budget ON public.procurement_jobs;
CREATE TRIGGER trg_procurement_jobs_selected_quote_budget
  AFTER INSERT OR UPDATE OF selected_quote_id, fiscal_year, property_id ON public.procurement_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.procurement_jobs_selected_quote_budget_guard();

CREATE OR REPLACE FUNCTION public.procurement_quotes_selected_budget_refresh()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  IF TG_OP = 'UPDATE'
     AND (
       OLD.quoted_amount IS DISTINCT FROM NEW.quoted_amount
       OR OLD.budget_category_id IS DISTINCT FROM NEW.budget_category_id
       OR OLD.fiscal_year IS DISTINCT FROM NEW.fiscal_year
     ) THEN
    FOR r IN
      SELECT j.id AS job_id
      FROM public.procurement_jobs j
      WHERE j.selected_quote_id = NEW.id
    LOOP
      PERFORM public.apply_budget_exceeded_to_quote(r.job_id, NEW.id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_procurement_quotes_budget_exceeded ON public.procurement_quotes;
CREATE TRIGGER trg_procurement_quotes_budget_exceeded
  AFTER UPDATE OF quoted_amount, budget_category_id, fiscal_year ON public.procurement_quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.procurement_quotes_selected_budget_refresh();

-- ---------------------------------------------------------------------------
-- 7) 发票：无预算科目或超支 → is_budget_exceeded
-- ---------------------------------------------------------------------------
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS is_budget_exceeded boolean;

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
  IF NEW.status IS DISTINCT FROM 'approved' THEN
    NEW.is_budget_exceeded := NULL;
    RETURN NEW;
  END IF;

  IF NEW.fiscal_year IS NULL THEN
    NEW.fiscal_year := EXTRACT(YEAR FROM COALESCE(NEW.invoice_date::date, CURRENT_DATE))::int;
  END IF;

  v_cat := public.resolve_invoice_budget_category_id(NEW);
  v_pkg := public.active_budget_package_id(NEW.property_id, NEW.fiscal_year);

  IF v_pkg IS NULL OR v_cat IS NULL THEN
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
    AND i.status = 'approved'
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

DROP TRIGGER IF EXISTS trg_invoices_budget_exceeded ON public.invoices;
CREATE TRIGGER trg_invoices_budget_exceeded
  BEFORE INSERT OR UPDATE OF status, total_amount, budget_category_id, category, invoice_date, fiscal_year, property_id
  ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.invoices_before_budget_exceeded();

-- 回填已有发票标记
UPDATE public.invoices i
SET is_budget_exceeded = sub.flagged
FROM (
  SELECT
    i2.id,
    CASE
      WHEN i2.status <> 'approved' THEN NULL::boolean
      WHEN public.active_budget_package_id(i2.property_id, i2.fiscal_year) IS NULL THEN true
      WHEN public.resolve_invoice_budget_category_id(i2) IS NULL THEN true
      WHEN (
        SELECT ab.amount
        FROM public.annual_budgets ab
        WHERE ab.package_id = public.active_budget_package_id(i2.property_id, i2.fiscal_year)
          AND ab.budget_category_id = public.resolve_invoice_budget_category_id(i2)
          AND ab.fiscal_year = i2.fiscal_year
        LIMIT 1
      ) IS NULL THEN true
      WHEN (
        SELECT COALESCE(SUM(i3.total_amount), 0)
        FROM public.invoices i3
        WHERE i3.property_id = i2.property_id
          AND i3.fiscal_year = i2.fiscal_year
          AND i3.status = 'approved'
          AND public.resolve_invoice_budget_category_id(i3) IS NOT DISTINCT FROM public.resolve_invoice_budget_category_id(i2)
          AND i3.id <> i2.id
      ) + i2.total_amount > (
        SELECT ab.amount
        FROM public.annual_budgets ab
        WHERE ab.package_id = public.active_budget_package_id(i2.property_id, i2.fiscal_year)
          AND ab.budget_category_id = public.resolve_invoice_budget_category_id(i2)
          AND ab.fiscal_year = i2.fiscal_year
        LIMIT 1
      ) THEN true
      ELSE false
    END AS flagged
  FROM public.invoices i2
) sub
WHERE i.id = sub.id;

-- ---------------------------------------------------------------------------
-- 8) RLS：budget_package
-- ---------------------------------------------------------------------------
ALTER TABLE public.budget_package ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "budget_package_select_member" ON public.budget_package;
CREATE POLICY "budget_package_select_member"
  ON public.budget_package FOR SELECT TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()));

DROP POLICY IF EXISTS "budget_package_staff_insert" ON public.budget_package;
CREATE POLICY "budget_package_staff_insert"
  ON public.budget_package FOR INSERT TO authenticated
  WITH CHECK (property_id IN (SELECT public.user_property_staff_ids()));

DROP POLICY IF EXISTS "budget_package_staff_update" ON public.budget_package;
CREATE POLICY "budget_package_staff_update"
  ON public.budget_package FOR UPDATE TO authenticated
  USING (property_id IN (SELECT public.user_property_staff_ids()))
  WITH CHECK (property_id IN (SELECT public.user_property_staff_ids()));

DROP POLICY IF EXISTS "budget_package_staff_delete" ON public.budget_package;
CREATE POLICY "budget_package_staff_delete"
  ON public.budget_package FOR DELETE TO authenticated
  USING (property_id IN (SELECT public.user_property_staff_ids()));

-- ---------------------------------------------------------------------------
-- 9) Dashboard RPC（替换）
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dashboard_budget_summary(p_property_id uuid, p_year int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pkg uuid;
  v_budget numeric;
  v_committed numeric;
  v_actual numeric;
BEGIN
  IF NOT (p_property_id IN (SELECT public.user_property_ids())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_pkg := public.active_budget_package_id(p_property_id, p_year);

  SELECT COALESCE(SUM(ab.amount), 0) INTO v_budget
  FROM public.annual_budgets ab
  WHERE ab.package_id = v_pkg
    AND ab.fiscal_year = p_year;

  SELECT COALESCE(SUM(pq.quoted_amount), 0) INTO v_committed
  FROM public.procurement_jobs j
  INNER JOIN public.procurement_quotes pq ON pq.id = j.selected_quote_id
  WHERE j.property_id = p_property_id
    AND j.fiscal_year = p_year
    AND j.selected_quote_id IS NOT NULL;

  SELECT COALESCE(SUM(i.total_amount), 0) INTO v_actual
  FROM public.invoices i
  WHERE i.property_id = p_property_id
    AND i.fiscal_year = p_year
    AND i.status = 'approved';

  RETURN jsonb_build_object(
    'fiscal_year', p_year,
    'property_id', p_property_id,
    'active_package_id', v_pkg,
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
GRANT EXECUTE ON FUNCTION public.dashboard_budget_summary(uuid, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.dashboard_budget_categories(p_property_id uuid, p_year int)
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
      SELECT bc.id, bc.code, bc.name_en, bc.name_zh, bc.sort_order
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
      'active_package_id', v_pkg,
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
    SELECT EXTRACT(MONTH FROM i.invoice_date::date)::int AS mo,
           SUM(i.total_amount) AS amt
    FROM public.invoices i
    WHERE i.property_id = p_property_id
      AND i.fiscal_year = p_year
      AND i.status = 'approved'
    GROUP BY 1
  ),
  comm AS (
    SELECT EXTRACT(MONTH FROM j.created_at)::int AS mo,
           SUM(pq.quoted_amount) AS amt
    FROM public.procurement_jobs j
    INNER JOIN public.procurement_quotes pq ON pq.id = j.selected_quote_id
    WHERE j.property_id = p_property_id
      AND j.fiscal_year = p_year
      AND j.selected_quote_id IS NOT NULL
    GROUP BY 1
  )
  SELECT jsonb_build_object(
    'fiscal_year', p_year,
    'months', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'month', mo.m,
          'actual', COALESCE(a.amt, 0),
          'committed', COALESCE(c.amt, 0)
        ) ORDER BY mo.m
      )
      FROM generate_series(1, 12) AS mo(m)
      LEFT JOIN act a ON a.mo = mo.m
      LEFT JOIN comm c ON c.mo = mo.m
      ),
      '[]'::jsonb
    )
  ) INTO r;

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
        AND i.status = 'approved'
        AND i.is_budget_exceeded = true
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
      LIMIT 20
    )
    SELECT jsonb_build_object(
      'fiscal_year', p_year,
      'alerts', COALESCE(
        (SELECT jsonb_agg(x.alert) FROM (
          SELECT alert FROM over_cat
          UNION ALL SELECT alert FROM unbudgeted_inv
          UNION ALL SELECT alert FROM bad_quotes
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

REVOKE ALL ON FUNCTION public.active_budget_package_id(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.active_budget_package_id(uuid, int) TO authenticated;

REVOKE ALL ON FUNCTION public.apply_budget_exceeded_to_quote(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_quote_budget_category_id(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_quote_budget_category_id(uuid) TO authenticated;

-- 回填已有选中报价的超预算标记（迁移前无触发器）
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
