/*
  invoice_audit_reports:
  - audit_conclusion_source: rule | ai | manual
  - preview_anomalies_json: schema v1 { "schema": 1, "items": [...] } (see app INVOICE_AUDIT_PREVIEW_ANOMALIES_SCHEMA)
  Backfill report_title, audit_conclusion_text, preview_anomalies_json where possible.
  Wrap legacy bare JSON arrays as schema v1.
*/

ALTER TABLE public.invoice_audit_reports
  ADD COLUMN IF NOT EXISTS audit_conclusion_source text;

COMMENT ON COLUMN public.invoice_audit_reports.audit_conclusion_source IS
  'Source of audit_conclusion_text: rule=template, ai=AI, manual=human.';
COMMENT ON COLUMN public.invoice_audit_reports.preview_anomalies_json IS
  'Anomaly summary JSON: schema v1 {"schema":1,"items":[{rule_code,severity,message_zh,message_en}]}; legacy bare arrays supported.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invoice_audit_reports_audit_conclusion_source_check'
  ) THEN
    ALTER TABLE public.invoice_audit_reports
      ADD CONSTRAINT invoice_audit_reports_audit_conclusion_source_check
      CHECK (
        audit_conclusion_source IS NULL
        OR audit_conclusion_source IN ('rule', 'ai', 'manual')
      );
  END IF;
END;
$$;

-- 1) Default Chinese report title (aligns with buildDefaultInvoiceAuditReportTitle zh)
UPDATE public.invoice_audit_reports r
SET report_title = trim(p.name) || ' · ' || r.fiscal_year::text || '年' || r.month::text || '月 · 异常发票审计报告'
FROM public.properties p
WHERE p.id = r.property_id
  AND (r.report_title IS NULL OR trim(r.report_title) = '');

-- 2) Audit conclusion + source (Chinese template; aligns with buildAuditConclusionFromSummaries zh)
UPDATE public.invoice_audit_reports r
SET
  audit_conclusion_text = format(
    '本报告共收录 %s 笔审计异常发票，涉及金额合计 $%s；规则命中高风险 %s 条，规则命中总次数 %s 次（单笔可含多条）。请在会议中结合附件与供应商说明逐项核对。',
    COALESCE(r.summary_invoice_count, 0)::text,
    trim(to_char(COALESCE(r.summary_total_amount, 0), 'FM999999990.00')),
    (
      SELECT count(*)::text
      FROM public.invoice_anomalies ia
      INNER JOIN public.invoices i ON i.id = ia.invoice_id
      WHERE ia.property_id = r.property_id
        AND ia.severity = 'high'
        AND COALESCE(i.is_abnormal, false) = true
        AND date_trunc('month', i.invoice_date::date) = make_date(r.fiscal_year, r.month, 1)
    ),
    (
      SELECT count(*)::text
      FROM public.invoice_anomalies ia
      INNER JOIN public.invoices i ON i.id = ia.invoice_id
      WHERE ia.property_id = r.property_id
        AND COALESCE(i.is_abnormal, false) = true
        AND date_trunc('month', i.invoice_date::date) = make_date(r.fiscal_year, r.month, 1)
    )
  ),
  audit_conclusion_source = 'rule'
WHERE r.audit_conclusion_text IS NULL
  AND r.summary_invoice_count IS NOT NULL;

-- 3) Preview JSON (schema v1): top 3 rule hits in report month window
UPDATE public.invoice_audit_reports r
SET preview_anomalies_json = (
  WITH ranked AS (
    SELECT
      ia.rule_code,
      ia.severity,
      ia.message_zh,
      ia.message_en,
      ROW_NUMBER() OVER (
        ORDER BY CASE ia.severity WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, ia.id
      ) AS rn
    FROM public.invoice_anomalies ia
    INNER JOIN public.invoices i ON i.id = ia.invoice_id
    WHERE ia.property_id = r.property_id
      AND COALESCE(i.is_abnormal, false) = true
      AND date_trunc('month', i.invoice_date::date) = make_date(r.fiscal_year, r.month, 1)
  )
  SELECT jsonb_build_object(
    'schema', 1,
    'items', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'rule_code', ranked.rule_code,
            'severity', ranked.severity,
            'message_zh', ranked.message_zh,
            'message_en', ranked.message_en
          ) ORDER BY ranked.rn
        )
        FROM ranked
        WHERE ranked.rn <= 3
      ),
      '[]'::jsonb
    )
  )
)
WHERE r.preview_anomalies_json IS NULL;

-- 4) Wrap legacy bare arrays as schema v1 (do not overwrite object rows)
UPDATE public.invoice_audit_reports
SET preview_anomalies_json = jsonb_build_object(
  'schema', 1,
  'items', CASE WHEN jsonb_typeof(preview_anomalies_json) = 'array' THEN preview_anomalies_json ELSE '[]'::jsonb END
)
WHERE preview_anomalies_json IS NOT NULL
  AND jsonb_typeof(preview_anomalies_json) = 'array';

-- Rows with conclusion text but no source (e.g. generated between 051 and 061)
UPDATE public.invoice_audit_reports
SET audit_conclusion_source = 'rule'
WHERE audit_conclusion_text IS NOT NULL
  AND audit_conclusion_source IS NULL;
