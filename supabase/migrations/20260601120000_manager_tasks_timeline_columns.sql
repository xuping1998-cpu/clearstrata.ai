/*
  任务详情时间线：优先级、截止时间、关联发票；日志支持标题/分类/关联发票
*/

ALTER TABLE public.manager_tasks
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS due_date timestamptz,
  ADD COLUMN IF NOT EXISTS related_invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.manager_tasks.priority IS '任务优先级，如 normal / high / urgent';
COMMENT ON COLUMN public.manager_tasks.due_date IS '截止时间';
COMMENT ON COLUMN public.manager_tasks.related_invoice_id IS '任务直接关联的发票';

ALTER TABLE public.manager_logs
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS related_invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.manager_logs.title IS '日志标题（可选，缺省可由正文摘要代替）';
COMMENT ON COLUMN public.manager_logs.category IS '日志分类';
COMMENT ON COLUMN public.manager_logs.related_invoice_id IS '日志关联的发票（纳入时间线）';

CREATE INDEX IF NOT EXISTS idx_manager_tasks_related_invoice ON public.manager_tasks(related_invoice_id)
  WHERE related_invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_manager_logs_related_invoice ON public.manager_logs(related_invoice_id)
  WHERE related_invoice_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
