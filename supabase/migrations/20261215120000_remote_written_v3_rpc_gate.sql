-- Remote written v3: SQL helper + RPC/assert gates (14-day participation window).
-- v3 is detected from meetings.description_zh meta only — never meeting_format = 'written_remote'.
-- Runs after 20261206120000_election_triple_phase_canon_assert.sql.

BEGIN;

-- ---------------------------------------------------------------------------
-- Helper: council meeting row is remote-written v3 (HTML comment JSON in description_zh)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_remote_written_v3_meeting(p_meeting_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  desc_text text;
  compact text;
BEGIN
  IF p_meeting_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT m.description_zh
  INTO desc_text
  FROM public.meetings m
  WHERE m.id = p_meeting_id
  LIMIT 1;

  IF desc_text IS NULL OR length(trim(desc_text)) = 0 THEN
    RETURN false;
  END IF;

  IF desc_text NOT LIKE '%clearstrata-written-remote%' THEN
    RETURN false;
  END IF;

  compact := regexp_replace(desc_text, '\s+', '', 'g');

  RETURN (
      compact LIKE '%"v":3%'
      OR compact LIKE '%"version":3%'
    )
    AND (
      compact LIKE '%"mode":"remote_written"%'
      OR compact LIKE '%"mode":"written_remote"%'
    );
END;
$$;

COMMENT ON FUNCTION public.is_remote_written_v3_meeting(uuid) IS
  'True when meetings.description_zh embeds remote-written v3 marker (clearstrata-written-remote + v/version 3 + mode).';

REVOKE ALL ON FUNCTION public.is_remote_written_v3_meeting(uuid) FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- submit_owner_vote: v3 uses council meeting scheduled_at .. +14d; skips OV open/freeze/window
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- assert_council_election_timeline: v3 uses single 14-day window (not 7+7+7)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assert_council_election_timeline(
  p_scheduled_at timestamptz,
  p_meeting_format text,
  p_meeting_description_zh text,
  p_voting_open_row timestamptz,
  p_voting_close_row timestamptz,
  p_nomination_open_text text,
  p_nomination_close_text text
)
RETURNS void
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  tol double precision := 120;

  compact text;
  is_rw_v3 boolean := false;

  canon_notice_close timestamptz;
  canon_nom_open timestamptz;
  canon_nom_close timestamptz;
  canon_vote_open timestamptz;
  canon_vote_close timestamptz;

  schedule_meta jsonb;
  nom_open timestamptz;
  nom_close timestamptz;
  voting_open timestamptz;
  voting_close timestamptz;

  notice_close_stored timestamptz;
  meta_vo timestamptz;
  meta_vc timestamptz;

  hybrid boolean := lower(trim(both FROM coalesce(p_meeting_format, ''))) = 'hybrid';
BEGIN
  compact := regexp_replace(coalesce(p_meeting_description_zh, ''), '\s+', '', 'g');
  IF p_meeting_description_zh IS NOT NULL
    AND p_meeting_description_zh LIKE '%clearstrata-written-remote%'
    AND (
      compact LIKE '%"v":3%'
      OR compact LIKE '%"version":3%'
    )
    AND (
      compact LIKE '%"mode":"remote_written"%'
      OR compact LIKE '%"mode":"written_remote"%'
    )
  THEN
    is_rw_v3 := true;
  END IF;

  IF is_rw_v3 THEN
    IF p_scheduled_at IS NULL THEN
      RAISE EXCEPTION 'invalid_election_timeline';
    END IF;

    canon_nom_open := p_scheduled_at;
    canon_nom_close := p_scheduled_at + interval '14 days';
    canon_vote_open := p_scheduled_at;
    canon_vote_close := p_scheduled_at + interval '14 days';
    canon_notice_close := p_scheduled_at + interval '14 days';

    nom_open := public.parse_ts_iso_text(p_nomination_open_text);
    nom_close := public.parse_ts_iso_text(p_nomination_close_text);

    IF nom_open IS NULL OR nom_close IS NULL THEN
      RAISE EXCEPTION 'invalid_election_timeline';
    END IF;

    IF ABS(EXTRACT(EPOCH FROM (nom_open - canon_nom_open))) > tol THEN
      RAISE EXCEPTION 'invalid_election_timeline';
    END IF;

    IF ABS(EXTRACT(EPOCH FROM (nom_close - canon_nom_close))) > tol THEN
      RAISE EXCEPTION 'invalid_election_timeline';
    END IF;

    voting_open := p_voting_open_row;
    voting_close := p_voting_close_row;

    IF voting_open IS NULL OR voting_close IS NULL THEN
      RAISE EXCEPTION 'invalid_election_timeline';
    END IF;

    IF ABS(EXTRACT(EPOCH FROM (voting_open - canon_vote_open))) > tol THEN
      RAISE EXCEPTION 'invalid_election_timeline';
    END IF;

    IF ABS(EXTRACT(EPOCH FROM (voting_close - canon_vote_close))) > tol THEN
      RAISE EXCEPTION 'invalid_election_timeline';
    END IF;

    IF NOT (nom_close > nom_open) THEN
      RAISE EXCEPTION 'invalid_election_timeline';
    END IF;

    IF NOT (voting_close > voting_open) THEN
      RAISE EXCEPTION 'invalid_election_timeline';
    END IF;

    schedule_meta := public.try_extract_written_remote_schedule_meta(p_meeting_description_zh);

    IF hybrid
      AND schedule_meta IS NOT NULL
      AND (
        coalesce((schedule_meta ->> 'v')::text, '') = '3'
        OR coalesce((schedule_meta ->> 'version')::text, '') = '3'
      ) THEN

      notice_close_stored :=
        COALESCE(
          public.parse_ts_iso_text(schedule_meta ->> 'public_notice_close_at'),
          public.parse_ts_iso_text(schedule_meta ->> 'discussion_closes_at')
        );

      IF notice_close_stored IS NULL THEN
        RAISE EXCEPTION 'invalid_election_timeline';
      END IF;

      IF ABS(EXTRACT(EPOCH FROM (notice_close_stored - canon_notice_close))) > tol THEN
        RAISE EXCEPTION 'invalid_election_timeline';
      END IF;

      meta_vo := public.parse_ts_iso_text(schedule_meta ->> 'voting_open_at');
      meta_vc := public.parse_ts_iso_text(schedule_meta ->> 'voting_close_at');

      IF meta_vo IS NOT NULL AND ABS(EXTRACT(EPOCH FROM (meta_vo - canon_vote_open))) > tol THEN
        RAISE EXCEPTION 'invalid_election_timeline';
      END IF;

      IF meta_vc IS NOT NULL AND ABS(EXTRACT(EPOCH FROM (meta_vc - canon_vote_close))) > tol THEN
        RAISE EXCEPTION 'invalid_election_timeline';
      END IF;
    END IF;

    RETURN;
  END IF;

  IF p_scheduled_at IS NULL THEN
    RAISE EXCEPTION 'invalid_election_timeline';
  END IF;

  canon_notice_close := p_scheduled_at + interval '7 days';
  canon_nom_open := canon_notice_close;
  canon_nom_close := p_scheduled_at + interval '14 days';
  canon_vote_open := canon_nom_close;
  canon_vote_close := p_scheduled_at + interval '21 days';

  nom_open := public.parse_ts_iso_text(p_nomination_open_text);
  nom_close := public.parse_ts_iso_text(p_nomination_close_text);

  IF nom_open IS NULL OR nom_close IS NULL THEN
    RAISE EXCEPTION 'invalid_election_timeline';
  END IF;

  IF ABS(EXTRACT(EPOCH FROM (nom_open - canon_nom_open))) > tol THEN
    RAISE EXCEPTION 'invalid_election_timeline';
  END IF;

  IF ABS(EXTRACT(EPOCH FROM (nom_close - canon_nom_close))) > tol THEN
    RAISE EXCEPTION 'invalid_election_timeline';
  END IF;

  voting_open := p_voting_open_row;
  voting_close := p_voting_close_row;

  IF voting_open IS NULL OR voting_close IS NULL THEN
    RAISE EXCEPTION 'invalid_election_timeline';
  END IF;

  IF ABS(EXTRACT(EPOCH FROM (voting_open - canon_vote_open))) > tol THEN
    RAISE EXCEPTION 'invalid_election_timeline';
  END IF;

  IF ABS(EXTRACT(EPOCH FROM (voting_close - canon_vote_close))) > tol THEN
    RAISE EXCEPTION 'invalid_election_timeline';
  END IF;

  schedule_meta := public.try_extract_written_remote_schedule_meta(p_meeting_description_zh);

  IF hybrid
    AND schedule_meta IS NOT NULL
    AND coalesce((schedule_meta ->> 'v')::text, '') = '1' THEN

    notice_close_stored :=
      COALESCE(
        public.parse_ts_iso_text(schedule_meta ->> 'public_notice_close_at'),
        public.parse_ts_iso_text(schedule_meta ->> 'discussion_closes_at')
      );

    IF notice_close_stored IS NULL THEN
      RAISE EXCEPTION 'invalid_election_timeline';
    END IF;

    IF ABS(EXTRACT(EPOCH FROM (notice_close_stored - canon_notice_close))) > tol THEN
      RAISE EXCEPTION 'invalid_election_timeline';
    END IF;

    meta_vo := public.parse_ts_iso_text(schedule_meta ->> 'voting_open_at');
    meta_vc := public.parse_ts_iso_text(schedule_meta ->> 'voting_close_at');

    IF meta_vo IS NOT NULL AND ABS(EXTRACT(EPOCH FROM (meta_vo - canon_vote_open))) > tol THEN
      RAISE EXCEPTION 'invalid_election_timeline';
    END IF;

    IF meta_vc IS NOT NULL AND ABS(EXTRACT(EPOCH FROM (meta_vc - canon_vote_close))) > tol THEN
      RAISE EXCEPTION 'invalid_election_timeline';
    END IF;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.assert_council_election_timeline IS
  'Raises invalid_election_timeline unless rows + meta match canon: remote-written v3 = single 14d window from scheduled_at; else 7+7+7 (+/-120s).';

-- ---------------------------------------------------------------------------
-- submit_owner_election_nomination
-- ---------------------------------------------------------------------------
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

  council_sched timestamptz;
  v_rw_v3 boolean := false;

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

  v_rw_v3 := public.is_remote_written_v3_meeting(v_council_id);

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

  IF v_rw_v3 THEN
    SELECT mm.scheduled_at
    INTO council_sched
    FROM public.meetings mm
    WHERE mm.id = v_council_id
    LIMIT 1;

    IF council_sched IS NULL THEN
      RETURN json_build_object('ok', false, 'error', 'nomination_not_started');
    END IF;

    IF now() < council_sched THEN
      RETURN json_build_object('ok', false, 'error', 'nomination_not_started');
    END IF;

    IF now() >= council_sched + interval '14 days' THEN
      RETURN json_build_object('ok', false, 'error', 'nomination_closed');
    END IF;
  ELSE
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
      RETURN json_build_object('ok', false, 'error', 'nomination_not_open');
    END IF;

    IF nm_closes IS NOT NULL AND now() >= nm_closes THEN
      RETURN json_build_object('ok', false, 'error', 'nomination_closed');
    END IF;

    IF nm_closes IS NULL AND trim(both FROM coalesce(meta ->> 'nomination_status'::text, '')) = 'closed'::text THEN
      RETURN json_build_object('ok', false, 'error', 'nomination_closed');
    END IF;
  END IF;

  cand_len := GREATEST(coalesce(jsonb_array_length(meta -> 'candidates'), 0) - 1, -1);
  FOR j IN 0 .. cand_len LOOP
    cand := meta -> 'candidates' -> j;
    IF cand IS NULL OR jsonb_typeof(cand) <> 'object'::text THEN
      CONTINUE;
    END IF;
    cand_unit := lower(trim(both FROM coalesce(cand ->> 'unit_no'::text, '')));
    IF cand_unit <> '' AND cand_unit = lower(trim(v_unit)) THEN
      IF v_rw_v3 THEN
        RETURN json_build_object('ok', false, 'error', 'already_submitted');
      END IF;
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

REVOKE ALL ON FUNCTION public.submit_owner_election_nomination(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_owner_election_nomination(uuid, uuid, text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- submit_owner_election_ballot
-- ---------------------------------------------------------------------------
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
