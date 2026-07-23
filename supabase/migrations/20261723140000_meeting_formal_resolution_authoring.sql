/*
  M2 Slice 2 — Meeting formal resolution authoring metadata + audit trail.
  Canonical motion rows remain meeting_agenda_items (requires_vote = true).
*/

BEGIN;

ALTER TABLE public.meeting_agenda_items
  ADD COLUMN IF NOT EXISTS formal_resolution_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS formal_resolution_state text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS formal_resolution_modified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS formal_resolution_modified_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.meeting_agenda_items DROP CONSTRAINT IF EXISTS meeting_agenda_items_formal_resolution_state_check;
ALTER TABLE public.meeting_agenda_items
  ADD CONSTRAINT meeting_agenda_items_formal_resolution_state_check
  CHECK (formal_resolution_state IN ('draft', 'under_review', 'final'));

COMMENT ON COLUMN public.meeting_agenda_items.formal_resolution_version IS
  'M2/RC010 — increments on each formal resolution content edit.';
COMMENT ON COLUMN public.meeting_agenda_items.formal_resolution_state IS
  'M2/RC010 — draft | under_review | final (snapshot freeze is separate).';

CREATE TABLE IF NOT EXISTS public.meeting_formal_resolution_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agenda_item_id uuid NOT NULL REFERENCES public.meeting_agenda_items(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  event_kind text NOT NULL CHECK (
    event_kind IN ('create', 'edit', 'delete', 'reorder', 'finalize', 'state_change')
  ),
  version integer NOT NULL DEFAULT 1,
  resolution_state text,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meeting_formal_resolution_audit_agenda
  ON public.meeting_formal_resolution_audit(agenda_item_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_meeting_formal_resolution_audit_meeting
  ON public.meeting_formal_resolution_audit(meeting_id, created_at DESC);

COMMENT ON TABLE public.meeting_formal_resolution_audit IS
  'M2/RC010 — immutable audit trail for Meeting-owned formal resolution authoring.';

ALTER TABLE public.meeting_formal_resolution_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mfr_audit_select_tenant"
  ON public.meeting_formal_resolution_audit FOR SELECT TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "mfr_audit_insert_staff"
  ON public.meeting_formal_resolution_audit FOR INSERT TO authenticated
  WITH CHECK (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = meeting_formal_resolution_audit.property_id
        AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
    )
  );

GRANT SELECT, INSERT ON public.meeting_formal_resolution_audit TO authenticated;
GRANT ALL ON public.meeting_formal_resolution_audit TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
