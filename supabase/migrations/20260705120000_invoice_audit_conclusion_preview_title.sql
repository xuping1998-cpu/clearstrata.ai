/*
  审计结论文本、前 3 条异常预览 JSON、正式会议标题 report_title
  部署在 041 之后；若 041 已用旧 DELETE 策略，本迁移仍安全追加列并同步邮件日志版本
*/

ALTER TABLE public.invoice_audit_reports
  ADD COLUMN IF NOT EXISTS audit_conclusion_text text;

ALTER TABLE public.invoice_audit_reports
  ADD COLUMN IF NOT EXISTS preview_anomalies_json jsonb;

ALTER TABLE public.invoice_audit_reports
  ADD COLUMN IF NOT EXISTS report_title text;

COMMENT ON COLUMN public.invoice_audit_reports.audit_conclusion_text IS '生成时快照：审计结论文案（会议可读）';
COMMENT ON COLUMN public.invoice_audit_reports.preview_anomalies_json IS '生成时快照：至多 3 条异常规则摘要（JSON 数组）';
COMMENT ON COLUMN public.invoice_audit_reports.report_title IS '正式会议材料标题；PDF 封面主标题优先使用';

-- 与主表 report_version 再次对齐（041 重排后若新增行可再跑）
UPDATE public.invoice_audit_report_email_logs l
SET report_version = r.report_version
FROM public.invoice_audit_reports r
WHERE l.report_id = r.id
  AND (l.report_version IS DISTINCT FROM r.report_version);
