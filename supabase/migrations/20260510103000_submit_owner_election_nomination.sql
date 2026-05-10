-- Owner self-nomination for council elections (embedded election meta in meeting_agenda_items.description_zh).
-- Tightens submit_owner_election_ballot: blocked while nomination closes_at is still in the future.

BEGIN;

CREATE OR REPLACE FUNCTION public.submit_owner_election_nomination(
  p_meeting_id uuid,
  p_agenda_item_id uuid,
  p_name text,
  p_statement text
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

  v_ov_title text;
  v_ov_property uuid;
  v_council_id uuid;

  v_desc_zh text;
  v_agenda_property uuid;

  marker CONSTANT text := '<!--clearstrata-election-agenda';
  pos int;

  meta jsonb;
  new_meta jsonb;
  new_cand jsonb;

  visible text;
  rebuilt text;

  cand jsonb;
  j int;
  cand_len int;

  nm_opens timestamptz;
  nm_closes timestamptz;

  cand_unit text;
  nm_name text := trim(both FROM coalesce(p_name, ''));

  allow_self boolean := false;

BEGIN
  IF uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF length(nm_name) < 1 OR length(nm_name) > 160 THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_name');
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

  IF v_unit IS NULL OR v_unit = '' THEN
    RETURN json_build_object('ok', false, 'error', 'missing_unit_no');
  END IF;

  SELECT trim(both FROM coalesce(title, '')), property_id
    INTO v_ov_title, v_ov_property
  FROM public.owner_vote_meetings om
  WHERE om.id = p_meeting_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'meeting_not_found');
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

  SELECT mai.description_zh, mai.property_id
    INTO v_desc_zh, v_agenda_property
  FROM public.meeting_agenda_items mai
  WHERE mai.id = p_agenda_item_id
    AND mai.property_id = v_property
    AND mai.meeting_id = v_council_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'agenda_not_found');
  END IF;

  meta := public.try_extract_election_agenda_meta(v_desc_zh);

  IF meta IS NULL OR coalesce(trim(both FROM meta ->> 'agenda_type'), '') <> 'council_election'::text THEN
    RETURN json_build_object('ok', false, 'error', 'not_election_agenda');
  END IF;

  IF meta ? 'allow_self_nomination' THEN
    IF jsonb_typeof(meta -> 'allow_self_nomination') = 'boolean' THEN
      allow_self := (meta -> 'allow_self_nomination')::text = 'true';
    ELSE
      allow_self :=
        lower(trim(both FROM coalesce(meta ->> 'allow_self_nomination', 'false')))
        IN ('true', 't', '1', 'yes');
    END IF;
  END IF;

  IF NOT allow_self THEN
    RETURN json_build_object('ok', false, 'error', 'self_nomination_not_allowed');
  END IF;

  nm_opens := NULL;
  IF meta ? 'nomination_opens_at' AND trim(both FROM meta ->> 'nomination_opens_at') <> '' THEN
    BEGIN
      nm_opens := (trim(both FROM meta ->> 'nomination_opens_at'))::timestamptz;
    EXCEPTION WHEN OTHERS THEN
      nm_opens := NULL;
    END;
  END IF;

  nm_closes := NULL;
  IF meta ? 'nomination_closes_at' AND trim(both FROM meta ->> 'nomination_closes_at') <> '' THEN
    BEGIN
      nm_closes := (trim(both FROM meta ->> 'nomination_closes_at'))::timestamptz;
    EXCEPTION WHEN OTHERS THEN
      nm_closes := NULL;
    END;
  END IF;

  IF nm_opens IS NOT NULL AND now() < nm_opens THEN
    RETURN json_build_object('ok', false, 'error', 'nomination_not_started');
  END IF;

  IF nm_closes IS NOT NULL AND now() >= nm_closes THEN
    RETURN json_build_object('ok', false, 'error', 'nomination_closed');
  END IF;

  IF nm_closes IS NULL AND trim(both FROM coalesce(meta ->> 'nomination_status'::text, '')) = 'closed'::text THEN
    RETURN json_build_object('ok', false, 'error', 'nomination_closed');
  END IF;

  cand_len := GREATEST(coalesce(jsonb_array_length(meta -> 'candidates'), 0) - 1, -1);
  FOR j IN 0 .. cand_len LOOP
    cand := meta -> 'candidates' -> j;
    IF cand IS NULL OR jsonb_typeof(cand) <> 'object'::text THEN
      CONTINUE;
    END IF;
    cand_unit := lower(trim(both FROM coalesce(cand ->> 'unit_no'::text, '')));
    IF cand_unit <> '' AND cand_unit = lower(trim(v_unit)) THEN
      RETURN json_build_object('ok', false, 'error', 'duplicate_candidate');
    END IF;
  END LOOP;

  new_cand := jsonb_strip_nulls(jsonb_build_object(
    'id', gen_random_uuid()::text,
    'name', nm_name,
    'unit_no', v_unit,
    'statement', NULLIF(trim(both FROM coalesce(p_statement, '')), ''),
    'nominated_by', 'self'::text,
    'accepted', true,
    'created_at', to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  ));

  new_meta := jsonb_set(
    meta,
    '{candidates}'::text[],
    coalesce(meta -> 'candidates', '[]'::jsonb) || jsonb_build_array(new_cand),
    true
  );

  pos := strpos(v_desc_zh, marker);

  IF pos <= 0 THEN
    RETURN json_build_object('ok', false, 'error', 'not_election_agenda');
  END IF;

  IF pos > 1 THEN
    visible := trim(both FROM substring(v_desc_zh FROM 1 FOR pos - 1));
  ELSE
    visible := '';
  END IF;

  rebuilt := CASE
    WHEN visible IS NULL OR visible = '' THEN concat(marker, E'\n', new_meta::text, E'\n-->')
    ELSE concat(visible, E'\n\n', marker, E'\n', new_meta::text, E'\n-->')
  END;

  UPDATE public.meeting_agenda_items mai
    SET description_zh = rebuilt,
        updated_at = now()
  WHERE mai.id = p_agenda_item_id
    AND mai.meeting_id = v_council_id
    AND mai.property_id = v_property;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'agenda_update_failed');
  END IF;

  RETURN json_build_object('ok', true);
END;
$$;

COMMENT ON FUNCTION public.submit_owner_election_nomination(uuid, uuid, text, text)
  IS 'Eligible owner adds self candidate to embedded election agenda meta (SECURITY DEFINER).';

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
    lower(trim(both FROM coalesce(status, ''))),
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

  IF ov_status IS DISTINCT FROM 'open'::text THEN
    RETURN json_build_object('ok', false, 'error', 'voting_not_open');
  END IF;

  IF vo IS NOT NULL AND now() < vo THEN
    RETURN json_build_object('ok', false, 'error', 'voting_not_open');
  END IF;

  IF vc IS NOT NULL AND now() > vc THEN
    RETURN json_build_object('ok', false, 'error', 'voting_not_open');
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

COMMENT ON FUNCTION public.submit_owner_election_ballot(uuid, uuid, jsonb)
  IS 'Upsert election ballot (one per unit). Blocks until nomination closes when nomination_closes_at embedded.';

REVOKE ALL ON FUNCTION public.submit_owner_election_nomination(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_owner_election_nomination(uuid, uuid, text, text) TO authenticated;

COMMIT;
