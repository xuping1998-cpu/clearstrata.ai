/*
  invoice_audit_reports:
  - rename file_url to storage_path
  - month / fiscal_year mean the month covered by the report data
  - email fields: email_status / emailed_at / emailed_to
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invoice_audit_reports'
      AND column_name = 'file_url'
  ) THEN
    ALTER TABLE public.invoice_audit_reports
      RENAME COLUMN file_url TO storage_path;
  END IF;
END;
$$;

COMMENT ON COLUMN public.invoice_audit_reports.storage_path IS
  'Object path inside Storage bucket invoice-audit-reports (relative to bucket root, not a public URL).';

COMMENT ON COLUMN public.invoice_audit_reports.fiscal_year IS
  'Calendar year of the report window: from invoice_date of invoices in this report (typically the calendar year of the latest invoice_date in the batch).';

COMMENT ON COLUMN public.invoice_audit_reports.month IS
  'Calendar month 1-12 of the report window: from invoice_date in the report (typically the month of the latest invoice_date in the batch).';

ALTER TABLE public.invoice_audit_reports
  ADD COLUMN IF NOT EXISTS email_status text NOT NULL DEFAULT 'none';

ALTER TABLE public.invoice_audit_reports
  ADD COLUMN IF NOT EXISTS emailed_at timestamptz;

ALTER TABLE public.invoice_audit_reports
  ADD COLUMN IF NOT EXISTS emailed_to text;

ALTER TABLE public.invoice_audit_reports DROP CONSTRAINT IF EXISTS invoice_audit_reports_email_status_check;

ALTER TABLE public.invoice_audit_reports ADD CONSTRAINT invoice_audit_reports_email_status_check
  CHECK (email_status IN ('none', 'pending', 'sent', 'failed'));

COMMENT ON COLUMN public.invoice_audit_reports.email_status IS
  'Email delivery state: none | pending | sent | failed';
COMMENT ON COLUMN public.invoice_audit_reports.emailed_at IS
  'Timestamp of the last successful send (if any).';
COMMENT ON COLUMN public.invoice_audit_reports.emailed_to IS
  'Recipient mailbox list, comma-separated.';

CREATE INDEX IF NOT EXISTS idx_invoice_audit_reports_property_fy_month
  ON public.invoice_audit_reports (property_id, fiscal_year DESC, month DESC);
