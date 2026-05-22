-- Fix 22P02: coalesce(owner_vote_meetings.status, '') coerces '' to owner_vote_meeting_status enum.
-- Cast status to text before coalesce with empty string.

BEGIN;

CREATE OR REPLACE FUNCTION public.submit_owner_vote(
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
  bypass_ov_gates boolean := false;
  council_sched timestamptz;
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
    lower(trim(both from coalesce(m.status::text, ''))),
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

  council_uid := NULL;
  cm_status := NULL;

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
            IF public.is_remote_written_v3_meeting(council_uid) THEN
              SELECT mm.scheduled_at
              INTO council_sched
              FROM public.meetings mm
              WHERE mm.id = council_uid
              LIMIT 1;

              IF council_sched IS NULL THEN
                RAISE EXCEPTION 'voting_not_open';
              END IF;

              IF now() < council_sched THEN
                RAISE EXCEPTION 'voting_not_open';
              END IF;

              IF now() >= council_sched + interval '14 days' THEN
                RAISE EXCEPTION 'voting_closed';
              END IF;

              IF cm_status IN ('closed', 'ended', 'archived') THEN
                RAISE EXCEPTION 'voting_closed';
              END IF;

              bypass_ov_gates := true;
            ELSE
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

  IF NOT bypass_ov_gates THEN
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
  'Returns {"ok": true}. UPSERT ballots; council-bound remote-written v3 uses council scheduled_at..+14d and ignores OV open/freeze/window.';

REVOKE ALL ON FUNCTION public.submit_owner_vote(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_owner_vote(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_owner_election_ballot(
  p_meeting_id uuid,
  p_agenda_item_id uuid,
  p_selected_candidate_ids jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();

  v_unit_raw text;
  v_unit text;
  v_property uuid;

  ov_status text;
  vo timestamptz;
  vc timestamptz;

  v_ov_title text;
  v_ov_property uuid;
  v_council_id uuid;

  v_desc_zh text;

  meta jsonb;

  v_seats int;
  v_max_ch int;
  accepted_ids uuid[] := ARRAY[]::uuid[];

  n int := 0;
  i int;

  cid text;
  cid_u uuid;

  cand jsonb;
  sel_txt text;
  cand_u uuid;

  nm_closes timestamptz;
  council_sched timestamptz;
  v_rw_v3 boolean := false;

BEGIN
  IF uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF jsonb_typeof(p_selected_candidate_ids) <> 'array'::text THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_selection_shape');
  END IF;

  SELECT ovs.unit_no, ovs.property_id
    INTO v_unit_raw, v_property
  FROM public.owner_vote_voter_snapshot ovs
  WHERE ovs.user_id = uid
    AND ovs.meeting_id = p_meeting_id
    AND ovs.is_eligible IS TRUE
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'not_eligible_to_vote');
  END IF;

  v_unit := trim(both FROM coalesce(v_unit_raw::text, ''));

  SELECT
    trim(both FROM coalesce(title, '')),
    property_id,
    lower(trim(both FROM coalesce(status::text, ''))),
    voting_opens_at,
    voting_closes_at
  INTO v_ov_title, v_ov_property, ov_status, vo, vc
  FROM public.owner_vote_meetings om
  WHERE om.id = p_meeting_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'meeting_not_found');
  END IF;

  IF v_unit IS NULL OR v_unit = '' THEN
    RETURN json_build_object('ok', false, 'error', 'missing_unit_no');
  END IF;

  IF v_ov_property <> v_property THEN
    RETURN json_build_object('ok', false, 'error', 'snapshot_mismatch');
  END IF;

  SELECT m.id
    INTO v_council_id
  FROM public.meetings m
  WHERE m.property_id = v_ov_property
    AND lower(coalesce(m.meeting_type::text, '')) IN ('agm', 'sgm')
    AND (
      trim(both FROM coalesce(m.title_zh::text, '')) = v_ov_title
      OR trim(both FROM coalesce(m.title_en::text, '')) = v_ov_title
    )
  ORDER BY coalesce(m.created_at, timestamp 'epoch') DESC
  LIMIT 1;

  IF v_council_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'council_meeting_not_found');
  END IF;

  v_rw_v3 := public.is_remote_written_v3_meeting(v_council_id);

  IF v_rw_v3 THEN
    SELECT mm.scheduled_at
    INTO council_sched
    FROM public.meetings mm
    WHERE mm.id = v_council_id
    LIMIT 1;

    IF council_sched IS NULL THEN
      RETURN json_build_object('ok', false, 'error', 'voting_not_open');
    END IF;

    IF now() < council_sched THEN
      RETURN json_build_object('ok', false, 'error', 'voting_not_open');
    END IF;

    IF now() >= council_sched + interval '14 days' THEN
      RETURN json_build_object('ok', false, 'error', 'voting_closed');
    END IF;
  ELSE
    IF ov_status IS DISTINCT FROM 'open'::text THEN
      RETURN json_build_object('ok', false, 'error', 'voting_not_open');
    END IF;

    IF vo IS NOT NULL AND now() < vo THEN
      RETURN json_build_object('ok', false, 'error', 'voting_not_open');
    END IF;

    IF vc IS NOT NULL AND now() > vc THEN
      RETURN json_build_object('ok', false, 'error', 'voting_not_open');
    END IF;
  END IF;

  SELECT mai.description_zh
    INTO v_desc_zh
  FROM public.meeting_agenda_items mai
  WHERE mai.id = p_agenda_item_id
    AND mai.property_id = v_property
    AND mai.meeting_id = v_council_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'agenda_not_found');
  END IF;

  meta := public.try_extract_election_agenda_meta(v_desc_zh);
  IF meta IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_election_agenda');
  END IF;

  IF coalesce(trim(both FROM meta ->> 'agenda_type'), '') <> 'council_election'::text THEN
    RETURN json_build_object('ok', false, 'error', 'not_election_agenda');
  END IF;

  IF NOT v_rw_v3 THEN
    nm_closes := NULL;
    IF meta ? 'nomination_closes_at'::text AND length(trim(both FROM meta ->> 'nomination_closes_at'::text)) > 0 THEN
      BEGIN
        nm_closes := (trim(both FROM meta ->> 'nomination_closes_at'::text))::timestamptz;
      EXCEPTION WHEN OTHERS THEN
        nm_closes := NULL;
      END;
      IF nm_closes IS NOT NULL AND now() < nm_closes THEN
        RETURN json_build_object('ok', false, 'error', 'nomination_still_open');
      END IF;
    END IF;

    IF meta ? 'nomination_opens_at'::text AND length(trim(both FROM meta ->> 'nomination_opens_at'::text)) > 0 THEN
      BEGIN
        IF now() < (trim(both FROM meta ->> 'nomination_opens_at'::text))::timestamptz THEN
          RETURN json_build_object('ok', false, 'error', 'nomination_not_started');
        END IF;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  END IF;

  v_seats := floor(coalesce((meta ->> 'seats')::numeric, '1'::numeric))::int;
  v_max_ch := floor(coalesce((meta ->> 'max_choices_per_unit')::numeric, '1'::numeric))::int;
  IF v_seats < 1 THEN v_seats := 1; END IF;
  IF v_max_ch < 1 THEN v_max_ch := 1; END IF;

  n := jsonb_array_length(coalesce(p_selected_candidate_ids, '[]'::jsonb));
  IF n > LEAST(v_max_ch, v_seats) THEN
    RETURN json_build_object('ok', false, 'error', 'too_many_candidates');
  END IF;

  FOR i IN 0 .. GREATEST(jsonb_array_length(coalesce(meta -> 'candidates', '[]'::jsonb)) - 1, -1)
  LOOP
    cand := meta -> 'candidates' -> i;
    IF cand IS NULL OR jsonb_typeof(cand) <> 'object'::text THEN
      CONTINUE;
    END IF;

    IF lower(coalesce(trim(both FROM cand ->> 'accepted'::text), 'false'::text))
      NOT IN ('true'::text, 't'::text, '1'::text, 'yes'::text)
    THEN
      CONTINUE;
    END IF;

    cid := trim(both FROM cand ->> 'id'::text);
    IF cid IS NULL OR cid = '' THEN CONTINUE; END IF;
    BEGIN
      cid_u := cid::uuid;
      accepted_ids := array_append(accepted_ids, cid_u);
    EXCEPTION WHEN OTHERS THEN
      CONTINUE;
    END;
  END LOOP;

  FOR i IN 0 .. GREATEST(jsonb_array_length(coalesce(p_selected_candidate_ids, '[]'::jsonb)) - 1, -1)
  LOOP
    sel_txt := trim(both FROM p_selected_candidate_ids ->> i::text);
    CONTINUE WHEN sel_txt IS NULL OR sel_txt = '';

    cand_u := NULL::uuid;
    BEGIN
      cand_u := sel_txt::uuid;
    EXCEPTION WHEN OTHERS THEN
      RETURN json_build_object('ok', false, 'error', 'invalid_candidate_id_format');
    END;

    IF NOT cand_u = ANY (accepted_ids) THEN
      RETURN json_build_object('ok', false, 'error', 'invalid_candidate_id');
    END IF;
  END LOOP;

  INSERT INTO public.owner_election_ballots AS oeb (
    property_id,
    meeting_id,
    agenda_item_id,
    unit_no,
    voter_user_id,
    selected_candidate_ids,
    submitted_at,
    updated_at
  )
  VALUES (
    v_property,
    p_meeting_id,
    p_agenda_item_id,
    v_unit,
    uid,
    coalesce(p_selected_candidate_ids, '[]'::jsonb),
    now(),
    now()
  )
  ON CONFLICT (meeting_id, agenda_item_id, lower(trim(unit_no)))
  DO UPDATE SET
    selected_candidate_ids = EXCLUDED.selected_candidate_ids,
    voter_user_id = EXCLUDED.voter_user_id,
    updated_at = now();

  RETURN json_build_object('ok', true);
END;
$$;

COMMENT ON FUNCTION public.submit_owner_election_ballot(uuid, uuid, jsonb) IS
  'Upsert election ballot; remote-written v3 uses council scheduled_at..+14d and skips nomination_still_open / OV open window.';

REVOKE ALL ON FUNCTION public.submit_owner_election_ballot(uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_owner_election_ballot(uuid, uuid, jsonb) TO authenticated;

COMMIT;
