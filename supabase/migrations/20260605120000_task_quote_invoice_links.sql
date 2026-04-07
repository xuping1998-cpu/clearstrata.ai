/*
  链路：manager_tasks → procurement（报价）→ invoices（财务审批）
  - procurement_jobs / procurement_quotes：关联 task_id
  - invoices：related_task_id、quote_id
*/

ALTER TABLE public.procurement_jobs
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.manager_tasks(id) ON DELETE SET NULL;

ALTER TABLE public.procurement_quotes
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.manager_tasks(id) ON DELETE SET NULL;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS related_task_id uuid REFERENCES public.manager_tasks(id) ON DELETE SET NULL;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.procurement_quotes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_procurement_jobs_task ON public.procurement_jobs(task_id);
CREATE INDEX IF NOT EXISTS idx_procurement_quotes_task ON public.procurement_quotes(task_id);
CREATE INDEX IF NOT EXISTS idx_invoices_related_task ON public.invoices(related_task_id);
CREATE INDEX IF NOT EXISTS idx_invoices_quote ON public.invoices(quote_id);

COMMENT ON COLUMN public.procurement_jobs.task_id IS '关联物业经理任务（为什么要做）';
COMMENT ON COLUMN public.procurement_quotes.task_id IS '关联物业经理任务（与 job 一致时可冗余）';
COMMENT ON COLUMN public.invoices.related_task_id IS '来源任务（与 task_invoices 互补）';
COMMENT ON COLUMN public.invoices.quote_id IS '对应已批准报价，用于对比实际金额';

-- 已有报价：从 job 回填 task_id（若 job 已有 task_id）
UPDATE public.procurement_quotes q
SET task_id = j.task_id
FROM public.procurement_jobs j
WHERE q.job_id = j.id
  AND j.task_id IS NOT NULL
  AND (q.task_id IS DISTINCT FROM j.task_id);

NOTIFY pgrst, 'reload schema';
