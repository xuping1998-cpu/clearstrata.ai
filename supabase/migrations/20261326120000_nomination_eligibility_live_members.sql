-- Phase 7L: nomination eligibility from live property_members; voting still uses frozen snapshot.

CREATE OR REPLACE FUNCTION public.submit_owner_election_nomination(
  p_meeting_id uuid,
  p_agenda_item_id uuid,
  p_name text,
  p_statement text DEFAULT NULL,
  p_unit_no text DEFAULT NULL
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
  v_unit_norm text;
  v_property uuid;

  v_ov_title text;
  v_ov_property uuid;
  v_ov_description text;
  v_council_id uuid;

  v_desc_zh text;
  v_agenda_property uuid;

  meta jsonb;
  new_meta jsonb;
  new_cand jsonb;

  rebuilt text;

  cand jsonb;
  j int;
  cand_len int;

  nm_opens timestamptz;
  nm_closes timestamptz;

  cand_unit text;
  cand_name text;

  nm_name text := trim(both FROM coalesce(p_name, ''));
  nm_name_norm text := lower(nm_name);

  nm_unit_raw text := trim(both FROM coalesce(p_unit_no, ''));
  nm_unit_norm text :=
    CASE WHEN nm_unit_raw = '' THEN NULL ELSE lower(nm_unit_raw) END;

  allow_self boolean := false;

  council_sched timestamptz;
  v_rw_v3 boolean := false;

  v_nominator_label text;
  v_nomination_source text;
  v_is_self boolean := false;
BEGIN
  IF uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF length(nm_name) < 1 OR length(nm_name) > 160 THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_name');
  END IF;

  SELECT
    trim(both FROM coalesce(om.title, '')),
    om.property_id,
    om.description
    INTO v_ov_title, v_property, v_ov_description
  FROM public.owner_vote_meetings om
  WHERE om.id = p_meeting_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'meeting_not_found');
  END IF;

  v_ov_property := v_property;

  SELECT pm.unit_no
    INTO v_unit_raw
  FROM public.property_members pm
  WHERE pm.user_id = uid
    AND pm.property_id = v_property
    AND coalesce(pm.status::text, 'active') = 'active'
    AND lower(trim(pm.role::text)) IN ('owner', 'council')
    AND pm.unit_no IS NOT NULL
    AND length(trim(pm.unit_no)) > 0
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'not_eligible_to_vote');
  END IF;

  v_unit := trim(both FROM coalesce(v_unit_raw::text, ''));
  v_unit_norm := lower(v_unit);

  IF v_unit IS NULL OR v_unit = '' THEN
    RETURN json_build_object('ok', false, 'error', 'missing_unit_no');
  END IF;

  IF public._owner_election_ballots_locked(p_meeting_id) THEN
    RETURN json_build_object('ok', false, 'error', 'ballots_exist_locked');
  END IF;

  v_council_id := public._owner_election_resolve_council_meeting_id(
    v_ov_property,
    v_ov_title,
    v_ov_description
  );

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
    cand_name := lower(trim(both FROM coalesce(cand ->> 'name'::text, '')));

    IF nm_unit_norm IS NOT NULL
       AND cand_unit <> ''
       AND cand_unit = nm_unit_norm THEN
      RETURN json_build_object('ok', false, 'error', 'duplicate_candidate');
    END IF;

    IF cand_name <> '' AND cand_name = nm_name_norm THEN
      RETURN json_build_object('ok', false, 'error', 'duplicate_candidate');
    END IF;
  END LOOP;

  v_is_self := nm_unit_norm IS NOT NULL AND nm_unit_norm = v_unit_norm;
  v_nominator_label := CASE WHEN v_is_self THEN 'self' ELSE v_unit END;
  v_nomination_source := CASE WHEN v_is_self THEN 'self' ELSE 'owner' END;

  new_cand := jsonb_strip_nulls(jsonb_build_object(
    'id', gen_random_uuid()::text,
    'name', nm_name,
    'unit_no', CASE WHEN nm_unit_raw = '' THEN NULL ELSE nm_unit_raw END,
    'statement', NULLIF(trim(both FROM coalesce(p_statement, '')), ''),
    'nominated_by', v_nominator_label,
    'nominated_by_user_id', uid::text,
    'nominated_by_unit', v_unit,
    'nomination_source', v_nomination_source,
    'accepted', false,
    'created_at', to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  ));

  new_meta := jsonb_set(
    meta,
    '{candidates}'::text[],
    coalesce(meta -> 'candidates', '[]'::jsonb) || jsonb_build_array(new_cand),
    true
  );

  rebuilt := public._owner_election_rebuild_agenda_description(v_desc_zh, new_meta);
  IF rebuilt IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_election_agenda');
  END IF;

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

COMMENT ON FUNCTION public.submit_owner_election_nomination(uuid, uuid, text, text, text) IS
  'Election nomination during nomination window; eligibility from active property_members (owner/council with unit_no). Voting still uses frozen snapshot.';

REVOKE ALL ON FUNCTION public.submit_owner_election_nomination(uuid, uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_owner_election_nomination(uuid, uuid, text, text, text) TO authenticated;
