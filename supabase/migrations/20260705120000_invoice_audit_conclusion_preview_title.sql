/*
  invoice_audit_reports:
  - audit_conclusion_text, preview_anomalies_json, report_title (meeting / PDF)
  Deploy after 20260704120000; safe if 041 used DELETE policies (additive columns + sync)
*/

ALTER TABLE public.invoice_audit_reports
  ADD COLUMN IF NOT EXISTS audit_conclusion_text text;

ALTER TABLE public.invoice_audit_reports
  ADD COLUMN IF NOT EXISTS preview_anomalies_json jsonb;

ALTER TABLE public.invoice_audit_reports
  ADD COLUMN IF NOT EXISTS report_title text;

COMMENT ON COLUMN public.invoice_audit_reports.audit_conclusion_text IS
  'Snapshot at generation: human-readable audit conclusion for meetings.';
COMMENT ON COLUMN public.invoice_audit_reports.preview_anomalies_json IS
  'Snapshot at generation: up to 3 anomaly rule summaries (JSON array).';
COMMENT ON COLUMN public.invoice_audit_reports.report_title IS
  'Formal meeting document title; used as PDF cover main title when set.';

-- Re-align email log rows with parent report_version after 041 renumbering (idempotent)
UPDATE public.invoice_audit_report_email_logs l
SET report_version = r.report_version
FROM public.invoice_audit_reports r
WHERE l.report_id = r.id
  AND (l.report_version IS DISTINCT FROM r.report_version);
