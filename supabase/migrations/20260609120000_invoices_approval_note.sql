-- 发票审批通过时的备注（红色预警时必填，与驳回说明 review_notes 区分）
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS approval_note text;
COMMENT ON COLUMN public.invoices.approval_note IS '审批通过时填写的备注；异常（danger）时必填';
