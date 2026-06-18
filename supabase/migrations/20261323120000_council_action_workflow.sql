/*
  # Council action workflow (Phase P2B-5B)

  Comments, attachments, audit events, assignment/completion columns, timeline triggers.
*/

BEGIN;

-- ---------------------------------------------------------------------------
-- Extend council_actions
-- ---------------------------------------------------------------------------
ALTER TABLE public.council_actions
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.council_actions.assigned_at IS 'Set when assigned_to is first set or changed to a non-null user.';
COMMENT ON COLUMN public.council_actions.completed_by IS 'User who marked the action completed.';

-- ---------------------------------------------------------------------------
-- Permission helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.council_action_can_manage(p_property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.user_id = (SELECT auth.uid())
      AND pm.property_id = p_property_id
      AND pm.status = 'active'
      AND pm.role IN ('council', 'admin', 'property_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.council_action_can_interact(p_property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.user_id = (SELECT auth.uid())
      AND pm.property_id = p_property_id
      AND pm.status = 'active'
      AND (
        pm.role IN ('manager', 'council', 'admin', 'property_admin')
        OR (
          pm.role = 'viewer'
          AND pm.staff_type IN ('accountant', 'auditor', 'lawyer', 'finance')
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.council_action_can_manage(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.council_action_can_interact(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.council_action_can_manage(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.council_action_can_interact(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Event logger (SECURITY DEFINER — bypasses RLS for audit trail)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_council_action_event(
  p_action_id uuid,
  p_property_id uuid,
  p_actor_id uuid,
  p_event_type text,
  p_old_value jsonb,
  p_new_value jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.council_action_events (
    action_id,
    property_id,
    actor_id,
    event_type,
    old_value,
    new_value
  )
  VALUES (
    p_action_id,
    p_property_id,
    p_actor_id,
    p_event_type,
    p_old_value,
    p_new_value
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_council_action_event(uuid, uuid, uuid, text, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_council_action_event(uuid, uuid, uuid, text, jsonb, jsonb)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- A. council_action_comments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.council_action_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL REFERENCES public.council_actions(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_council_action_comments_action
  ON public.council_action_comments(action_id, created_at);

-- ---------------------------------------------------------------------------
-- B. council_action_attachments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.council_action_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL REFERENCES public.council_actions(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_council_action_attachments_action
  ON public.council_action_attachments(action_id, created_at);

-- ---------------------------------------------------------------------------
-- C. council_action_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.council_action_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL REFERENCES public.council_actions(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  actor_id uuid,
  event_type text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_council_action_events_action
  ON public.council_action_events(action_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Timeline triggers on council_actions
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.council_actions_workflow_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
BEGIN
  v_actor := (SELECT auth.uid());

  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_council_action_event(
      NEW.id,
      NEW.property_id,
      COALESCE(NEW.created_by, v_actor),
      'created',
      NULL,
      jsonb_build_object(
        'title', NEW.title,
        'status', NEW.status,
        'priority', NEW.priority,
        'action_type', NEW.action_type
      )
    );
    RETURN NEW;
  END IF;

  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
    IF NEW.assigned_to IS NOT NULL THEN
      NEW.assigned_at := now();
    END IF;
    PERFORM public.log_council_action_event(
      NEW.id,
      NEW.property_id,
      v_actor,
      'assigned',
      jsonb_build_object('assigned_to', OLD.assigned_to),
      jsonb_build_object('assigned_to', NEW.assigned_to)
    );
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
      NEW.completed_at := now();
      NEW.completed_by := v_actor;
      PERFORM public.log_council_action_event(
        NEW.id,
        NEW.property_id,
        v_actor,
        'completed',
        jsonb_build_object('status', OLD.status),
        jsonb_build_object('status', NEW.status, 'completed_by', v_actor)
      );
    ELSE
      PERFORM public.log_council_action_event(
        NEW.id,
        NEW.property_id,
        v_actor,
        'status_changed',
        jsonb_build_object('status', OLD.status),
        jsonb_build_object('status', NEW.status)
      );
    END IF;
  END IF;

  IF NEW.priority IS DISTINCT FROM OLD.priority THEN
    PERFORM public.log_council_action_event(
      NEW.id,
      NEW.property_id,
      v_actor,
      'priority_changed',
      jsonb_build_object('priority', OLD.priority),
      jsonb_build_object('priority', NEW.priority)
    );
  END IF;

  IF NEW.due_date IS DISTINCT FROM OLD.due_date THEN
    PERFORM public.log_council_action_event(
      NEW.id,
      NEW.property_id,
      v_actor,
      'due_date_changed',
      jsonb_build_object('due_date', OLD.due_date),
      jsonb_build_object('due_date', NEW.due_date)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_council_actions_completed_at ON public.council_actions;
DROP TRIGGER IF EXISTS trg_council_actions_workflow_audit ON public.council_actions;

CREATE TRIGGER trg_council_actions_workflow_audit
  BEFORE INSERT OR UPDATE ON public.council_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.council_actions_workflow_audit();

-- ---------------------------------------------------------------------------
-- Comment / attachment event triggers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.council_action_comment_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_council_action_event(
    NEW.action_id,
    NEW.property_id,
    NEW.created_by,
    'comment_added',
    NULL,
    jsonb_build_object('comment_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_council_action_comment_event ON public.council_action_comments;
CREATE TRIGGER trg_council_action_comment_event
  AFTER INSERT ON public.council_action_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.council_action_comment_event();

CREATE OR REPLACE FUNCTION public.council_action_attachment_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_council_action_event(
    NEW.action_id,
    NEW.property_id,
    NEW.uploaded_by,
    'attachment_added',
    NULL,
    jsonb_build_object('attachment_id', NEW.id, 'file_name', NEW.file_name)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_council_action_attachment_event ON public.council_action_attachments;
CREATE TRIGGER trg_council_action_attachment_event
  AFTER INSERT ON public.council_action_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.council_action_attachment_event();

-- ---------------------------------------------------------------------------
-- RLS — comments
-- ---------------------------------------------------------------------------
ALTER TABLE public.council_action_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cac_select_tenant" ON public.council_action_comments;
DROP POLICY IF EXISTS "cac_insert_interact" ON public.council_action_comments;
DROP POLICY IF EXISTS "cac_delete_manage" ON public.council_action_comments;

CREATE POLICY "cac_select_tenant"
  ON public.council_action_comments FOR SELECT TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "cac_insert_interact"
  ON public.council_action_comments FOR INSERT TO authenticated
  WITH CHECK (
    property_id IN (SELECT public.user_property_ids())
    AND public.council_action_can_interact(property_id)
    AND created_by = (SELECT auth.uid())
  );

CREATE POLICY "cac_delete_manage"
  ON public.council_action_comments FOR DELETE TO authenticated
  USING (public.council_action_can_manage(property_id));

-- ---------------------------------------------------------------------------
-- RLS — attachments
-- ---------------------------------------------------------------------------
ALTER TABLE public.council_action_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "caa_select_tenant" ON public.council_action_attachments;
DROP POLICY IF EXISTS "caa_insert_interact" ON public.council_action_attachments;
DROP POLICY IF EXISTS "caa_delete_manage" ON public.council_action_attachments;

CREATE POLICY "caa_select_tenant"
  ON public.council_action_attachments FOR SELECT TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "caa_insert_interact"
  ON public.council_action_attachments FOR INSERT TO authenticated
  WITH CHECK (
    property_id IN (SELECT public.user_property_ids())
    AND public.council_action_can_interact(property_id)
    AND uploaded_by = (SELECT auth.uid())
  );

CREATE POLICY "caa_delete_manage"
  ON public.council_action_attachments FOR DELETE TO authenticated
  USING (public.council_action_can_manage(property_id));

-- ---------------------------------------------------------------------------
-- RLS — events (read-only for members; writes via SECURITY DEFINER triggers)
-- ---------------------------------------------------------------------------
ALTER TABLE public.council_action_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cae_select_tenant" ON public.council_action_events;

CREATE POLICY "cae_select_tenant"
  ON public.council_action_events FOR SELECT TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()));

GRANT SELECT ON public.council_action_comments TO authenticated, service_role;
GRANT SELECT, INSERT, DELETE ON public.council_action_comments TO authenticated;
GRANT ALL ON public.council_action_comments TO service_role;

GRANT SELECT ON public.council_action_attachments TO authenticated, service_role;
GRANT SELECT, INSERT, DELETE ON public.council_action_attachments TO authenticated;
GRANT ALL ON public.council_action_attachments TO service_role;

GRANT SELECT ON public.council_action_events TO authenticated, service_role;
GRANT ALL ON public.council_action_events TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
