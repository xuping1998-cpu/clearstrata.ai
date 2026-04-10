/*
  invoice_audit_reports:
  - preview_anomalies_schema_version: schema version for preview_anomalies_json (currently 1)
  - NULL column treated as version 1 in app when reading legacy rows
  - Normalize JSON: prefer {"items":[...]}; migrate bare arrays / legacy objects with top-level "schema"
  - Backfill report_title, audit_conclusion_text (summary_* only), preview, schema_version, audit_conclusion_source
*/

ALTER TABLE public.invoice_audit_reports
  ADD COLUMN IF NOT EXISTS preview_anomalies_schema_version int;

COMMENT ON COLUMN public.invoice_audit_reports.preview_anomalies_schema_version IS
  'Schema version for preview_anomalies_json (currently 1); distinct from optional embedded schema key in JSON.';

COMMENT ON COLUMN public.invoice_audit_reports.preview_anomalies_json IS
  'Anomaly summary JSON v1: {"items":[{rule_code,severity,message_zh,message_en}]}; legacy bare array or old object shapes supported.';

UPDATE public.invoice_audit_reports
SET preview_anomalies_schema_version = 1
WHERE preview_anomalies_schema_version IS NULL;

-- Bare array -> {"items": [...]}
UPDATE public.invoice_audit_reports
SET
  preview_anomalies_json = jsonb_build_object(
    'items',
    CASE WHEN jsonb_typeof(preview_anomalies_json) = 'array' THEN preview_anomalies_json ELSE '[]'::jsonb END
  ),
  preview_anomalies_schema_version = 1
WHERE preview_anomalies_json IS NOT NULL
  AND jsonb_typeof(preview_anomalies_json) = 'array';

-- Legacy object with top-level "schema": keep items only (version tracked on column)
UPDATE public.invoice_audit_reports
SET
  preview_anomalies_json = jsonb_build_object(
    'items',
    COALESCE(preview_anomalies_json->'items', '[]'::jsonb)
  ),
  preview_anomalies_schema_version = 1
WHERE preview_anomalies_json IS NOT NULL
  AND jsonb_typeof(preview_anomalies_json) = 'object'
  AND preview_anomalies_json ? 'schema';

-- a) report_title: {fiscal_year}年{month}月异常发票审计报告
UPDATE public.invoice_audit_reports
SET report_title = fiscal_year::text || '年' || month::text || '月异常发票审计报告'
WHERE report_title IS NULL OR trim(report_title) = '';

-- b) audit_conclusion_text from summary_* only
UPDATE public.invoice_audit_reports r
SET
  audit_conclusion_text = format(
    '本报告共收录 %s 笔审计异常发票，涉及金额合计 $%s；高危规则命中 %s 条。请在会议中结合附件与供应商说明逐项核对。',
    COALESCE(r.summary_invoice_count, 0)::text,
    trim(to_char(COALESCE(r.summary_total_amount, 0), 'FM999999990.00')),
    COALESCE(r.summary_high_risk_count, 0)::text
  ),
  audit_conclusion_source = 'rule'
WHERE r.audit_conclusion_text IS NULL
  AND r.summary_invoice_count IS NOT NULL;

-- c) preview_anomalies_json top 3 hits; d) schema_version = 1; e) source = rule
UPDATE public.invoice_audit_reports r
SET
  preview_anomalies_json = (
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
  ),
  preview_anomalies_schema_version = 1
WHERE r.preview_anomalies_json IS NULL;

UPDATE public.invoice_audit_reports
SET audit_conclusion_source = 'rule'
WHERE audit_conclusion_text IS NOT NULL
  AND audit_conclusion_source IS NULL;

UPDATE public.invoice_audit_reports
SET preview_anomalies_schema_version = 1
WHERE preview_anomalies_schema_version IS NULL;
