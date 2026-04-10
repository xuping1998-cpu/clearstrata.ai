CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.manager_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  task_type text NOT NULL,
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

ALTER TABLE public.manager_tasks
  ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS task_type text,
  ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dispute_status text,
  ADD COLUMN IF NOT EXISTS dispute_result text,
  ADD COLUMN IF NOT EXISTS source_dispute_id uuid UNIQUE REFERENCES public.disputes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'manager_tasks_task_type_check'
      AND conrelid = 'public.manager_tasks'::regclass
  ) THEN
    ALTER TABLE public.manager_tasks
      ADD CONSTRAINT manager_tasks_task_type_check
      CHECK (task_type IN ('repair', 'vendor', 'invoice_review', 'dispute'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'manager_tasks_status_check'
      AND conrelid = 'public.manager_tasks'::regclass
  ) THEN
    ALTER TABLE public.manager_tasks
      ADD CONSTRAINT manager_tasks_status_check
      CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'cancelled'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_manager_tasks_property_id
  ON public.manager_tasks(property_id);

CREATE INDEX IF NOT EXISTS idx_manager_tasks_task_type
  ON public.manager_tasks(task_type);

CREATE INDEX IF NOT EXISTS idx_manager_tasks_status
  ON public.manager_tasks(status);

CREATE INDEX IF NOT EXISTS idx_manager_tasks_assigned_to
  ON public.manager_tasks(assigned_to);

CREATE INDEX IF NOT EXISTS idx_manager_tasks_created_by
  ON public.manager_tasks(created_by);

CREATE INDEX IF NOT EXISTS idx_manager_tasks_source_dispute_id
  ON public.manager_tasks(source_dispute_id);

CREATE TABLE IF NOT EXISTS public.manager_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.manager_tasks(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  log_type text NOT NULL DEFAULT 'note',
  message text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.manager_logs
  ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES public.manager_tasks(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS log_type text NOT NULL DEFAULT 'note',
  ADD COLUMN IF NOT EXISTS message text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_manager_logs_property_id
  ON public.manager_logs(property_id);

CREATE INDEX IF NOT EXISTS idx_manager_logs_task_id
  ON public.manager_logs(task_id);

CREATE INDEX IF NOT EXISTS idx_manager_logs_actor_id
  ON public.manager_logs(actor_id);

CREATE INDEX IF NOT EXISTS idx_manager_logs_created_at
  ON public.manager_logs(created_at DESC);

CREATE OR REPLACE FUNCTION public.set_manager_tasks_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_manager_tasks_updated_at ON public.manager_tasks;

CREATE TRIGGER trg_manager_tasks_updated_at
BEFORE UPDATE ON public.manager_tasks
FOR EACH ROW
EXECUTE FUNCTION public.set_manager_tasks_updated_at();

CREATE OR REPLACE FUNCTION public.sync_manager_logs_property_id()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_task_property_id uuid;
BEGIN
  SELECT mt.property_id
  INTO v_task_property_id
  FROM public.manager_tasks mt
  WHERE mt.id = NEW.task_id;

  IF v_task_property_id IS NULL THEN
    RAISE EXCEPTION 'manager task not found for log';
  END IF;

  NEW.property_id := v_task_property_id;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_manager_logs_sync_property_id ON public.manager_logs;

CREATE TRIGGER trg_manager_logs_sync_property_id
BEFORE INSERT OR UPDATE ON public.manager_logs
FOR EACH ROW
EXECUTE FUNCTION public.sync_manager_logs_property_id();

ALTER TABLE public.manager_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mt_select_tenant" ON public.manager_tasks;
DROP POLICY IF EXISTS "mt_insert_staff" ON public.manager_tasks;
DROP POLICY IF EXISTS "mt_update_owner_or_staff" ON public.manager_tasks;
DROP POLICY IF EXISTS "mt_delete_staff" ON public.manager_tasks;

CREATE POLICY "mt_select_tenant"
ON public.manager_tasks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.property_id = manager_tasks.property_id
      AND pm.user_id = auth.uid()
      AND pm.status = 'active'
  )
);

CREATE POLICY "mt_insert_staff"
ON public.manager_tasks
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.property_id = manager_tasks.property_id
      AND pm.user_id = auth.uid()
      AND pm.status = 'active'
      AND pm.role::text IN ('property_admin', 'admin', 'council', 'manager')
  )
  AND (
    manager_tasks.created_by IS NULL
    OR manager_tasks.created_by = auth.uid()
  )
);

CREATE POLICY "mt_update_owner_or_staff"
ON public.manager_tasks
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.property_id = manager_tasks.property_id
      AND pm.user_id = auth.uid()
      AND pm.status = 'active'
      AND pm.role::text IN ('property_admin', 'admin', 'council', 'manager')
  )
  OR manager_tasks.created_by = auth.uid()
  OR manager_tasks.assigned_to = auth.uid()
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.property_id = manager_tasks.property_id
      AND pm.user_id = auth.uid()
      AND pm.status = 'active'
      AND pm.role::text IN ('property_admin', 'admin', 'council', 'manager')
  )
  OR manager_tasks.created_by = auth.uid()
  OR manager_tasks.assigned_to = auth.uid()
);

CREATE POLICY "mt_delete_staff"
ON public.manager_tasks
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.property_id = manager_tasks.property_id
      AND pm.user_id = auth.uid()
      AND pm.status = 'active'
      AND pm.role::text IN ('property_admin', 'admin', 'council', 'manager')
  )
);

DROP POLICY IF EXISTS "ml_select_tenant" ON public.manager_logs;
DROP POLICY IF EXISTS "ml_insert_owner_or_staff" ON public.manager_logs;
DROP POLICY IF EXISTS "ml_update_staff" ON public.manager_logs;
DROP POLICY IF EXISTS "ml_delete_staff" ON public.manager_logs;

CREATE POLICY "ml_select_tenant"
ON public.manager_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.property_id = manager_logs.property_id
      AND pm.user_id = auth.uid()
      AND pm.status = 'active'
  )
);

CREATE POLICY "ml_insert_owner_or_staff"
ON public.manager_logs
FOR INSERT
TO authenticated
WITH CHECK (
  (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = manager_logs.property_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'active'
        AND pm.role::text IN ('property_admin', 'admin', 'council', 'manager')
    )
  )
  OR EXISTS (
    SELECT 1
    FROM public.manager_tasks mt
    WHERE mt.id = manager_logs.task_id
      AND (
        mt.created_by = auth.uid()
        OR mt.assigned_to = auth.uid()
      )
  )
  AND (
    manager_logs.actor_id IS NULL
    OR manager_logs.actor_id = auth.uid()
  )
);

CREATE POLICY "ml_update_staff"
ON public.manager_logs
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.property_id = manager_logs.property_id
      AND pm.user_id = auth.uid()
      AND pm.status = 'active'
      AND pm.role::text IN ('property_admin', 'admin', 'council', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.property_id = manager_logs.property_id
      AND pm.user_id = auth.uid()
      AND pm.status = 'active'
      AND pm.role::text IN ('property_admin', 'admin', 'council', 'manager')
  )
);

CREATE POLICY "ml_delete_staff"
ON public.manager_logs
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.property_id = manager_logs.property_id
      AND pm.user_id = auth.uid()
      AND pm.status = 'active'
      AND pm.role::text IN ('property_admin', 'admin', 'council', 'manager')
  )
);

NOTIFY pgrst, 'reload schema';