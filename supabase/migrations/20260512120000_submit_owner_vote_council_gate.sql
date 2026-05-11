BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_type t
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'owner_vote_choice'
  ) THEN
    EXECUTE 'DROP FUNCTION IF EXISTS public.submit_owner_vote(uuid, public.owner_vote_choice)';
  END IF;
END
$$;

DROP FUNCTION IF EXISTS public.submit_owner_vote(uuid, text);

CREATE FUNCTION public.submit_owner_vote(
  p_resolution_id uuid,
  p_choice text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_vote public.owner_vote_choice;
  v_choice_lower text;
  v_meeting_id uuid;
  v_property_id uuid;
  ov_status text;
  vo timestamptz;
  vc timestamptz;
  v_desc text;
  v_unit_no text;
  v_row_count int;
  needle constant text := '<!--clearstrata-council-meeting-binding' || chr(10);
  end_needle constant text := chr(10) || '-->';
  p_start int;
  tail text;
  p_end int;
  json_fragment text;
  cid_text text;
  council_uid uuid;
  cm_status text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_choice_lower := trim(both from lower(coalesce(p_choice, '')));

  IF v_choice_lower NOT IN ('yes', 'no', 'abstain') THEN
    RAISE EXCEPTION 'invalid_choice';
  END IF;

  v_vote := v_choice_lower::public.owner_vote_choice;

  SELECT
    r.meeting_id,
    m.property_id,
    lower(trim(both from coalesce(m.status, ''))),
    m.voting_opens_at,
    m.voting_closes_at,
    m.description
  INTO v_meeting_id, v_property_id, ov_status, vo, vc, v_desc
  FROM public.owner_vote_resolutions r
  INNER JOIN public.owner_vote_meetings m ON m.id = r.meeting_id
  WHERE r.id = p_resolution_id
  LIMIT 1;

  IF NOT FOUND OR v_meeting_id IS NULL THEN
    RAISE EXCEPTION 'resolution_not_found';
  END IF;

  IF v_desc IS NOT NULL AND length(v_desc) > 0 THEN
    p_start := strpos(v_desc, needle);
    IF p_start > 0 THEN
      tail := substr(v_desc, p_start + length(needle));
      p_end := strpos(tail, end_needle);
      IF p_end > 0 THEN
        json_fragment := trim(both from substr(tail, 1, p_end - 1));
        council_uid := NULL;
        BEGIN
          cid_text := (json_fragment::jsonb) ->> 'council_meeting_id';
          IF cid_text IS NOT NULL AND trim(both from cid_text) <> '' THEN
            council_uid := cid_text::uuid;
          ELSE
            council_uid := NULL;
          END IF;
        EXCEPTION
          WHEN OTHERS THEN
            council_uid := NULL;
        END;

        IF council_uid IS NOT NULL THEN
          SELECT lower(trim(both from coalesce(status, '')))
          INTO cm_status
          FROM public.meetings
          WHERE id = council_uid
          LIMIT 1;
          IF FOUND THEN
            IF cm_status IN ('closed', 'ended', 'archived') THEN
              RAISE EXCEPTION 'voting_closed';
            END IF;
            IF cm_status = 'draft' THEN
              RAISE EXCEPTION 'voting_not_open';
            END IF;
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;

  SELECT trim(both from coalesce(pm.unit_no::text, ''))
  INTO v_unit_no
  FROM public.property_members pm
  WHERE pm.user_id = uid
    AND pm.property_id = v_property_id
    AND pm.status = 'active'
  LIMIT 1;

  IF NOT FOUND OR trim(both from coalesce(v_unit_no, '')) = '' THEN
    RAISE EXCEPTION 'not_eligible_to_vote';
  END IF;

  IF ov_status IS DISTINCT FROM 'open' THEN
    RAISE EXCEPTION 'voting_not_open';
  END IF;

  IF vo IS NULL THEN
    RAISE EXCEPTION 'voting_not_open';
  END IF;

  IF vc IS NULL THEN
    RAISE EXCEPTION 'voting_not_open';
  END IF;

  IF now() < vo THEN
    RAISE EXCEPTION 'voting_not_open';
  END IF;

  IF now() > vc THEN
    RAISE EXCEPTION 'voting_closed';
  END IF;

  UPDATE public.owner_vote_ballots b
  SET
    choice = v_vote,
    updated_at = now()
  WHERE b.resolution_id = p_resolution_id
    AND b.voter_user_id = uid;

  GET DIAGNOSTICS v_row_count = ROW_COUNT;

  IF v_row_count > 0 THEN
    RETURN jsonb_build_object('ok', true);
  END IF;

  INSERT INTO public.owner_vote_ballots (
    meeting_id,
    resolution_id,
    property_id,
    unit_no,
    voter_user_id,
    choice,
    submitted_at,
    updated_at
  )
  VALUES (
    v_meeting_id,
    p_resolution_id,
    v_property_id,
    v_unit_no,
    uid,
    v_vote,
    now(),
    now()
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

COMMENT ON FUNCTION public.submit_owner_vote(uuid, text) IS
  'Returns {"ok": true}. Validates yes/no/abstain→owner_vote_choice; eligibility via active property_members.unit_no on meeting.property_id; UPSERT ballots (unit_no=v_unit_no); council binding rejects closed/ended/archived or draft; OV status open + voting window.';

REVOKE ALL ON FUNCTION public.submit_owner_vote(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_owner_vote(uuid, text) TO authenticated;

COMMIT;
