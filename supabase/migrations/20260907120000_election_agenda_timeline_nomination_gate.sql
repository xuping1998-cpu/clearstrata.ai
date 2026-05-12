-- Council election agendas: timeline validation + nomination-window gates on candidate edits.
BEGIN;

CREATE OR REPLACE FUNCTION public.try_extract_written_remote_schedule_meta(p_desc_zh text)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  marker CONSTANT text := '<!--clearstrata-written-remote' || E'\n';
  marker_len int := char_length(marker);
  needle_from int := 1;
  rel int;
  last_i int := 0;
  chunk text;
  k int;
  json_candidate text;
BEGIN
  IF p_desc_zh IS NULL OR length(trim(p_desc_zh)) = 0 THEN
    RETURN NULL;
  END IF;

  LOOP
    rel := strpos(substring(p_desc_zh FROM needle_from), marker);
    EXIT WHEN rel = 0;
    last_i := needle_from + rel - 1;
    needle_from := last_i + marker_len;
  END LOOP;

  IF last_i <= 0 THEN
    RETURN NULL;
  END IF;

  chunk := substring(p_desc_zh FROM last_i + marker_len);

  IF chunk IS NULL OR chunk = '' THEN
    RETURN NULL;
  END IF;

  WHILE chunk <> '' AND (substring(chunk FROM 1 FOR 1)) IN (E' ', E'\t', E'\r')
  LOOP
    chunk := substring(chunk FROM 2);
  END LOOP;

  k := strpos(chunk, E'\n-->');

  IF k = 0 THEN
    RETURN NULL;
  END IF;

  json_candidate := trim(both FROM substring(chunk FROM 1 FOR k - 1));
  IF json_candidate IS NULL OR json_candidate = '' THEN
    RETURN NULL;
  END IF;

  BEGIN
    RETURN json_candidate::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$;

COMMENT ON FUNCTION public.try_extract_written_remote_schedule_meta(text) IS
  'Last <!--clearstrata-written-remote marker in meeting.description_zh — mirrors frontend extractWrittenRemoteMeta.';

CREATE OR REPLACE FUNCTION public._election_candidates_stable_json(p_candidates jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    (
      SELECT jsonb_agg(elem ORDER BY trim(both FROM coalesce(elem ->> 'id', '')))
      FROM jsonb_array_elements(coalesce(p_candidates, '[]'::jsonb)) AS elem
    ),
    '[]'::jsonb
  );
$$;

CREATE OR REPLACE FUNCTION public.parse_ts_iso_text(p_txt text)
RETURNS timestamptz
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  t text := trim(both FROM coalesce(p_txt, ''));
BEGIN
  IF t = '' THEN
    RETURN NULL;
  END IF;
  BEGIN
    RETURN t::timestamptz;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$;

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
  schedule_meta jsonb;
  schedule_valid boolean := false;

  hybrid boolean := lower(trim(both FROM coalesce(p_meeting_format, ''))) = 'hybrid';

  discussion_start timestamptz;
  discussion_end timestamptz;

  voting_open timestamptz;
  voting_close timestamptz;

  nom_open timestamptz;
  nom_close timestamptz;
BEGIN
  schedule_meta := public.try_extract_written_remote_schedule_meta(p_meeting_description_zh);

  IF schedule_meta IS NOT NULL AND coalesce((schedule_meta ->> 'v')::text, '') = '1' THEN
    schedule_valid :=
      length(trim(both FROM coalesce(schedule_meta ->> 'discussion_closes_at'::text, ''))) > 0
      OR length(trim(both FROM coalesce(schedule_meta ->> 'voting_open_at'::text, ''))) > 0
      OR length(trim(both FROM coalesce(schedule_meta ->> 'voting_close_at'::text, ''))) > 0;
  ELSE
    schedule_meta := NULL;
  END IF;

  IF hybrid AND schedule_valid THEN
    discussion_start := p_scheduled_at;
    discussion_end := public.parse_ts_iso_text(schedule_meta ->> 'discussion_closes_at'::text);
  ELSE
    discussion_start := NULL;
    discussion_end := NULL;
  END IF;

  voting_open := p_voting_open_row;
  voting_close := p_voting_close_row;

  IF voting_open IS NULL AND voting_close IS NULL AND schedule_meta IS NOT NULL THEN
    voting_open := public.parse_ts_iso_text(schedule_meta ->> 'voting_open_at'::text);
    voting_close := public.parse_ts_iso_text(schedule_meta ->> 'voting_close_at'::text);
  END IF;

  IF voting_open IS NULL AND voting_close IS NULL AND hybrid AND schedule_valid THEN
    voting_open := COALESCE(discussion_start, discussion_end);
    voting_close := COALESCE(discussion_end, discussion_start);
  END IF;

  nom_open := public.parse_ts_iso_text(p_nomination_open_text);
  nom_close := public.parse_ts_iso_text(p_nomination_close_text);

  IF discussion_start IS NOT NULL AND discussion_end IS NOT NULL THEN
    IF NOT (discussion_start < discussion_end) THEN
      RAISE EXCEPTION 'invalid_election_timeline';
    END IF;
  END IF;

  IF nom_open IS NOT NULL AND discussion_start IS NOT NULL THEN
    IF nom_open < discussion_start THEN
      RAISE EXCEPTION 'invalid_election_timeline';
    END IF;
  END IF;

  IF nom_open IS NOT NULL AND nom_close IS NOT NULL THEN
    IF NOT (nom_close > nom_open) THEN
      RAISE EXCEPTION 'invalid_election_timeline';
    END IF;
  END IF;

  IF nom_close IS NOT NULL AND voting_open IS NOT NULL THEN
    IF NOT (voting_open > nom_close) THEN
      RAISE EXCEPTION 'invalid_election_timeline';
    END IF;
  END IF;

  IF voting_open IS NOT NULL AND voting_close IS NOT NULL THEN
    IF NOT (voting_close > voting_open) THEN
      RAISE EXCEPTION 'invalid_election_timeline';
    END IF;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.assert_council_election_timeline IS
  'Raises invalid_election_timeline when mandatory ordering fails (pairs must both be parsable timestamps). Mirrors analyzeCouncilElectionTimeline.';

DROP TRIGGER IF EXISTS trg_meeting_agenda_items_election_rules ON public.meeting_agenda_items;

CREATE OR REPLACE FUNCTION public.trg_meeting_agenda_items_election_rules()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  new_meta jsonb;
  prev_meta jsonb;
  cand_old jsonb;
  cand_new jsonb;
  m record;

  nm_opens timestamptz;
  nm_closes timestamptz;
BEGIN
  IF TG_OP = 'UPDATE'
    AND NEW.description_zh IS NOT DISTINCT FROM OLD.description_zh THEN
    RETURN NEW;
  END IF;

  new_meta := public.try_extract_election_agenda_meta(NEW.description_zh);

  IF new_meta IS NULL OR lower(trim(both FROM coalesce(new_meta ->> 'agenda_type'::text, ''))) <> 'council_election'::text THEN
    RETURN NEW;
  END IF;

  SELECT
      mr.scheduled_at,
      mr.meeting_format::text,
      mr.description_zh,
      mr.voting_open_at,
      mr.voting_close_at
    INTO m
    FROM public.meetings mr
    WHERE mr.id = NEW.meeting_id
    LIMIT 1;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  PERFORM public.assert_council_election_timeline(
    m.scheduled_at,
    m.meeting_format,
    m.description_zh,
    m.voting_open_at,
    m.voting_close_at,
    new_meta ->> 'nomination_opens_at'::text,
    new_meta ->> 'nomination_closes_at'::text
  );

  cand_new := COALESCE(new_meta -> 'candidates', '[]'::jsonb);

  IF TG_OP = 'INSERT' THEN
    cand_old := '[]'::jsonb;
  ELSE
    prev_meta := public.try_extract_election_agenda_meta(OLD.description_zh);

    cand_old :=
      CASE
        WHEN prev_meta IS NULL THEN '[]'::jsonb
        ELSE COALESCE(prev_meta -> 'candidates', '[]'::jsonb)
      END;
  END IF;

  IF public._election_candidates_stable_json(cand_old) IS DISTINCT FROM public._election_candidates_stable_json(cand_new) THEN
    nm_opens := NULL;
    IF new_meta ? 'nomination_opens_at'::text AND length(trim(both FROM coalesce(new_meta ->> 'nomination_opens_at'::text, ''))) > 0 THEN
      BEGIN
        nm_opens := trim(both FROM new_meta ->> 'nomination_opens_at'::text)::timestamptz;
      EXCEPTION WHEN OTHERS THEN
        nm_opens := NULL;
      END;
    END IF;

    nm_closes := NULL;
    IF new_meta ? 'nomination_closes_at'::text AND length(trim(both FROM coalesce(new_meta ->> 'nomination_closes_at'::text, ''))) > 0 THEN
      BEGIN
        nm_closes := trim(both FROM new_meta ->> 'nomination_closes_at'::text)::timestamptz;
      EXCEPTION WHEN OTHERS THEN
        nm_closes := NULL;
      END;
    END IF;

    IF nm_opens IS NOT NULL AND clock_timestamp() < nm_opens THEN
      RAISE EXCEPTION 'nomination_not_open';
    END IF;

    IF nm_closes IS NOT NULL AND clock_timestamp() >= nm_closes THEN
      RAISE EXCEPTION 'nomination_closed';
    END IF;

    IF nm_closes IS NULL AND trim(both FROM coalesce(new_meta ->> 'nomination_status'::text, '')) = 'closed'::text THEN
      RAISE EXCEPTION 'nomination_closed';
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_meeting_agenda_items_election_rules
  BEFORE INSERT OR UPDATE OF description_zh ON public.meeting_agenda_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_meeting_agenda_items_election_rules();

COMMENT ON TRIGGER trg_meeting_agenda_items_election_rules ON public.meeting_agenda_items IS
  'Council election agendas: validates timeline ordering; blocks candidate edits outside nomination window.';

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
    RETURN json_build_object('ok', false, 'error', 'nomination_not_open');
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

COMMIT;
