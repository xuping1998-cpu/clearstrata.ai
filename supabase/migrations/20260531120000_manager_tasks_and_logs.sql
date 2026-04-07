/*
  Property manager unified tasks + logs.
  - task_type includes dispute (纠纷调解并入任务体系)
  - dispute_status / dispute_result 仅当 task_type = dispute 时使用
  - manager_logs.task_id 关联处理过程
*/

CREATE TABLE IF NOT EXISTS public.manager_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  task_type text NOT NULL CHECK (task_type IN ('repair', 'vendor', 'invoice_review', 'dispute')),
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  dispute_status text,
  dispute_result text,
  source_dispute_id uuid UNIQUE REFERENCES public.disputes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.manager_tasks IS '物业经理任务：维修、供应商、发票审核、纠纷调解等';
COMMENT ON COLUMN public.manager_tasks.dispute_status IS '纠纷当前状态（与 task_type=dispute 配套）';
COMMENT ON COLUMN public.manager_tasks.dispute_result IS '纠纷处理结果说明';
COMMENT ON COLUMN public.manager_tasks.source_dispute_id IS '回填自 disputes.id，避免重复迁移';

CREATE INDEX IF NOT EXISTS idx_manager_tasks_property ON public.manager_tasks(property_id);
CREATE INDEX IF NOT EXISTS idx_manager_tasks_type ON public.manager_tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_manager_tasks_created ON public.manager_tasks(created_at DESC);

CREATE TABLE IF NOT EXISTS public.manager_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.manager_tasks(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manager_logs_task ON public.manager_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_manager_logs_property ON public.manager_logs(property_id);

ALTER TABLE public.manager_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_logs ENABLE ROW LEVEL SECURITY;

-- RLS: 同物业成员可读；创建人可建任务；创建人/被指派人/职员可更新任务
CREATE POLICY "mt_select_tenant"
  ON public.manager_tasks FOR SELECT TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "mt_insert_member"
  ON public.manager_tasks FOR INSERT TO authenticated
  WITH CHECK (
    property_id IN (SELECT public.user_property_ids())
    AND created_by = (SELECT auth.uid())
  );

CREATE POLICY "mt_update_scope"
  ON public.manager_tasks FOR UPDATE TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND (
      created_by = (SELECT auth.uid())
      OR assigned_to = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.property_members pm
        WHERE pm.user_id = (SELECT auth.uid())
          AND pm.property_id = manager_tasks.property_id
          AND pm.status = 'active'::member_status
          AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
      )
    )
  )
  WITH CHECK (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "ml_select_tenant"
  ON public.manager_logs FOR SELECT TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "ml_insert_member"
  ON public.manager_logs FOR INSERT TO authenticated
  WITH CHECK (
    property_id IN (SELECT public.user_property_ids())
    AND author_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.manager_tasks t
      WHERE t.id = manager_logs.task_id
        AND t.property_id = manager_logs.property_id
    )
  );

-- 一次性：从 disputes 回填为 dispute 任务（若尚未存在对应 source_dispute_id）
INSERT INTO public.manager_tasks (
  property_id,
  task_type,
  title,
  description,
  dispute_status,
  dispute_result,
  status,
  created_by,
  source_dispute_id,
  created_at
)
SELECT
  d.property_id,
  'dispute',
  COALESCE(NULLIF(btrim(COALESCE(d.title_zh, '')), ''), d.title_en),
  COALESCE(NULLIF(btrim(COALESCE(d.description_zh, '')), ''), d.description_en),
  d.status,
  COALESCE(NULLIF(btrim(COALESCE(d.resolution_zh, '')), ''), d.resolution_en),
  CASE
    WHEN d.status IN ('resolved', 'closed') THEN 'done'
    WHEN d.status IN ('pending', 'manager_reviewing', 'manager_mediating') THEN 'open'
    ELSE 'in_progress'
  END,
  d.reporter_id,
  d.id,
  d.created_at
FROM public.disputes d
WHERE NOT EXISTS (
  SELECT 1 FROM public.manager_tasks m WHERE m.source_dispute_id = d.id
);

NOTIFY pgrst, 'reload schema';
