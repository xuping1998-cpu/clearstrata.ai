
/*
  Links manager_tasks with procurement and invoices.
  - procurement_jobs / procurement_quotes: task_id
  - invoices: related_task_id, quote_id
*/

ALTER TABLE public.procurement_jobs
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.manager_tasks(id) ON DELETE SET NULL;

ALTER TABLE public.procurement_quotes
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.manager_tasks(id) ON DELETE SET NULL;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS related_task_id uuid REFERENCES public.manager_tasks(id) ON DELETE SET NULL;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.procurement_quotes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_procurement_jobs_task
  ON public.procurement_jobs(task_id);

CREATE INDEX IF NOT EXISTS idx_procurement_quotes_task
  ON public.procurement_quotes(task_id);

CREATE INDEX IF NOT EXISTS idx_invoices_related_task
  ON public.invoices(related_task_id);

CREATE INDEX IF NOT EXISTS idx_invoices_quote
  ON public.invoices(quote_id);

COMMENT ON COLUMN public.procurement_jobs.task_id IS 'Linked manager task';
COMMENT ON COLUMN public.procurement_quotes.task_id IS 'Linked manager task, may mirror procurement_jobs.task_id';
COMMENT ON COLUMN public.invoices.related_task_id IS 'Related source task';
COMMENT ON COLUMN public.invoices.quote_id IS 'Approved quote linked for amount comparison';

-- Backfill quote.task_id from procurement_jobs.task_id
UPDATE public.procurement_quotes q
SET task_id = j.task_id
FROM public.procurement_jobs j
WHERE q.job_id = j.id
  AND j.task_id IS NOT NULL
  AND q.task_id IS DISTINCT FROM j.task_id;

NOTIFY pgrst, 'reload schema';


