-- Owner remote-written v3 owner-requisitioned SGM: creator may delete draft before scheduled_at (notice not started).

BEGIN;

CREATE OR REPLACE FUNCTION public.delete_owner_remote_written_v3_sgm_draft(p_meeting_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  m record;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_authenticated');
  END IF;

  IF p_meeting_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'meeting_not_found');
  END IF;

  SELECT id, property_id, created_by, status, description_zh, scheduled_at
  INTO m
  FROM public.meetings
  WHERE id = p_meeting_id
  LIMIT 1;

  IF NOT FOUND OR m.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'meeting_not_found');
  END IF;

  IF NOT public.is_remote_written_v3_meeting(p_meeting_id) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_allowed');
  END IF;

  IF coalesce(m.description_zh, '') NOT LIKE '%owner_requisitioned%' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_allowed');
  END IF;

  IF m.created_by IS DISTINCT FROM uid THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_allowed');
  END IF;

  IF lower(trim(both FROM coalesce(m.status, ''))) IS DISTINCT FROM 'draft' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_allowed');
  END IF;

  IF m.scheduled_at IS NULL OR now() >= m.scheduled_at THEN
    RETURN jsonb_build_object('ok', false, 'code', 'schedule_locked');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.user_id = uid
      AND pm.property_id = m.property_id
      AND pm.status = 'active'
      AND lower(trim(both FROM coalesce(pm.role::text, ''))) = 'owner'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_allowed');
  END IF;

  -- Child rows (explicit deletes; meeting row last). Storage files are not removed.
  IF to_regclass('public.meeting_votes') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'meeting_votes' AND column_name = 'meeting_id'
    ) THEN
      DELETE FROM public.meeting_ballots b
      USING public.meeting_votes v
      WHERE b.vote_id = v.id AND v.meeting_id = p_meeting_id;

      DELETE FROM public.meeting_vote_options o
      USING public.meeting_votes v
      WHERE o.vote_id = v.id AND v.meeting_id = p_meeting_id;

      DELETE FROM public.meeting_votes WHERE meeting_id = p_meeting_id;
    END IF;
  END IF;

  IF to_regclass('public.meeting_resolutions') IS NOT NULL THEN
    DELETE FROM public.meeting_resolutions WHERE meeting_id = p_meeting_id;
  END IF;

  IF to_regclass('public.meeting_invitations') IS NOT NULL THEN
    DELETE FROM public.meeting_invitations WHERE meeting_id = p_meeting_id;
  END IF;

  IF to_regclass('public.invite_tokens') IS NOT NULL THEN
    DELETE FROM public.invite_tokens WHERE meeting_id = p_meeting_id;
  END IF;

  IF to_regclass('public.meeting_attendees') IS NOT NULL THEN
    DELETE FROM public.meeting_attendees WHERE meeting_id = p_meeting_id;
  END IF;

  IF to_regclass('public.meeting_minutes') IS NOT NULL THEN
    DELETE FROM public.meeting_minutes WHERE meeting_id = p_meeting_id;
  END IF;

  IF to_regclass('public.meeting_documents') IS NOT NULL THEN
    DELETE FROM public.meeting_documents WHERE meeting_id = p_meeting_id;
  END IF;

  IF to_regclass('public.meeting_agenda_items') IS NOT NULL THEN
    DELETE FROM public.meeting_agenda_items WHERE meeting_id = p_meeting_id;
  END IF;

  DELETE FROM public.meetings WHERE id = p_meeting_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

COMMENT ON FUNCTION public.delete_owner_remote_written_v3_sgm_draft(uuid) IS
  'Active owner + creator: delete draft owner-requisitioned remote-written v3 SGM before scheduled_at; removes DB rows only (not storage).';

REVOKE ALL ON FUNCTION public.delete_owner_remote_written_v3_sgm_draft(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_owner_remote_written_v3_sgm_draft(uuid) TO authenticated;

COMMIT;
