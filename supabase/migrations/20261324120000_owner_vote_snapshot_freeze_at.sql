-- Phase 7F-1: planned voter-roll freeze time (snapshot_freeze_at) separate from meeting start.

BEGIN;

ALTER TABLE public.owner_vote_meetings
  ADD COLUMN IF NOT EXISTS snapshot_freeze_at timestamptz;

COMMENT ON COLUMN public.owner_vote_meetings.snapshot_freeze_at IS
  'Planned time to freeze the voter roll.';

CREATE OR REPLACE FUNCTION public.set_owner_vote_snapshot_freeze_at(
  p_meeting_id uuid,
  p_snapshot_freeze_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property_id uuid;
  v_frozen_at timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_meeting_id IS NULL THEN
    RAISE EXCEPTION 'meeting_not_found';
  END IF;

  IF p_snapshot_freeze_at IS NULL THEN
    RAISE EXCEPTION 'snapshot_freeze_at_required';
  END IF;

  IF p_snapshot_freeze_at < now() THEN
    RAISE EXCEPTION 'snapshot_freeze_at_in_past';
  END IF;

  SELECT m.property_id, m.snapshot_frozen_at
  INTO v_property_id, v_frozen_at
  FROM public.owner_vote_meetings m
  WHERE m.id = p_meeting_id;

  IF v_property_id IS NULL THEN
    RAISE EXCEPTION 'meeting_not_found';
  END IF;

  IF v_frozen_at IS NOT NULL THEN
    RAISE EXCEPTION 'snapshot_already_frozen';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.user_id = auth.uid()
      AND pm.property_id = v_property_id
      AND pm.status = 'active'::public.member_status
      AND pm.role IN (
        'council'::public.user_role,
        'admin'::public.user_role,
        'property_admin'::public.user_role
      )
  ) THEN
    RAISE EXCEPTION 'permission_denied';
  END IF;

  UPDATE public.owner_vote_meetings
  SET
    snapshot_freeze_at = p_snapshot_freeze_at,
    updated_at = now()
  WHERE id = p_meeting_id;

  RETURN jsonb_build_object(
    'ok', true,
    'snapshot_freeze_at', p_snapshot_freeze_at
  );
END;
$$;

COMMENT ON FUNCTION public.set_owner_vote_snapshot_freeze_at(uuid, timestamptz) IS
  'Council/admin/property_admin: set planned voter-roll freeze time before snapshot is frozen.';

REVOKE ALL ON FUNCTION public.set_owner_vote_snapshot_freeze_at(uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_owner_vote_snapshot_freeze_at(uuid, timestamptz) TO authenticated;

COMMIT;
