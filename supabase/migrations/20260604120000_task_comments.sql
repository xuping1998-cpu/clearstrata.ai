/*
  Task comments, approval notes, council feedback, and manager updates.
*/

CREATE TABLE IF NOT EXISTS public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.manager_tasks(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  comment_type text NOT NULL DEFAULT 'comment'
    CHECK (comment_type IN ('comment', 'approval_note', 'council_feedback', 'manager_update')),
  content text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task
  ON public.task_comments(task_id);

CREATE INDEX IF NOT EXISTS idx_task_comments_property
  ON public.task_comments(property_id);

COMMENT ON TABLE public.task_comments IS 'Task comments, approval notes, council feedback, and manager updates';

CREATE OR REPLACE FUNCTION public.set_task_comments_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_task_comments_updated_at ON public.task_comments;

CREATE TRIGGER trg_task_comments_updated_at
BEFORE UPDATE ON public.task_comments
FOR EACH ROW
EXECUTE FUNCTION public.set_task_comments_updated_at();

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tc_select_tenant" ON public.task_comments;
CREATE POLICY "tc_select_tenant"
  ON public.task_comments
  FOR SELECT
  TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
  );

DROP POLICY IF EXISTS "tc_insert_staff" ON public.task_comments;
CREATE POLICY "tc_insert_staff"
  ON public.task_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    property_id IN (SELECT public.user_property_ids())
    AND author_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = task_comments.property_id
        AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
    )
    AND EXISTS (
      SELECT 1
      FROM public.manager_tasks t
      WHERE t.id = task_comments.task_id
        AND t.property_id = task_comments.property_id
    )
  );

NOTIFY pgrst, 'reload schema';



