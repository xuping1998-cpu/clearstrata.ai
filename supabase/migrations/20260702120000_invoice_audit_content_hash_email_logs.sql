/*
  invoice_audit_reports:
  - content_hash: PDF SHA-256
  - report_version: generation sequence number, default 1

  invoice_audit_report_email_logs:
  - independent email delivery logs
  - replaces long-term reliance on comma-separated emailed_to
*/

ALTER TABLE public.invoice_audit_reports
  ADD COLUMN IF NOT EXISTS content_hash text;

ALTER TABLE public.invoice_audit_reports
  ADD COLUMN IF NOT EXISTS report_version int NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.invoice_audit_reports.content_hash IS
  'SHA-256 of the PDF file (hex), for deduplication and version comparison.';
COMMENT ON COLUMN public.invoice_audit_reports.report_version IS
  'Report generation sequence for this row; increment when the same property regenerates (API default 1; bump logic can follow).';

COMMENT ON COLUMN public.invoice_audit_reports.emailed_to IS
  'Summary of recipients from the last successful send (comma-separated); full history lives in invoice_audit_report_email_logs.';

CREATE TABLE IF NOT EXISTS public.invoice_audit_report_email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.invoice_audit_reports(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now(),
  recipients jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL CHECK (status IN ('sent', 'failed')),
  provider text,
  provider_message_id text,
  error_message text,
  triggered_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.invoice_audit_report_email_logs IS
  'Email send history for audit reports; use instead of storing long-term detail only on invoice_audit_reports.emailed_to.';

CREATE INDEX IF NOT EXISTS idx_invoice_audit_email_logs_report
  ON public.invoice_audit_report_email_logs (report_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoice_audit_email_logs_property
  ON public.invoice_audit_report_email_logs (property_id, created_at DESC);

ALTER TABLE public.invoice_audit_report_email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "iael_select_staff"
  ON public.invoice_audit_report_email_logs FOR SELECT TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = invoice_audit_report_email_logs.property_id
        AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
    )
  );

-- Service role only for writes; no client INSERT/UPDATE policies
