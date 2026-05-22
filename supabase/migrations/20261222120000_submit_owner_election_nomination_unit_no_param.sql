-- Owner / council eligible voter can nominate any candidate (self or others),
-- including candidates whose unit number is unknown.
--
-- Key business rules implemented here:
--   1. Caller must be an eligible voter on the meeting
--      (`owner_vote_voter_snapshot.is_eligible IS TRUE`).
--   2. Caller's snapshot unit (`v_unit`) is ONLY used to confirm eligibility
--      and to label `nominated_by`; it is no longer used for duplicate
--      detection.
--   3. The candidate's unit is `p_unit_no`, supplied by the form. It is
--      OPTIONAL — `NULL` / empty is allowed, because the nominator may not
--      know the candidate's exact unit yet.
--   4. Duplicate detection:
--        - If `p_unit_no` is non-empty AND another candidate has the same
--          unit -> `duplicate_candidate`.
--        - If `p_unit_no` is empty, do NOT reject just because the caller's
--          snapshot unit already has a candidate.
--        - Same-name (normalized) candidates also return
--          `duplicate_candidate` as a coarse guard; this is a known weak
--          check (cannot resolve aliases like Michael / Mike), tightened
--          later if/when stronger identifiers are added.
--   5. No `already_submitted` path — that bug-era code conflated "caller has
--      a candidate on their unit" with "duplicate". Removed entirely.

BEGIN;

DROP FUNCTION IF EXISTS public.submit_owner_election_nomination(uuid, uuid, text, text);
DROP FUNCTION IF EXISTS public.submit_owner_election_nomination(uuid, uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.submit_owner_election_nomination(
  p_meeting_id uuid,
  p_agenda_item_id uuid,
  p_name text,
  p_statement text,
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
  cand_name text;

  nm_name text := trim(both FROM coalesce(p_name, ''));
  nm_name_norm text := lower(nm_name);

  -- Candidate's unit may legitimately be NULL/empty when the nominator
  -- doesn't know it. Treat both states identically downstream.
  nm_unit_raw text := trim(both FROM coalesce(p_unit_no, ''));
  nm_unit_norm text :=
    CASE WHEN nm_unit_raw = '' THEN NULL ELSE lower(nm_unit_raw) END;

  allow_self boolean := false;

  council_sched timestamptz;
  v_rw_v3 boolean := false;

  v_nominator_label text;
BEGIN
  IF uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF length(nm_name) < 1 OR length(nm_name) > 160 THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_name');
  END IF;

  -- Eligibility gate — uses snapshot identity only.
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
  v_unit_norm := lower(v_unit);

  IF v_unit IS NULL OR v_unit = '' THEN
    -- Snapshot row exists but has no unit — caller is not actually a unit voter.
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

  -- Duplicate detection: ONLY on the candidate's own identity (`p_unit_no`
  -- and `p_name`), NEVER on the caller's snapshot unit. Empty `p_unit_no` is
  -- allowed and skips the unit-collision check so nominations without a
  -- known unit are accepted.
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
      -- Coarse name match (Mike vs Michael, etc. are NOT resolved here).
      RETURN json_build_object('ok', false, 'error', 'duplicate_candidate');
    END IF;
  END LOOP;

  v_nominator_label :=
    CASE WHEN nm_unit_norm IS NOT NULL AND nm_unit_norm = v_unit_norm THEN 'self'
         ELSE v_unit
    END;

  -- Persist NULL when unit is unknown so consumers can distinguish "no unit
  -- supplied" from "unit = empty string". `jsonb_strip_nulls` drops the key
  -- in that case.
  new_cand := jsonb_strip_nulls(jsonb_build_object(
    'id', gen_random_uuid()::text,
    'name', nm_name,
    'unit_no', CASE WHEN nm_unit_raw = '' THEN NULL ELSE nm_unit_raw END,
    'statement', NULLIF(trim(both FROM coalesce(p_statement, '')), ''),
    'nominated_by', v_nominator_label,
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

REVOKE ALL ON FUNCTION public.submit_owner_election_nomination(uuid, uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_owner_election_nomination(uuid, uuid, text, text, text) TO authenticated;

COMMENT ON FUNCTION public.submit_owner_election_nomination(uuid, uuid, text, text, text)
  IS 'Eligible owner / council voter nominates a candidate (self or others). p_unit_no is optional. Duplicate detection uses the candidate''s p_unit_no (only when non-empty) and p_name. SECURITY DEFINER.';

COMMIT;
