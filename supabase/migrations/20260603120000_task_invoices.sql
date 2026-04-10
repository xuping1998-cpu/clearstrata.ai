/*
  Task-to-invoice many-to-many links.
  Keeps manager_tasks.related_invoice_id as a shortcut field.
  This table supports linking one task to multiple invoices.
*/

CREATE TABLE IF NOT EXISTS public.task_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.manager_tasks(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_task_invoices_task_invoice UNIQUE (task_id, invoice_id)
);

CREATE INDEX IF NOT EXISTS idx_task_invoices_task
  ON public.task_invoices(task_id);

CREATE INDEX IF NOT EXISTS idx_task_invoices_invoice
  ON public.task_invoices(invoice_id);

COMMENT ON TABLE public.task_invoices IS 'Task-to-invoice links. Financial totals still read from invoices only.';

ALTER TABLE public.task_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ti_select_tenant" ON public.task_invoices;
CREATE POLICY "ti_select_tenant"
  ON public.task_invoices
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.manager_tasks mt
      WHERE mt.id = task_invoices.task_id
        AND mt.property_id IN (SELECT public.user_property_ids())
    )
  );

DROP POLICY IF EXISTS "ti_insert_staff" ON public.task_invoices;
CREATE POLICY "ti_insert_staff"
  ON public.task_invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.manager_tasks mt
      WHERE mt.id = task_invoices.task_id
        AND mt.property_id IN (SELECT public.user_property_ids())
        AND EXISTS (
          SELECT 1
          FROM public.property_members pm
          WHERE pm.user_id = (SELECT auth.uid())
            AND pm.property_id = mt.property_id
            AND pm.status = 'active'
            AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
        )
    )
    AND EXISTS (
      SELECT 1
      FROM public.invoices inv
      WHERE inv.id = task_invoices.invoice_id
    )
  );

DROP POLICY IF EXISTS "ti_delete_staff" ON public.task_invoices;
CREATE POLICY "ti_delete_staff"
  ON public.task_invoices
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.manager_tasks mt
      WHERE mt.id = task_invoices.task_id
        AND mt.property_id IN (SELECT public.user_property_ids())
        AND EXISTS (
          SELECT 1
          FROM public.property_members pm
          WHERE pm.user_id = (SELECT auth.uid())
            AND pm.property_id = mt.property_id
            AND pm.status = 'active'
            AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
        )
    )
  );

-- Backfill existing manager_tasks.related_invoice_id into task_invoices
INSERT INTO public.task_invoices (task_id, invoice_id)
SELECT mt.id, mt.related_invoice_id
FROM public.manager_tasks mt
WHERE mt.related_invoice_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.invoices i
    WHERE i.id = mt.related_invoice_id
  )
ON CONFLICT (task_id, invoice_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';