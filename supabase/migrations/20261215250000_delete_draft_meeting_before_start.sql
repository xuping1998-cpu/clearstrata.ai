-- Staff / platform: delete draft council meetings before scheduled_at (notice not started), no vote records.

BEGIN;

CREATE OR REPLACE FUNCTION public.delete_draft_meeting_before_start(p_meeting_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  m record;
  v_platform boolean := false;
  v_staff boolean := false;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_authenticated');
  END IF;

  IF p_meeting_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'meeting_not_found');
  END IF;

  SELECT id, property_id, status, scheduled_at
  INTO m
  FROM public.meetings
  WHERE id = p_meeting_id
  LIMIT 1;

  IF NOT FOUND OR m.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'meeting_not_found');
  END IF;

  IF lower(trim(both FROM coalesce(m.status, ''))) IS DISTINCT FROM 'draft' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_draft');
  END IF;

  IF m.scheduled_at IS NOT NULL AND now() >= m.scheduled_at THEN
    RETURN jsonb_build_object('ok', false, 'code', 'schedule_locked');
  END IF;

  -- Council meeting ballots / resolutions
  IF to_regclass('public.meeting_ballots') IS NOT NULL
     AND to_regclass('public.meeting_votes') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM public.meeting_ballots b
       INNER JOIN public.meeting_votes v ON v.id = b.vote_id
       WHERE v.meeting_id = p_meeting_id
     )
  THEN
    RETURN jsonb_build_object('ok', false, 'code', 'has_votes');
  END IF;

  IF to_regclass('public.meeting_resolutions') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM public.meeting_resolutions r WHERE r.meeting_id = p_meeting_id
     )
  THEN
    RETURN jsonb_build_object('ok', false, 'code', 'has_votes');
  END IF;

  -- Owner election ballots on this council meeting agendas
  IF to_regclass('public.owner_election_ballots') IS NOT NULL
     AND to_regclass('public.meeting_agenda_items') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM public.owner_election_ballots oeb
       INNER JOIN public.meeting_agenda_items mai ON mai.id = oeb.agenda_item_id
       WHERE mai.meeting_id = p_meeting_id
     )
  THEN
    RETURN jsonb_build_object('ok', false, 'code', 'has_votes');
  END IF;

  -- Owner vote ballots on owner_vote_meetings bound to this council meeting
  IF to_regclass('public.owner_vote_ballots') IS NOT NULL
     AND to_regclass('public.owner_vote_resolutions') IS NOT NULL
     AND to_regclass('public.owner_vote_meetings') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM public.owner_vote_ballots ovb
       INNER JOIN public.owner_vote_resolutions ovr ON ovr.id = ovb.resolution_id
       INNER JOIN public.owner_vote_meetings ov ON ov.id = ovr.meeting_id
       WHERE ov.description LIKE '%clearstrata-council-meeting-binding%'
         AND ov.description LIKE '%' || p_meeting_id::text || '%'
     )
  THEN
    RETURN jsonb_build_object('ok', false, 'code', 'has_votes');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = uid
      AND lower(trim(both FROM coalesce(p.app_role, ''))) IN ('platform_admin', 'superadmin')
  )
  INTO v_platform;

  IF NOT v_platform THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.user_id = uid
        AND pm.property_id = m.property_id
        AND pm.status = 'active'
        AND lower(trim(both FROM coalesce(pm.role::text, ''))) IN ('council', 'admin', 'property_admin')
    )
    INTO v_staff;
  END IF;

  IF NOT v_platform AND NOT v_staff THEN
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

COMMENT ON FUNCTION public.delete_draft_meeting_before_start(uuid) IS
  'Staff or platform: delete draft meeting before scheduled_at when no ballots/resolutions/owner vote records; DB rows only (not storage).';

REVOKE ALL ON FUNCTION public.delete_draft_meeting_before_start(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_draft_meeting_before_start(uuid) TO authenticated;

COMMIT;
