/*
  Manager task timeline columns.
  Adds priority, due date, and related invoice fields.
  Adds title, category, and related invoice fields to manager_logs.
*/

ALTER TABLE public.manager_tasks
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS due_date timestamptz,
  ADD COLUMN IF NOT EXISTS related_invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.manager_tasks.priority IS 'Task priority: normal / high / urgent';
COMMENT ON COLUMN public.manager_tasks.due_date IS 'Task due date';
COMMENT ON COLUMN public.manager_tasks.related_invoice_id IS 'Invoice directly linked to the task';

ALTER TABLE public.manager_logs
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS related_invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.manager_logs.title IS 'Optional log title';
COMMENT ON COLUMN public.manager_logs.category IS 'Log category';
COMMENT ON COLUMN public.manager_logs.related_invoice_id IS 'Invoice linked to the log timeline entry';

CREATE INDEX IF NOT EXISTS idx_manager_tasks_related_invoice
  ON public.manager_tasks(related_invoice_id)
  WHERE related_invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_manager_logs_related_invoice
  ON public.manager_logs(related_invoice_id)
  WHERE related_invoice_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';


