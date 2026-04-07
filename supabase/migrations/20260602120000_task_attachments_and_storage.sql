/*
  任务附件：task_attachments 表 + task-attachments 存储桶
*/

CREATE OR REPLACE FUNCTION public.task_attachment_storage_property_id(object_name text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE m text[];
BEGIN
  m := regexp_match(object_name, '^property-([0-9a-f-]{36})/');
  IF m IS NULL OR m[1] IS NULL THEN RETURN NULL; END IF;
  RETURN m[1]::uuid;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1) Table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.manager_tasks(id) ON DELETE CASCADE,
  log_id uuid REFERENCES public.manager_logs(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text,
  file_size bigint,
  category text,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT task_attachments_task_or_log_chk CHECK (task_id IS NOT NULL OR log_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_task_attachments_property ON public.task_attachments(property_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON public.task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_log ON public.task_attachments(log_id);

COMMENT ON TABLE public.task_attachments IS '任务/日志附件：图片、PDF 等（Storage 路径见 file_path）';

ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ta_select_tenant"
  ON public.task_attachments FOR SELECT TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "ta_insert_staff"
  ON public.task_attachments FOR INSERT TO authenticated
  WITH CHECK (
    property_id IN (SELECT public.user_property_ids())
    AND uploaded_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = task_attachments.property_id
        AND pm.status = 'active'::member_status
        AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
    )
  );

-- ---------------------------------------------------------------------------
-- 2) Storage bucket (private; signed URLs in app)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-attachments',
  'task-attachments',
  false,
  15728640,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 15728640,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 3) Storage RLS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "task_attachments_select_member" ON storage.objects;
CREATE POLICY "task_attachments_select_member"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'task-attachments'
    AND public.task_attachment_storage_property_id(name) IN (SELECT public.user_property_ids())
  );

DROP POLICY IF EXISTS "task_attachments_insert_staff" ON storage.objects;
CREATE POLICY "task_attachments_insert_staff"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'task-attachments'
    AND public.task_attachment_storage_property_id(name) IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = public.task_attachment_storage_property_id(name)
        AND pm.status = 'active'::member_status
        AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
    )
  );

DROP POLICY IF EXISTS "task_attachments_update_staff" ON storage.objects;
CREATE POLICY "task_attachments_update_staff"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'task-attachments'
    AND public.task_attachment_storage_property_id(name) IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = public.task_attachment_storage_property_id(name)
        AND pm.status = 'active'::member_status
        AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
    )
  );

DROP POLICY IF EXISTS "task_attachments_delete_staff" ON storage.objects;
CREATE POLICY "task_attachments_delete_staff"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'task-attachments'
    AND public.task_attachment_storage_property_id(name) IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = public.task_attachment_storage_property_id(name)
        AND pm.status = 'active'::member_status
        AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
    )
  );

NOTIFY pgrst, 'reload schema';
