/*
  invoice_audit_reports：file_url → storage_path；month/fiscal_year 语义改为「报告数据所属月份」
  邮件状态：email_status / emailed_at / emailed_to
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invoice_audit_reports'
      AND column_name = 'file_url'
  ) THEN
    ALTER TABLE public.invoice_audit_reports RENAME COLUMN file_url TO storage_path;
  END IF;
END $$;

COMMENT ON COLUMN public.invoice_audit_reports.storage_path IS 'Storage 桶 invoice-audit-reports 内对象路径（相对桶根）';

COMMENT ON COLUMN public.invoice_audit_reports.fiscal_year IS '报告数据所属「发票日期」的公历年份（取本报告内发票中最新 invoice_date 的日历年）';

COMMENT ON COLUMN public.invoice_audit_reports.month IS '报告数据所属「发票日期」的公历月份 1–12（取本报告内发票中最新 invoice_date 的月份）';

ALTER TABLE public.invoice_audit_reports
  ADD COLUMN IF NOT EXISTS email_status text NOT NULL DEFAULT 'none';

ALTER TABLE public.invoice_audit_reports
  ADD COLUMN IF NOT EXISTS emailed_at timestamptz;

ALTER TABLE public.invoice_audit_reports
  ADD COLUMN IF NOT EXISTS emailed_to text;

ALTER TABLE public.invoice_audit_reports DROP CONSTRAINT IF EXISTS invoice_audit_reports_email_status_check;

ALTER TABLE public.invoice_audit_reports ADD CONSTRAINT invoice_audit_reports_email_status_check
  CHECK (email_status IN ('none', 'pending', 'sent', 'failed'));

COMMENT ON COLUMN public.invoice_audit_reports.email_status IS 'none | pending | sent | failed';
COMMENT ON COLUMN public.invoice_audit_reports.emailed_at IS '最近一次成功发送邮件的时间';
COMMENT ON COLUMN public.invoice_audit_reports.emailed_to IS '收件人邮箱，逗号分隔';

CREATE INDEX IF NOT EXISTS idx_invoice_audit_reports_property_fy_month
  ON public.invoice_audit_reports (property_id, fiscal_year DESC, month DESC);
