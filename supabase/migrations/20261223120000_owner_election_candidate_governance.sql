-- Phase 1: owner election candidate governance (SQL / RPC only).
-- Extends submit_owner_election_nomination; adds delete + review RPCs.
-- Does NOT touch ballot RPC, freeze_owner_vote_snapshot, or frontend.

BEGIN;

-- ---------------------------------------------------------------------------
-- Shared helpers (internal; not granted to authenticated)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._owner_election_ballots_locked(p_meeting_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    to_regclass('public.owner_election_ballots') IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.owner_election_ballots oeb
      WHERE oeb.meeting_id = p_meeting_id
      LIMIT 1
    );
$$;

-- Parse <!--clearstrata-council-meeting-binding … {"v":1,"council_meeting_id":"…"} … -->
-- from owner_vote_meetings.description (canonical link to public.meetings).
CREATE OR REPLACE FUNCTION public._owner_election_parse_council_meeting_binding(p_description text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_bind_match text[];
  v_bind_raw text;
  v_bind jsonb;
  v_cid text;
BEGIN
  IF p_description IS NULL OR trim(both FROM p_description) = '' THEN
    RETURN NULL;
  END IF;

  v_bind_match := regexp_match(
    p_description,
    '<!--clearstrata-council-meeting-binding[\s\S]*?-->'
  );
  IF v_bind_match IS NULL OR v_bind_match[1] IS NULL THEN
    RETURN NULL;
  END IF;

  v_bind_raw := trim(both FROM regexp_replace(v_bind_match[1], '^<!--clearstrata-council-meeting-binding\s*', ''));
  v_bind_raw := trim(both FROM regexp_replace(v_bind_raw, '-->$', ''));

  BEGIN
    v_bind := v_bind_raw::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;

  IF v_bind IS NULL OR coalesce((v_bind ->> 'v')::int, 0) <> 1 THEN
    RETURN NULL;
  END IF;

  v_cid := trim(both FROM coalesce(v_bind ->> 'council_meeting_id', ''));
  IF v_cid = '' THEN
    RETURN NULL;
  END IF;

  BEGIN
    RETURN v_cid::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$;

-- Resolve council meetings.id for an owner_vote_meetings row.
-- Strict binding-first contract:
--   * If description carries the <!--clearstrata-council-meeting-binding marker
--     at all, binding is the only acceptable source. Any failure (bad JSON,
--     non-uuid, wrong property_id, wrong meeting_type, missing row) returns
--     NULL so callers surface `council_meeting_not_found` instead of silently
--     attaching to a same-titled legacy meeting.
--   * Title fallback (unreliable: OV title may be a short code like 'sgm8'
--     while council title is something like '罢免现任业委会') is ONLY used
--     when the description has no binding marker at all — i.e. legacy rows
--     that were created before the binding format existed.
CREATE OR REPLACE FUNCTION public._owner_election_resolve_council_meeting_id(
  p_ov_property_id uuid,
  p_ov_title text,
  p_ov_description text
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_binding_marker boolean := false;
  v_bound uuid;
  v_council_id uuid;
  v_title text := trim(both FROM coalesce(p_ov_title, ''));
BEGIN
  v_has_binding_marker :=
    p_ov_description IS NOT NULL
    AND position('<!--clearstrata-council-meeting-binding' IN p_ov_description) > 0;

  IF v_has_binding_marker THEN
    -- Strict path: binding present -> binding is authoritative. Never fall
    -- through to title matching from here.
    v_bound := public._owner_election_parse_council_meeting_binding(p_ov_description);
    IF v_bound IS NULL THEN
      -- Marker found but JSON unparseable / v != 1 / council_meeting_id missing
      -- or not a uuid. Surface failure instead of guessing.
      RETURN NULL;
    END IF;

    SELECT m.id
      INTO v_council_id
    FROM public.meetings m
    WHERE m.id = v_bound
      AND m.property_id = p_ov_property_id
      AND lower(coalesce(m.meeting_type::text, '')) IN ('agm', 'sgm')
    LIMIT 1;

    IF NOT FOUND THEN
      -- Binding resolved but row missing / wrong property_id / wrong
      -- meeting_type. Refuse to silently bind to a different meeting.
      RETURN NULL;
    END IF;

    RETURN v_council_id;
  END IF;

  -- LEGACY FALLBACK (unreliable): only reached when description carries no
  -- binding marker at all. Match owner_vote_meetings.title to
  -- meetings.title_zh / title_en. Used to keep pre-binding rows working;
  -- new rows must always embed the binding.
  IF v_title = '' THEN
    RETURN NULL;
  END IF;

  SELECT m.id
    INTO v_council_id
  FROM public.meetings m
  WHERE m.property_id = p_ov_property_id
    AND lower(coalesce(m.meeting_type::text, '')) IN ('agm', 'sgm')
    AND (
      trim(both FROM coalesce(m.title_zh::text, '')) = v_title
      OR trim(both FROM coalesce(m.title_en::text, '')) = v_title
    )
  ORDER BY coalesce(m.created_at, timestamp 'epoch') DESC
  LIMIT 1;

  RETURN v_council_id;
END;
$$;

CREATE OR REPLACE FUNCTION public._owner_election_governance_initiation_type(p_description_zh text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_gov_match text[];
  v_gov_raw text;
  v_gov jsonb;
BEGIN
  IF p_description_zh IS NULL OR trim(both FROM p_description_zh) = '' THEN
    RETURN NULL;
  END IF;

  v_gov_match := regexp_match(p_description_zh, '<!--clearstrata-meeting-governance[\s\S]*?-->');
  IF v_gov_match IS NULL OR v_gov_match[1] IS NULL THEN
    RETURN NULL;
  END IF;

  v_gov_raw := trim(both FROM regexp_replace(v_gov_match[1], '^<!--clearstrata-meeting-governance\s*', ''));
  v_gov_raw := trim(both FROM regexp_replace(v_gov_raw, '-->$', ''));

  BEGIN
    v_gov := v_gov_raw::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;

  IF v_gov IS NULL OR coalesce((v_gov ->> 'v')::int, 0) <> 1 THEN
    RETURN NULL;
  END IF;

  RETURN lower(trim(both FROM coalesce(v_gov ->> 'initiation_type', '')));
END;
$$;

CREATE OR REPLACE FUNCTION public._owner_election_is_owner_requisitioned_initiator(
  p_council_meeting_id uuid,
  p_uid uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_created_by uuid;
  v_desc_zh text;
BEGIN
  IF p_council_meeting_id IS NULL OR p_uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT m.created_by, m.description_zh
    INTO v_created_by, v_desc_zh
  FROM public.meetings m
  WHERE m.id = p_council_meeting_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  RETURN v_created_by = p_uid
    AND public._owner_election_governance_initiation_type(v_desc_zh) = 'owner_requisitioned';
END;
$$;

CREATE OR REPLACE FUNCTION public._owner_election_rebuild_agenda_description(
  p_desc_zh text,
  p_meta jsonb
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  marker CONSTANT text := '<!--clearstrata-election-agenda';
  pos int;
  visible text;
BEGIN
  pos := strpos(coalesce(p_desc_zh, ''), marker);
  IF pos <= 0 THEN
    RETURN NULL;
  END IF;

  IF pos > 1 THEN
    visible := trim(both FROM substring(p_desc_zh FROM 1 FOR pos - 1));
  ELSE
    visible := '';
  END IF;

  RETURN CASE
    WHEN visible IS NULL OR visible = '' THEN concat(marker, E'\n', p_meta::text, E'\n-->')
    ELSE concat(visible, E'\n\n', marker, E'\n', p_meta::text, E'\n-->')
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public._owner_election_append_governance_audit(
  p_meta jsonb,
  p_action text,
  p_actor uuid,
  p_candidate_id text,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  v_entry jsonb;
BEGIN
  v_entry := jsonb_strip_nulls(jsonb_build_object(
    'action', p_action,
    'actor_user_id', p_actor::text,
    'candidate_id', p_candidate_id,
    'at', to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'payload', CASE WHEN p_payload = '{}'::jsonb THEN NULL ELSE p_payload END
  ));

  RETURN jsonb_set(
    coalesce(p_meta, '{}'::jsonb),
    '{governance_audit_log}'::text[],
    coalesce(p_meta -> 'governance_audit_log', '[]'::jsonb) || jsonb_build_array(v_entry),
    true
  );
END;
$$;

-- Optional remote table (if present): mirror audit row. No-op when table absent.
CREATE OR REPLACE FUNCTION public._owner_election_write_audit_row(
  p_property_id uuid,
  p_owner_vote_meeting_id uuid,
  p_agenda_item_id uuid,
  p_actor uuid,
  p_action text,
  p_candidate_id text,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF to_regclass('public.owner_election_governance_audit_log') IS NULL THEN
    RETURN;
  END IF;

  EXECUTE $sql$
    INSERT INTO public.owner_election_governance_audit_log (
      property_id,
      owner_vote_meeting_id,
      agenda_item_id,
      actor_user_id,
      action,
      candidate_id,
      payload,
      created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, now())
  $sql$
  USING
    p_property_id,
    p_owner_vote_meeting_id,
    p_agenda_item_id,
    p_actor,
    p_action,
    p_candidate_id,
    p_payload;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '_owner_election_write_audit_row: %', SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION public._owner_election_ballots_locked(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._owner_election_parse_council_meeting_binding(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._owner_election_resolve_council_meeting_id(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._owner_election_governance_initiation_type(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._owner_election_is_owner_requisitioned_initiator(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._owner_election_rebuild_agenda_description(text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._owner_election_append_governance_audit(jsonb, text, uuid, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._owner_election_write_audit_row(uuid, uuid, uuid, uuid, text, text, jsonb) FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- 1) submit_owner_election_nomination — governance fields + ballot lock
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.submit_owner_election_nomination(uuid, uuid, text, text);
DROP FUNCTION IF EXISTS public.submit_owner_election_nomination(uuid, uuid, text, text, text);

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
    RETURN json_build_object('ok', false, 'error', 'missing_unit_no');
  END IF;

  IF public._owner_election_ballots_locked(p_meeting_id) THEN
    RETURN json_build_object('ok', false, 'error', 'ballots_exist_locked');
  END IF;

  SELECT
    trim(both FROM coalesce(om.title, '')),
    om.property_id,
    om.description
    INTO v_ov_title, v_ov_property, v_ov_description
  FROM public.owner_vote_meetings om
  WHERE om.id = p_meeting_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'meeting_not_found');
  END IF;

  IF v_ov_property <> v_property THEN
    RETURN json_build_object('ok', false, 'error', 'snapshot_mismatch');
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

-- ---------------------------------------------------------------------------
-- 2) delete_owner_election_nomination
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.delete_owner_election_nomination(
  p_meeting_id uuid,
  p_agenda_item_id uuid,
  p_candidate_id text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();

  v_property uuid;
  v_ov_title text;
  v_ov_property uuid;
  v_ov_description text;
  v_council_id uuid;
  v_desc_zh text;

  meta jsonb;
  new_meta jsonb;
  rebuilt text;

  cand jsonb;
  j int;
  cand_len int;
  v_found boolean := false;
  v_cand_id text;

  v_can_delete boolean := false;
  v_is_moderator boolean := false;
  v_nom_uid text;
  v_audit_payload jsonb;
BEGIN
  IF uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  v_cand_id := trim(both FROM coalesce(p_candidate_id, ''));
  IF v_cand_id = '' THEN
    RETURN json_build_object('ok', false, 'error', 'candidate_not_found');
  END IF;

  IF public._owner_election_ballots_locked(p_meeting_id) THEN
    RETURN json_build_object('ok', false, 'error', 'ballots_exist_locked');
  END IF;

  SELECT
    trim(both FROM coalesce(om.title, '')),
    om.property_id,
    om.description
    INTO v_ov_title, v_ov_property, v_ov_description
  FROM public.owner_vote_meetings om
  WHERE om.id = p_meeting_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'meeting_not_found');
  END IF;

  v_property := v_ov_property;

  v_council_id := public._owner_election_resolve_council_meeting_id(
    v_ov_property,
    v_ov_title,
    v_ov_description
  );

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
  IF meta IS NULL OR coalesce(trim(both FROM meta ->> 'agenda_type'), '') <> 'council_election'::text THEN
    RETURN json_build_object('ok', false, 'error', 'not_election_agenda');
  END IF;

  cand_len := GREATEST(coalesce(jsonb_array_length(meta -> 'candidates'), 0) - 1, -1);
  FOR j IN 0 .. cand_len LOOP
    cand := meta -> 'candidates' -> j;
    IF cand IS NULL OR jsonb_typeof(cand) <> 'object'::text THEN
      CONTINUE;
    END IF;
    IF trim(both FROM coalesce(cand ->> 'id', '')) = v_cand_id THEN
      v_found := true;
      EXIT;
    END IF;
  END LOOP;

  IF NOT v_found THEN
    RETURN json_build_object('ok', false, 'error', 'candidate_not_found');
  END IF;

  v_is_moderator :=
    public._owner_election_is_owner_requisitioned_initiator(v_council_id, uid)
    OR public.is_property_vote_staff(v_property);

  v_nom_uid := lower(trim(both FROM coalesce(cand ->> 'nominated_by_user_id', '')));

  v_can_delete :=
    v_is_moderator
    OR (
      v_nom_uid <> ''
      AND v_nom_uid = lower(uid::text)
    );

  IF NOT v_can_delete THEN
    RETURN json_build_object('ok', false, 'error', 'permission_denied');
  END IF;

  new_meta := jsonb_set(
    meta,
    '{candidates}'::text[],
    (
      SELECT coalesce(jsonb_agg(elem ORDER BY ord), '[]'::jsonb)
      FROM (
        SELECT
          meta -> 'candidates' -> idx AS elem,
          idx AS ord
        FROM generate_series(0, cand_len) AS idx
        WHERE trim(both FROM coalesce(meta -> 'candidates' -> idx ->> 'id', '')) <> v_cand_id
      ) kept
      WHERE elem IS NOT NULL
        AND jsonb_typeof(elem) = 'object'::text
    ),
    true
  );

  v_audit_payload := jsonb_strip_nulls(jsonb_build_object(
    'council_meeting_id', v_council_id::text,
    'candidate_name', cand ->> 'name',
    'candidate_unit_no', cand ->> 'unit_no',
    'deleted_by_moderator', v_is_moderator
  ));

  new_meta := public._owner_election_append_governance_audit(
    new_meta,
    'candidate_deleted',
    uid,
    v_cand_id,
    v_audit_payload
  );

  PERFORM public._owner_election_write_audit_row(
    v_property,
    p_meeting_id,
    p_agenda_item_id,
    uid,
    'candidate_deleted',
    v_cand_id,
    v_audit_payload
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

-- ---------------------------------------------------------------------------
-- 3) set_owner_election_candidate_accepted
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_owner_election_candidate_accepted(
  p_meeting_id uuid,
  p_agenda_item_id uuid,
  p_candidate_id text,
  p_accepted boolean
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();

  v_property uuid;
  v_ov_title text;
  v_ov_property uuid;
  v_ov_description text;
  v_council_id uuid;
  v_desc_zh text;

  meta jsonb;
  new_meta jsonb;
  rebuilt text;

  cand jsonb;
  j int;
  cand_len int;
  v_found boolean := false;
  v_cand_id text;
  v_idx int := -1;

  v_can_review boolean := false;
  v_reviewed_at text;
  v_updated_cand jsonb;
  v_audit_payload jsonb;
BEGIN
  IF uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  v_cand_id := trim(both FROM coalesce(p_candidate_id, ''));
  IF v_cand_id = '' THEN
    RETURN json_build_object('ok', false, 'error', 'candidate_not_found');
  END IF;

  IF public._owner_election_ballots_locked(p_meeting_id) THEN
    RETURN json_build_object('ok', false, 'error', 'ballots_exist_locked');
  END IF;

  SELECT
    trim(both FROM coalesce(om.title, '')),
    om.property_id,
    om.description
    INTO v_ov_title, v_ov_property, v_ov_description
  FROM public.owner_vote_meetings om
  WHERE om.id = p_meeting_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'meeting_not_found');
  END IF;

  v_property := v_ov_property;

  v_council_id := public._owner_election_resolve_council_meeting_id(
    v_ov_property,
    v_ov_title,
    v_ov_description
  );

  IF v_council_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'council_meeting_not_found');
  END IF;

  v_can_review :=
    public._owner_election_is_owner_requisitioned_initiator(v_council_id, uid)
    OR public.is_property_vote_staff(v_property);

  IF NOT v_can_review THEN
    RETURN json_build_object('ok', false, 'error', 'permission_denied');
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
  IF meta IS NULL OR coalesce(trim(both FROM meta ->> 'agenda_type'), '') <> 'council_election'::text THEN
    RETURN json_build_object('ok', false, 'error', 'not_election_agenda');
  END IF;

  cand_len := GREATEST(coalesce(jsonb_array_length(meta -> 'candidates'), 0) - 1, -1);
  FOR j IN 0 .. cand_len LOOP
    cand := meta -> 'candidates' -> j;
    IF cand IS NULL OR jsonb_typeof(cand) <> 'object'::text THEN
      CONTINUE;
    END IF;
    IF trim(both FROM coalesce(cand ->> 'id', '')) = v_cand_id THEN
      v_found := true;
      v_idx := j;
      EXIT;
    END IF;
  END LOOP;

  IF NOT v_found OR v_idx < 0 THEN
    RETURN json_build_object('ok', false, 'error', 'candidate_not_found');
  END IF;

  v_reviewed_at := to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');

  v_updated_cand :=
    (meta -> 'candidates' -> v_idx)
    || jsonb_build_object(
      'accepted', coalesce(p_accepted, false),
      'reviewed_by_user_id', uid::text,
      'reviewed_at', v_reviewed_at
    );

  new_meta := jsonb_set(
    meta,
    ARRAY['candidates', v_idx::text],
    v_updated_cand,
    true
  );

  v_audit_payload := jsonb_build_object(
    'council_meeting_id', v_council_id::text,
    'accepted', coalesce(p_accepted, false),
    'candidate_name', v_updated_cand ->> 'name',
    'candidate_unit_no', v_updated_cand ->> 'unit_no'
  );

  new_meta := public._owner_election_append_governance_audit(
    new_meta,
    'candidate_reviewed',
    uid,
    v_cand_id,
    v_audit_payload
  );

  PERFORM public._owner_election_write_audit_row(
    v_property,
    p_meeting_id,
    p_agenda_item_id,
    uid,
    'candidate_reviewed',
    v_cand_id,
    v_audit_payload
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

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.submit_owner_election_nomination(uuid, uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_owner_election_nomination(uuid, uuid, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.delete_owner_election_nomination(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_owner_election_nomination(uuid, uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.set_owner_election_candidate_accepted(uuid, uuid, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_owner_election_candidate_accepted(uuid, uuid, text, boolean) TO authenticated;

COMMENT ON FUNCTION public.submit_owner_election_nomination(uuid, uuid, text, text, text)
  IS 'Phase 1: eligible voter nominates candidate; optional unit; accepted defaults false; locked when election ballots exist.';

COMMENT ON FUNCTION public.delete_owner_election_nomination(uuid, uuid, text)
  IS 'Phase 1: nominator, owner-requisitioned initiator, or vote staff may delete; audit action candidate_deleted.';

COMMENT ON FUNCTION public.set_owner_election_candidate_accepted(uuid, uuid, text, boolean)
  IS 'Phase 1: owner-requisitioned initiator or vote staff sets accepted; audit action candidate_reviewed.';

COMMIT;
