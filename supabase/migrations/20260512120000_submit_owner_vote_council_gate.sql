-- When owner_vote_meetings binds a council meeting, reject ballots if council is ended or still draft.

BEGIN;

-- Remove legacy overload submit_owner_vote(uuid, owner_vote_choice); keep (uuid, text).
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
  v_unit_raw text;
  v_unit text;
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

  -- Optional: council meeting gate from <!--clearstrata-council-meeting-binding\n{json}\n--> (failure → skip gate)
  IF v_desc IS NOT NULL AND length(v_desc) > 0 THEN
    p_start := strpos(v_desc, needle);
    IF p_start > 0 THEN
      tail := substr(v_desc, p_start + length(needle));
      p_end := strpos(tail, end_needle);
      IF p_end > 0 THEN
        json_fragment := trim(both from substr(tail, 1, p_end - 1));
        BEGIN
          cid_text := (json_fragment::jsonb) ->> 'council_meeting_id';
          IF cid_text IS NOT NULL AND cid_text <> '' THEN
            council_uid := cid_text::uuid;
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
        EXCEPTION
          WHEN OTHERS THEN
            NULL;
        END;
      END IF;
    END IF;
  END IF;

  SELECT ovs.unit_no
  INTO v_unit_raw
  FROM public.owner_vote_voter_snapshot ovs
  WHERE ovs.user_id = uid
    AND ovs.meeting_id = v_meeting_id
    AND ovs.property_id = v_property_id
    AND ovs.is_eligible IS TRUE
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_eligible_to_vote';
  END IF;

  v_unit := trim(both from coalesce(v_unit_raw::text, ''));

  IF v_unit IS NULL OR v_unit = '' THEN
    RAISE EXCEPTION 'missing_unit_no';
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
  WHERE b.meeting_id = v_meeting_id
    AND b.resolution_id = p_resolution_id
    AND b.voter_user_id = uid;

  GET DIAGNOSTICS v_row_count = ROW_COUNT;

  IF v_row_count > 0 THEN
    RETURN jsonb_build_object('ok', true);
  END IF;

  INSERT INTO public.owner_vote_ballots (
    property_id,
    meeting_id,
    resolution_id,
    unit_no,
    voter_user_id,
    choice,
    updated_at
  )
  VALUES (
    v_property_id,
    v_meeting_id,
    p_resolution_id,
    v_unit,
    uid,
    v_vote,
    now()
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

COMMENT ON FUNCTION public.submit_owner_vote(uuid, text) IS
  'Returns {"ok": true} on success. Validates p_choice as owner_vote_choice; upserts ballots with enum choice. If description binds a council meeting, rejects when meetings.status is draft (voting_not_open) or closed/ended/archived (voting_closed); else enforces OV open status and voting window.';

REVOKE ALL ON FUNCTION public.submit_owner_vote(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_owner_vote(uuid, text) TO authenticated;

COMMIT;
