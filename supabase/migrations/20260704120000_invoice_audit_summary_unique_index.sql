/*
  ?????????????????content_hash ??
  email_logs.report_version ????
  ??????
*/

-- ?????????
ALTER TABLE public.invoice_audit_reports
  ADD COLUMN IF NOT EXISTS summary_invoice_count int;

ALTER TABLE public.invoice_audit_reports
  ADD COLUMN IF NOT EXISTS summary_total_amount numeric(14, 2);

ALTER TABLE public.invoice_audit_reports
  ADD COLUMN IF NOT EXISTS summary_high_risk_count int;

ALTER TABLE public.invoice_audit_reports
  ADD COLUMN IF NOT EXISTS meeting_notes text;

COMMENT ON COLUMN public.invoice_audit_reports.summary_invoice_count IS
  'Snapshot at generation: number of abnormal invoices in the report.';
COMMENT ON COLUMN public.invoice_audit_reports.summary_total_amount IS
  'Snapshot at generation: sum of abnormal invoice amounts.';
COMMENT ON COLUMN public.invoice_audit_reports.summary_high_risk_count IS
  'Snapshot at generation: count of high-severity rule hits (e.g. anomalies.severity = high).';
COMMENT ON COLUMN public.invoice_audit_reports.meeting_notes IS
  'Meeting or board-pack notes captured at generation; may appear on PDF and in detail UI.';

UPDATE public.invoice_audit_reports SET report_version = 1 WHERE report_version IS NULL;

-- Keep all historical rows: renumber report_version to 1..n per (property_id, fiscal_year, month) by created_at, then unique index
DROP INDEX IF EXISTS public.invoice_audit_reports_prop_fy_month_ver_uniq;

UPDATE public.invoice_audit_reports t
SET report_version = sub.new_ver
FROM (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY property_id, fiscal_year, month
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS new_ver
  FROM public.invoice_audit_reports
) sub
WHERE t.id = sub.id;

CREATE UNIQUE INDEX IF NOT EXISTS invoice_audit_reports_prop_fy_month_ver_uniq
  ON public.invoice_audit_reports (property_id, fiscal_year, month, report_version);

CREATE INDEX IF NOT EXISTS idx_invoice_audit_reports_content_hash
  ON public.invoice_audit_reports (content_hash)
  WHERE content_hash IS NOT NULL;

-- Email log: redundant report version for filtering and display
ALTER TABLE public.invoice_audit_report_email_logs
  ADD COLUMN IF NOT EXISTS report_version int;

COMMENT ON COLUMN public.invoice_audit_report_email_logs.report_version IS
  'Denormalized invoice_audit_reports.report_version for filtering and display.';

UPDATE public.invoice_audit_report_email_logs l
SET report_version = r.report_version
FROM public.invoice_audit_reports r
WHERE l.report_id = r.id
  AND l.report_version IS NULL;
