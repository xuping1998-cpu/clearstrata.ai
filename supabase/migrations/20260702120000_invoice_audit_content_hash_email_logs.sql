/*
  invoice_audit_reports：content_hash（PDF SHA-256）、report_version（生成序号，默认 1）
  invoice_audit_report_email_logs：独立邮件发送日志（替代长期仅用 emailed_to 逗号分隔）
*/

ALTER TABLE public.invoice_audit_reports
  ADD COLUMN IF NOT EXISTS content_hash text;

ALTER TABLE public.invoice_audit_reports
  ADD COLUMN IF NOT EXISTS report_version int NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.invoice_audit_reports.content_hash IS 'PDF 文件 SHA-256（hex），用于识别重复生成与比对版本';
COMMENT ON COLUMN public.invoice_audit_reports.report_version IS '报告行版本号；同物业多次生成可递增（当前 API 默认 1，后续可接 bump 逻辑）';

COMMENT ON COLUMN public.invoice_audit_reports.emailed_to IS '最近一次成功发送的收件人摘要（逗号分隔）；完整历史见 invoice_audit_report_email_logs';

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

COMMENT ON TABLE public.invoice_audit_report_email_logs IS '审计报告邮件发送历史；替代主表 emailed_to 的长期存储需求';

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
        AND pm.status = 'active'::member_status
        AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
    )
  );

-- 仅服务端写入；客户端无 INSERT/UPDATE
