/*
  任务 ↔ 发票多对多（统一引用 public.invoices，不复制金额）
  保留 manager_tasks.related_invoice_id 作为单字段快捷关联；本表支持多发票。
*/

CREATE TABLE IF NOT EXISTS public.task_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.manager_tasks(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_task_invoices_task_invoice UNIQUE (task_id, invoice_id)
);

CREATE INDEX IF NOT EXISTS idx_task_invoices_task ON public.task_invoices(task_id);
CREATE INDEX IF NOT EXISTS idx_task_invoices_invoice ON public.task_invoices(invoice_id);

COMMENT ON TABLE public.task_invoices IS '任务与发票关联（多对多）；财务统计仍只读 invoices 表';

ALTER TABLE public.task_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ti_select_tenant"
  ON public.task_invoices FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.manager_tasks mt
      WHERE mt.id = task_invoices.task_id
        AND mt.property_id IN (SELECT public.user_property_ids())
    )
  );

CREATE POLICY "ti_insert_staff"
  ON public.task_invoices FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.manager_tasks mt
      INNER JOIN public.invoices inv ON inv.id = task_invoices.invoice_id
      WHERE mt.id = task_invoices.task_id
        AND mt.property_id = inv.property_id
        AND mt.property_id IN (SELECT public.user_property_ids())
        AND EXISTS (
          SELECT 1 FROM public.property_members pm
          WHERE pm.user_id = (SELECT auth.uid())
            AND pm.property_id = mt.property_id
            AND pm.status = 'active'::member_status
            AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
        )
    )
  );

CREATE POLICY "ti_delete_staff"
  ON public.task_invoices FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.manager_tasks mt
      WHERE mt.id = task_invoices.task_id
        AND mt.property_id IN (SELECT public.user_property_ids())
        AND EXISTS (
          SELECT 1 FROM public.property_members pm
          WHERE pm.user_id = (SELECT auth.uid())
            AND pm.property_id = mt.property_id
            AND pm.status = 'active'::member_status
            AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
        )
    )
  );

-- 回填：已有 related_invoice_id 写入 task_invoices（幂等）
INSERT INTO public.task_invoices (task_id, invoice_id)
SELECT mt.id, mt.related_invoice_id
FROM public.manager_tasks mt
WHERE mt.related_invoice_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = mt.related_invoice_id AND i.property_id = mt.property_id)
ON CONFLICT (task_id, invoice_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
