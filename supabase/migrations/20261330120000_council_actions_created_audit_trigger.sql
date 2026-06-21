/*
  # Fix council_actions audit trigger FK failure (Phase P2B-5G-2B)

  BEFORE INSERT on council_actions logged to council_action_events before the parent
  row existed, violating council_action_events_action_id_fkey.

  Split: AFTER INSERT for 'created' events; BEFORE UPDATE for assignment/status audit.
*/

BEGIN;

-- ---------------------------------------------------------------------------
-- UPDATE-only workflow audit (assigned_at, status, priority, due_date)
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

-- ---------------------------------------------------------------------------
-- AFTER INSERT: 'created' audit event (parent row must exist for FK)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.council_actions_created_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
BEGIN
  v_actor := (SELECT auth.uid());

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
END;
$$;

DROP TRIGGER IF EXISTS trg_council_actions_workflow_audit ON public.council_actions;
DROP TRIGGER IF EXISTS trg_council_actions_created_audit ON public.council_actions;

CREATE TRIGGER trg_council_actions_workflow_audit
  BEFORE UPDATE ON public.council_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.council_actions_workflow_audit();

CREATE TRIGGER trg_council_actions_created_audit
  AFTER INSERT ON public.council_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.council_actions_created_audit();

COMMIT;

NOTIFY pgrst, 'reload schema';
