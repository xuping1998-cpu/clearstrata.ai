/*
  归档摘要字段、会议备注、唯一约束、content_hash 索引
  email_logs.report_version 冗余字段
*/

-- 摘要（生成时快照）
ALTER TABLE public.invoice_audit_reports
  ADD COLUMN IF NOT EXISTS summary_invoice_count int;

ALTER TABLE public.invoice_audit_reports
  ADD COLUMN IF NOT EXISTS summary_total_amount numeric(14, 2);

ALTER TABLE public.invoice_audit_reports
  ADD COLUMN IF NOT EXISTS summary_high_risk_count int;

ALTER TABLE public.invoice_audit_reports
  ADD COLUMN IF NOT EXISTS meeting_notes text;

COMMENT ON COLUMN public.invoice_audit_reports.summary_invoice_count IS '生成时快照：异常发票笔数';
COMMENT ON COLUMN public.invoice_audit_reports.summary_total_amount IS '生成时快照：异常发票金额合计';
COMMENT ON COLUMN public.invoice_audit_reports.summary_high_risk_count IS '生成时快照：高危规则命中条数（anomalies.severity=high）';
COMMENT ON COLUMN public.invoice_audit_reports.meeting_notes IS '会议/呈报附说明，生成时写入，可出现在 PDF 与详情';

UPDATE public.invoice_audit_reports SET report_version = 1 WHERE report_version IS NULL;

-- 保留全部历史行：按 (property_id, fiscal_year, month) 重排 report_version 为 1..n（按创建时间），再建唯一索引
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

-- 邮件日志冗余 report 版本
ALTER TABLE public.invoice_audit_report_email_logs
  ADD COLUMN IF NOT EXISTS report_version int;

COMMENT ON COLUMN public.invoice_audit_report_email_logs.report_version IS '冗余 invoice_audit_reports.report_version，便于按版本筛选与展示';

UPDATE public.invoice_audit_report_email_logs l
SET report_version = r.report_version
FROM public.invoice_audit_reports r
WHERE l.report_id = r.id
  AND l.report_version IS NULL;
