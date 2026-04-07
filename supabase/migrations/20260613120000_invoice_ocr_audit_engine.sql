/*
  # OCR 原始结果 + 规则审计引擎（与预算触发器独立）

  - invoice_ocr_raw：结构化 OCR 输出
  - invoice_anomalies：规则命中明细（可扩展 AI 规则）
  - invoices.is_abnormal + audit_summary：汇总
*/

-- ---------------------------------------------------------------------------
-- 1) Tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoice_ocr_raw (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  structured_json jsonb NOT NULL,
  raw_text text,
  ocr_model text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_invoice_ocr_raw_invoice UNIQUE (invoice_id)
);

CREATE INDEX IF NOT EXISTS idx_invoice_ocr_raw_property ON public.invoice_ocr_raw(property_id);

COMMENT ON TABLE public.invoice_ocr_raw IS 'OCR 结构化输出（vendor/amount/date/items）；与 invoice 1:1';

CREATE TABLE IF NOT EXISTS public.invoice_anomalies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  rule_code text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  message_en text NOT NULL,
  message_zh text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_invoice_anomalies_invoice_rule UNIQUE (invoice_id, rule_code)
);

CREATE INDEX IF NOT EXISTS idx_invoice_anomalies_property ON public.invoice_anomalies(property_id);
CREATE INDEX IF NOT EXISTS idx_invoice_anomalies_invoice ON public.invoice_anomalies(invoice_id);

COMMENT ON TABLE public.invoice_anomalies IS '自动审计规则命中；未来可追加 AI 规则码';

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS is_abnormal boolean NOT NULL DEFAULT false;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS audit_summary jsonb;

COMMENT ON COLUMN public.invoices.is_abnormal IS '规则/审计引擎标记的异常（与 has_anomalies / 预算字段独立）';
COMMENT ON COLUMN public.invoices.audit_summary IS '审计摘要 JSON：rule_codes、severity、extensible.ai_rules 预留';

CREATE INDEX IF NOT EXISTS idx_invoices_property_abnormal ON public.invoices(property_id, is_abnormal)
  WHERE is_abnormal = true;

-- ---------------------------------------------------------------------------
-- 2) Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._invoice_norm_vendor(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(trim(regexp_replace(coalesce(p, ''), '\s+', ' ', 'g')));
$$;

-- ---------------------------------------------------------------------------
-- 3) Audit engine（不修改预算相关列）
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.run_invoice_audit_engine(p_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v RECORD;
  v_quote_amt numeric;
  v_pkg uuid;
  v_cat uuid;
  v_budget numeric;
  v_hist_avg numeric;
  v_hist_cnt int;
  v_dup boolean;
  v_codes text[] := ARRAY[]::text[];
  v_high int := 0;
  v_med int := 0;
  v_low int := 0;
  v_max_sev int := 0;
  v_summary jsonb;
BEGIN
  SELECT * INTO v FROM public.invoices WHERE id = p_invoice_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  DELETE FROM public.invoice_anomalies WHERE invoice_id = p_invoice_id;

  -- 1) No quote
  IF v.quote_id IS NULL THEN
    INSERT INTO public.invoice_anomalies (
      invoice_id, property_id, rule_code, severity, message_en, message_zh, details
    ) VALUES (
      p_invoice_id,
      v.property_id,
      'no_quote',
      'medium',
      'Invoice has no linked procurement quote',
      '发票未关联采购报价',
      jsonb_build_object('quote_id', null)
    );
    v_med := v_med + 1;
    v_codes := array_append(v_codes, 'no_quote');
    v_max_sev := GREATEST(v_max_sev, 2);
  END IF;

  -- 2) Amount > quote 110%
  IF v.quote_id IS NOT NULL THEN
    SELECT pq.quoted_amount INTO v_quote_amt
    FROM public.procurement_quotes pq
    WHERE pq.id = v.quote_id
    LIMIT 1;
    IF v_quote_amt IS NOT NULL AND v.total_amount > v_quote_amt * 1.1 THEN
      INSERT INTO public.invoice_anomalies (
        invoice_id, property_id, rule_code, severity, message_en, message_zh, details
      ) VALUES (
        p_invoice_id,
        v.property_id,
        'amount_gt_quote_110',
        'high',
        'Invoice total exceeds quote by more than 10%',
        '发票金额超过关联报价 10% 以上',
        jsonb_build_object(
          'invoice_total', v.total_amount,
          'quote_amount', v_quote_amt,
          'threshold_ratio', 1.1
        )
      );
      v_high := v_high + 1;
      v_codes := array_append(v_codes, 'amount_gt_quote_110');
      v_max_sev := GREATEST(v_max_sev, 3);
    END IF;
  END IF;

  -- 3) No budget category / no active package / no budget line（只写一条 no_budget_category，互斥）
  v_pkg := public.active_budget_package_id(v.property_id, v.fiscal_year);
  v_cat := (
    SELECT public.resolve_invoice_budget_category_id(i)
    FROM public.invoices i
    WHERE i.id = p_invoice_id
  );

  IF v_cat IS NULL THEN
    INSERT INTO public.invoice_anomalies (
      invoice_id, property_id, rule_code, severity, message_en, message_zh, details
    ) VALUES (
      p_invoice_id,
      v.property_id,
      'no_budget_category',
      'medium',
      'Category cannot be matched to budget categories',
      '无法匹配预算科目',
      jsonb_build_object('reason', 'unresolved_category', 'category', v.category, 'budget_category_id', v.budget_category_id)
    );
    v_med := v_med + 1;
    v_codes := array_append(v_codes, 'no_budget_category');
    v_max_sev := GREATEST(v_max_sev, 2);
  ELSIF v_pkg IS NULL THEN
    INSERT INTO public.invoice_anomalies (
      invoice_id, property_id, rule_code, severity, message_en, message_zh, details
    ) VALUES (
      p_invoice_id,
      v.property_id,
      'no_budget_category',
      'medium',
      'No active budget package for this fiscal year',
      '本财年无生效预算包',
      jsonb_build_object('reason', 'no_active_package', 'fiscal_year', v.fiscal_year)
    );
    v_med := v_med + 1;
    v_codes := array_append(v_codes, 'no_budget_category');
    v_max_sev := GREATEST(v_max_sev, 2);
  ELSE
    SELECT ab.amount INTO v_budget
    FROM public.annual_budgets ab
    WHERE ab.package_id = v_pkg
      AND ab.budget_category_id = v_cat
      AND ab.fiscal_year = v.fiscal_year
    LIMIT 1;
    IF v_budget IS NULL THEN
      INSERT INTO public.invoice_anomalies (
        invoice_id, property_id, rule_code, severity, message_en, message_zh, details
      ) VALUES (
        p_invoice_id,
        v.property_id,
        'no_budget_category',
        'medium',
        'No budget line for this category in the active package',
        '当前生效预算包中无该科目预算行',
        jsonb_build_object('reason', 'no_line_for_category', 'budget_category_id', v_cat, 'package_id', v_pkg)
      );
      v_med := v_med + 1;
      v_codes := array_append(v_codes, 'no_budget_category');
      v_max_sev := GREATEST(v_max_sev, 2);
    END IF;
  END IF;

  -- 4) Duplicate invoice (same property + vendor + invoice #)
  IF v.invoice_number IS NOT NULL AND trim(v.invoice_number) <> '' THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.invoices i2
      WHERE i2.property_id = v.property_id
        AND i2.id <> v.id
        AND i2.invoice_number IS NOT NULL
        AND trim(i2.invoice_number) = trim(v.invoice_number)
        AND public._invoice_norm_vendor(i2.vendor_name) = public._invoice_norm_vendor(v.vendor_name)
    ) INTO v_dup;
    IF v_dup THEN
      INSERT INTO public.invoice_anomalies (
        invoice_id, property_id, rule_code, severity, message_en, message_zh, details
      ) VALUES (
        p_invoice_id,
        v.property_id,
        'duplicate_invoice',
        'high',
        'Possible duplicate: same vendor and invoice number exists',
        '可能重复发票：同供应商与发票号已存在',
        jsonb_build_object('invoice_number', trim(v.invoice_number))
      );
      v_high := v_high + 1;
      v_codes := array_append(v_codes, 'duplicate_invoice');
      v_max_sev := GREATEST(v_max_sev, 3);
    END IF;
  END IF;

  -- 5) Vendor price spike vs recent same-vendor invoices
  SELECT avg(x.total_amount), count(*)::int
  INTO v_hist_avg, v_hist_cnt
  FROM (
    SELECT i2.total_amount
    FROM public.invoices i2
    WHERE i2.property_id = v.property_id
      AND i2.id <> v.id
      AND i2.status IN ('approved', 'paid')
      AND public._invoice_norm_vendor(i2.vendor_name) = public._invoice_norm_vendor(v.vendor_name)
      AND public._invoice_norm_vendor(v.vendor_name) <> ''
    ORDER BY i2.invoice_date DESC NULLS LAST, i2.created_at DESC
    LIMIT 8
  ) AS x;

  IF v_hist_cnt >= 2 AND v_hist_avg IS NOT NULL AND v_hist_avg > 0 AND v.total_amount > v_hist_avg * 1.45 THEN
    INSERT INTO public.invoice_anomalies (
      invoice_id, property_id, rule_code, severity, message_en, message_zh, details
    ) VALUES (
      p_invoice_id,
      v.property_id,
      'vendor_price_spike',
      'medium',
      'Invoice amount is high vs recent invoices from this vendor',
      '相对该供应商近期发票金额异常偏高',
      jsonb_build_object(
        'historical_avg', round(v_hist_avg, 2),
        'historical_count', v_hist_cnt,
        'ratio_vs_avg', round((v.total_amount / v_hist_avg)::numeric, 4)
      )
    );
    v_med := v_med + 1;
    v_codes := array_append(v_codes, 'vendor_price_spike');
    v_max_sev := GREATEST(v_max_sev, 2);
  END IF;

  v_summary := jsonb_build_object(
    'version', 1,
    'engine', 'rules_v1',
    'evaluated_at', to_jsonb(now()),
    'severity',
      CASE v_max_sev
        WHEN 3 THEN 'high'
        WHEN 2 THEN 'medium'
        WHEN 1 THEN 'low'
        ELSE 'none'
      END,
    'rule_codes', to_jsonb(v_codes),
    'counts', jsonb_build_object('high', v_high, 'medium', v_med, 'low', v_low),
    'extensible', jsonb_build_object('ai_rules', '[]'::jsonb)
  );

  UPDATE public.invoices
  SET
    is_abnormal = (cardinality(v_codes) > 0),
    audit_summary = CASE WHEN cardinality(v_codes) > 0 THEN v_summary ELSE NULL END
  WHERE id = p_invoice_id;
END;
$$;

REVOKE ALL ON FUNCTION public.run_invoice_audit_engine(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.invoices_after_audit_engine()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.run_invoice_audit_engine(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoices_audit_engine ON public.invoices;
CREATE TRIGGER trg_invoices_audit_engine
  AFTER INSERT OR UPDATE OF
    vendor_name,
    total_amount,
    quote_id,
    category,
    budget_category_id,
    invoice_number,
    invoice_date,
    fiscal_year,
    property_id,
    status
  ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.invoices_after_audit_engine();

-- ---------------------------------------------------------------------------
-- 4) RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.invoice_ocr_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_anomalies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoice_ocr_raw_select" ON public.invoice_ocr_raw;
CREATE POLICY "invoice_ocr_raw_select"
  ON public.invoice_ocr_raw FOR SELECT TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()));

DROP POLICY IF EXISTS "invoice_ocr_raw_staff_write" ON public.invoice_ocr_raw;
DROP POLICY IF EXISTS "invoice_ocr_raw_insert_uploader" ON public.invoice_ocr_raw;
CREATE POLICY "invoice_ocr_raw_insert_uploader"
  ON public.invoice_ocr_raw FOR INSERT TO authenticated
  WITH CHECK (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1
      FROM public.invoices i
      WHERE i.id = invoice_ocr_raw.invoice_id
        AND i.property_id = invoice_ocr_raw.property_id
        AND i.uploaded_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "invoice_ocr_raw_staff_update" ON public.invoice_ocr_raw;
CREATE POLICY "invoice_ocr_raw_staff_update"
  ON public.invoice_ocr_raw FOR UPDATE TO authenticated
  USING (property_id IN (SELECT public.user_property_staff_ids()))
  WITH CHECK (property_id IN (SELECT public.user_property_staff_ids()));

DROP POLICY IF EXISTS "invoice_ocr_raw_staff_delete" ON public.invoice_ocr_raw;
CREATE POLICY "invoice_ocr_raw_staff_delete"
  ON public.invoice_ocr_raw FOR DELETE TO authenticated
  USING (property_id IN (SELECT public.user_property_staff_ids()));

DROP POLICY IF EXISTS "invoice_anomalies_select" ON public.invoice_anomalies;
CREATE POLICY "invoice_anomalies_select"
  ON public.invoice_anomalies FOR SELECT TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()));

DROP POLICY IF EXISTS "invoice_anomalies_staff_all" ON public.invoice_anomalies;
CREATE POLICY "invoice_anomalies_staff_all"
  ON public.invoice_anomalies FOR ALL TO authenticated
  USING (property_id IN (SELECT public.user_property_staff_ids()))
  WITH CHECK (property_id IN (SELECT public.user_property_staff_ids()));

NOTIFY pgrst, 'reload schema';
