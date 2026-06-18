/*
  # Council actions — workflow orchestration (Phase P2B-5A)

  Converts budget risk alerts into trackable council workflows. Read-only on P2B-4 views.
*/

BEGIN;

CREATE TABLE IF NOT EXISTS public.council_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  alert_type text,
  alert_category text,
  title text NOT NULL,
  description text,
  action_type text NOT NULL CHECK (action_type IN (
    'budget_review',
    'vendor_review',
    'procurement_required',
    'mapping_required',
    'revenue_collection',
    'insurance_review',
    'council_discussion',
    'special_assessment'
  )),
  status text NOT NULL DEFAULT 'open' CHECK (status IN (
    'open',
    'in_progress',
    'completed',
    'dismissed'
  )),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN (
    'low',
    'medium',
    'high',
    'critical'
  )),
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date date,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_council_actions_property_status
  ON public.council_actions(property_id, status);

CREATE INDEX IF NOT EXISTS idx_council_actions_property_due
  ON public.council_actions(property_id, due_date)
  WHERE status IN ('open', 'in_progress');

CREATE INDEX IF NOT EXISTS idx_council_actions_open_alert
  ON public.council_actions(property_id, alert_type, alert_category)
  WHERE status IN ('open', 'in_progress');

COMMENT ON TABLE public.council_actions IS
  'Council workflow items spawned from budget risk alerts and governance follow-ups.';

CREATE OR REPLACE FUNCTION public.council_actions_set_completed_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    NEW.completed_at := now();
  ELSIF NEW.status IS DISTINCT FROM 'completed' THEN
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_council_actions_completed_at ON public.council_actions;
CREATE TRIGGER trg_council_actions_completed_at
  BEFORE UPDATE ON public.council_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.council_actions_set_completed_at();

ALTER TABLE public.council_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ca_select_tenant" ON public.council_actions;
DROP POLICY IF EXISTS "ca_insert_council" ON public.council_actions;
DROP POLICY IF EXISTS "ca_update_council" ON public.council_actions;
DROP POLICY IF EXISTS "ca_delete_council" ON public.council_actions;

CREATE POLICY "ca_select_tenant"
  ON public.council_actions FOR SELECT TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "ca_insert_council"
  ON public.council_actions FOR INSERT TO authenticated
  WITH CHECK (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = council_actions.property_id
        AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'property_admin')
    )
  );

CREATE POLICY "ca_update_council"
  ON public.council_actions FOR UPDATE TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = council_actions.property_id
        AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'property_admin')
    )
  )
  WITH CHECK (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = council_actions.property_id
        AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'property_admin')
    )
  );

CREATE POLICY "ca_delete_council"
  ON public.council_actions FOR DELETE TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = council_actions.property_id
        AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'property_admin')
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.council_actions TO authenticated;
GRANT ALL ON public.council_actions TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
