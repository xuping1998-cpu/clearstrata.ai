/*
  Task attachments table and storage policies.
*/

CREATE OR REPLACE FUNCTION public.task_attachment_storage_property_id(object_name text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  m text[];
BEGIN
  m := regexp_match(object_name, '^property-([0-9a-f-]{36})/');
  IF m IS NULL OR m[1] IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN m[1]::uuid;
END;
$$;

CREATE TABLE IF NOT EXISTS public.task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.manager_tasks(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_name text NOT NULL DEFAULT '',
  file_path text NOT NULL UNIQUE,
  mime_type text,
  file_size bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_attachments_task
  ON public.task_attachments(task_id);

CREATE INDEX IF NOT EXISTS idx_task_attachments_property
  ON public.task_attachments(property_id);

ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ta_select_tenant" ON public.task_attachments;
CREATE POLICY "ta_select_tenant"
  ON public.task_attachments
  FOR SELECT
  TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
  );

DROP POLICY IF EXISTS "ta_insert_owner_or_staff" ON public.task_attachments;
CREATE POLICY "ta_insert_owner_or_staff"
  ON public.task_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    property_id IN (SELECT public.user_property_ids())
    AND uploaded_by = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "ta_delete_staff" ON public.task_attachments;
CREATE POLICY "ta_delete_staff"
  ON public.task_attachments
  FOR DELETE
  TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND (
      uploaded_by = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.property_members pm
        WHERE pm.user_id = (SELECT auth.uid())
          AND pm.property_id = task_attachments.property_id
          AND pm.status = 'active'
          AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
      )
    )
  );

INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "task_attachments_storage_select" ON storage.objects;
CREATE POLICY "task_attachments_storage_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'task-attachments'
    AND public.task_attachment_storage_property_id(name) IN (SELECT public.user_property_ids())
  );

DROP POLICY IF EXISTS "task_attachments_storage_insert" ON storage.objects;
CREATE POLICY "task_attachments_storage_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'task-attachments'
    AND public.task_attachment_storage_property_id(name) IN (SELECT public.user_property_ids())
  );

DROP POLICY IF EXISTS "task_attachments_storage_update" ON storage.objects;
CREATE POLICY "task_attachments_storage_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'task-attachments'
    AND public.task_attachment_storage_property_id(name) IN (SELECT public.user_property_ids())
  )
  WITH CHECK (
    bucket_id = 'task-attachments'
    AND public.task_attachment_storage_property_id(name) IN (SELECT public.user_property_ids())
  );

DROP POLICY IF EXISTS "task_attachments_storage_delete" ON storage.objects;
CREATE POLICY "task_attachments_storage_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'task-attachments'
    AND public.task_attachment_storage_property_id(name) IN (SELECT public.user_property_ids())
  );

NOTIFY pgrst, 'reload schema';




