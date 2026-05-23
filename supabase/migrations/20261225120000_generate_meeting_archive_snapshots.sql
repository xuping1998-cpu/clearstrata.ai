-- Phase 6A-1: generate meeting archive snapshots (03 discussion / 04 votes / 05 results).
-- Writes plain-text snapshots into meeting_documents (document_type = other, data: URL).
-- Depends on existing is_property_vote_staff, try_extract_election_agenda_meta,
-- _owner_election_parse_council_meeting_binding.

BEGIN;

-- ---------------------------------------------------------------------------
-- Constants (slot titles — used for upsert dedup; do not collide with 00/01/02/06)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._archive_snapshot_title_en(p_slot text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE trim(both FROM coalesce(p_slot, ''))
    WHEN '03' THEN '03 Discussion Record'
    WHEN '04' THEN '04 Voting Record'
    WHEN '05' THEN '05 Resolution Results'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public._archive_snapshot_title_zh(p_slot text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE trim(both FROM coalesce(p_slot, ''))
    WHEN '03' THEN '03 Discussion Record'
    WHEN '04' THEN '04 Voting Record'
    WHEN '05' THEN '05 Resolution Results'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public._archive_plain_text_data_url(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 'data:text/plain;charset=utf-8;base64,' || encode(convert_to(coalesce(p_text, ''), 'UTF8'), 'base64');
$$;

-- Resolve owner_vote_meetings.id bound to a council meetings.id.
CREATE OR REPLACE FUNCTION public._archive_resolve_owner_vote_meeting_id(
  p_property_id uuid,
  p_council_meeting_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ov_id uuid;
  v_title text;
BEGIN
  IF p_property_id IS NULL OR p_council_meeting_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT ov.id
  INTO v_ov_id
  FROM public.owner_vote_meetings ov
  WHERE ov.property_id = p_property_id
    AND public._owner_election_parse_council_meeting_binding(ov.description) = p_council_meeting_id
  ORDER BY ov.created_at DESC
  LIMIT 1;

  IF v_ov_id IS NOT NULL THEN
    RETURN v_ov_id;
  END IF;

  SELECT coalesce(nullif(trim(m.title_zh), ''), nullif(trim(m.title_en), ''))
  INTO v_title
  FROM public.meetings m
  WHERE m.id = p_council_meeting_id
    AND m.property_id = p_property_id
  LIMIT 1;

  IF v_title IS NULL OR v_title = '' THEN
    RETURN NULL;
  END IF;

  SELECT ov.id
  INTO v_ov_id
  FROM public.owner_vote_meetings ov
  WHERE ov.property_id = p_property_id
    AND public._owner_election_parse_council_meeting_binding(ov.description) IS NULL
    AND lower(trim(coalesce(ov.title, ''))) = lower(trim(v_title))
  ORDER BY ov.created_at DESC
  LIMIT 1;

  RETURN v_ov_id;
END;
$$;

-- Upsert one generated snapshot row (by meeting_id + fixed title_en).
CREATE OR REPLACE FUNCTION public._archive_upsert_generated_document(
  p_property_id uuid,
  p_meeting_id uuid,
  p_slot text,
  p_body text,
  p_uploaded_by uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title_en text := public._archive_snapshot_title_en(p_slot);
  v_title_zh text := public._archive_snapshot_title_zh(p_slot);
  v_url text := public._archive_plain_text_data_url(p_body);
  v_size int := octet_length(convert_to(coalesce(p_body, ''), 'UTF8'));
  v_existing_id uuid;
  v_new_id uuid;
BEGIN
  IF v_title_en IS NULL THEN
    RAISE EXCEPTION 'invalid_archive_slot';
  END IF;

  SELECT d.id
  INTO v_existing_id
  FROM public.meeting_documents d
  WHERE d.meeting_id = p_meeting_id
    AND d.title_en = v_title_en
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.meeting_documents d
    SET
      property_id = p_property_id,
      title_zh = v_title_zh,
      document_type = 'other',
      document_url = v_url,
      uploaded_by = p_uploaded_by,
      uploaded_at = now(),
      file_size_bytes = v_size,
      mime_type = 'text/plain'
    WHERE d.id = v_existing_id;
    RETURN v_existing_id;
  END IF;

  INSERT INTO public.meeting_documents (
    meeting_id,
    property_id,
    document_type,
    title_en,
    title_zh,
    document_url,
    uploaded_by,
    uploaded_at,
    file_size_bytes,
    mime_type
  )
  VALUES (
    p_meeting_id,
    p_property_id,
    'other',
    v_title_en,
    v_title_zh,
    v_url,
    p_uploaded_by,
    now(),
    v_size,
    'text/plain'
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

-- 03 — discussion snapshot (public archive; excludes hidden).
CREATE OR REPLACE FUNCTION public._archive_build_discussion_snapshot(p_meeting_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_out text := '';
  v_rec record;
  v_parent record;
  v_body_line text;
  v_has_opening boolean := false;
BEGIN
  v_out := '03 Discussion Record' || E'\n';
  v_out := v_out || '================================' || E'\n\n';
  v_out := v_out || '=== Opening Statement ===' || E'\n';

  FOR v_rec IN
    SELECT c.*
    FROM public.meeting_public_comments c
    WHERE c.meeting_id = p_meeting_id
      AND c.comment_type = 'opening'
      AND c.parent_id IS NULL
      AND c.status <> 'hidden'
    ORDER BY c.created_at ASC
  LOOP
    v_has_opening := true;
    IF v_rec.status = 'withdrawn' THEN
      v_body_line := '[withdrawn]';
    ELSE
      v_body_line := coalesce(v_rec.body, '');
    END IF;
    v_out := v_out
      || coalesce(nullif(trim(v_rec.author_name), ''), 'Moderator')
      || CASE WHEN nullif(trim(v_rec.unit_no), '') IS NOT NULL THEN ' | Unit ' || trim(v_rec.unit_no) ELSE '' END
      || ' | ' || to_char(v_rec.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI') || ' UTC'
      || E'\n'
      || v_body_line
      || E'\n\n';
  END LOOP;

  IF NOT v_has_opening THEN
    v_out := v_out || 'No opening statement yet.' || E'\n\n';
  END IF;

  v_out := v_out || '=== Public Comments ===' || E'\n';

  IF NOT EXISTS (
    SELECT 1
    FROM public.meeting_public_comments c
    WHERE c.meeting_id = p_meeting_id
      AND c.comment_type IN ('comment', 'reply')
      AND c.status <> 'hidden'
  ) THEN
    v_out := v_out || 'No public comments.' || E'\n';
    RETURN v_out;
  END IF;

  FOR v_rec IN
    SELECT c.*
    FROM public.meeting_public_comments c
    WHERE c.meeting_id = p_meeting_id
      AND c.comment_type IN ('comment', 'reply')
      AND c.status <> 'hidden'
    ORDER BY c.created_at ASC
  LOOP
    IF v_rec.status = 'withdrawn' THEN
      v_body_line := '[withdrawn]';
    ELSE
      v_body_line := coalesce(v_rec.body, '');
    END IF;

    IF v_rec.comment_type = 'reply' AND v_rec.parent_id IS NOT NULL THEN
      SELECT c.author_name, c.unit_no
      INTO v_parent
      FROM public.meeting_public_comments c
      WHERE c.id = v_rec.parent_id
      LIMIT 1;

      v_out := v_out || '--- Reply';
      IF v_parent.author_name IS NOT NULL AND trim(v_parent.author_name) <> '' THEN
        v_out := v_out || ' to ' || trim(v_parent.author_name);
      END IF;
      v_out := v_out || ' ---' || E'\n';
    ELSE
      v_out := v_out || '--- Comment ---' || E'\n';
    END IF;

    v_out := v_out
      || coalesce(nullif(trim(v_rec.author_name), ''), 'Owner')
      || CASE WHEN nullif(trim(v_rec.unit_no), '') IS NOT NULL THEN ' | Unit ' || trim(v_rec.unit_no) ELSE '' END
      || ' | ' || to_char(v_rec.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI') || ' UTC'
      || E'\n'
      || v_body_line
      || E'\n\n';
  END LOOP;

  RETURN v_out;
END;
$$;

-- 04 — voting aggregate snapshot (no per-unit raw ballots).
CREATE OR REPLACE FUNCTION public._archive_build_vote_snapshot(
  p_meeting_id uuid,
  p_property_id uuid,
  p_ov_meeting_id uuid,
  p_meeting_title text
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_out text := '';
  v_rec record;
  v_agenda record;
  v_meta jsonb;
  v_ballot_count bigint;
  v_cand record;
  v_has_resolution boolean := false;
  v_has_election boolean := false;
  v_legacy_vote boolean := false;
BEGIN
  v_out := '04 Voting Record' || E'\n';
  v_out := v_out || '================================' || E'\n';
  v_out := v_out || 'Meeting: ' || coalesce(p_meeting_title, '-') || E'\n';
  v_out := v_out || 'Generated at: ' || to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') || E'\n\n';

  IF p_ov_meeting_id IS NOT NULL THEN
    v_out := v_out || '=== A. Resolution votes (aggregate) ===' || E'\n';

    FOR v_rec IN
      SELECT
        r.resolution_id,
        r.title,
        r.threshold,
        r.yes_count,
        r.no_count,
        r.abstain_count,
        r.total_cast,
        r.eligible_count
      FROM public.owner_vote_resolution_results r
      WHERE r.property_id = p_property_id
        AND r.meeting_id = p_ov_meeting_id
      ORDER BY r.title NULLS LAST, r.resolution_id
    LOOP
      v_has_resolution := true;
      v_out := v_out
        || E'\n- ' || coalesce(nullif(trim(v_rec.title), ''), 'Resolution')
        || E'\n  Yes: ' || coalesce(v_rec.yes_count::text, '0')
        || ' | No: ' || coalesce(v_rec.no_count::text, '0')
        || ' | Abstain: ' || coalesce(v_rec.abstain_count::text, '0')
        || ' | Total cast: ' || coalesce(v_rec.total_cast::text, '0')
        || ' | Eligible: ' || coalesce(v_rec.eligible_count::text, '0')
        || E'\n';
    END LOOP;

    IF NOT v_has_resolution THEN
      v_out := v_out || 'No resolution vote records available.' || E'\n';
    END IF;

    v_out := v_out || E'\n=== B. Election votes (aggregate) ===' || E'\n';

    FOR v_agenda IN
      SELECT
        mai.id,
        mai.sort_order,
        coalesce(nullif(trim(mai.title_zh), ''), nullif(trim(mai.title_en), ''), 'Election') AS agenda_title,
        mai.description_zh
      FROM public.meeting_agenda_items mai
      WHERE mai.meeting_id = p_meeting_id
        AND coalesce(mai.description_zh, '') LIKE '%<!--clearstrata-election-agenda%'
      ORDER BY mai.sort_order NULLS LAST, mai.created_at NULLS LAST
    LOOP
      v_meta := public.try_extract_election_agenda_meta(v_agenda.description_zh);

      SELECT count(*)
      INTO v_ballot_count
      FROM public.owner_election_ballots eb
      WHERE eb.property_id = p_property_id
        AND eb.meeting_id = p_ov_meeting_id
        AND eb.agenda_item_id = v_agenda.id;

      IF v_ballot_count = 0 AND v_meta IS NULL THEN
        CONTINUE;
      END IF;

      v_has_election := true;
      v_out := v_out
        || E'\nAgenda #' || coalesce(v_agenda.sort_order::text, 'n/a')
        || ': ' || v_agenda.agenda_title
        || E'\n  Ballots cast (units): ' || coalesce(v_ballot_count::text, '0')
        || E'\n';

      IF v_ballot_count > 0 THEN
        FOR v_cand IN
          SELECT
            cand_id AS candidate_id,
            count(*) AS vote_count
          FROM public.owner_election_ballots eb,
          LATERAL jsonb_array_elements_text(eb.selected_candidate_ids) AS cand_id
          WHERE eb.property_id = p_property_id
            AND eb.meeting_id = p_ov_meeting_id
            AND eb.agenda_item_id = v_agenda.id
          GROUP BY cand_id
          ORDER BY count(*) DESC, cand_id
        LOOP
          v_out := v_out
            || '  - candidate_id=' || v_cand.candidate_id
            || ' | votes=' || v_cand.vote_count::text
            || E'\n';
        END LOOP;
      END IF;
    END LOOP;

    IF NOT v_has_election THEN
      v_out := v_out
        || 'No election ballots available.'
        || E'\n';
    END IF;
  ELSE
    v_out := v_out || 'No linked owner vote meeting.' || E'\n';
  END IF;

  IF to_regclass('public.meeting_votes') IS NOT NULL AND to_regclass('public.meeting_ballots') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.meeting_votes mv WHERE mv.meeting_id = p_meeting_id LIMIT 1
    ) THEN
      v_legacy_vote := true;
      v_out := v_out || E'\n=== Legacy council meeting_votes (aggregate) ===' || E'\n';
      FOR v_rec IN
        SELECT
          mv.id,
          coalesce(nullif(trim(mv.title_zh), ''), nullif(trim(mv.title_en), ''), 'Vote') AS vote_title,
          mb.selected_option_key,
          count(*) AS cnt
        FROM public.meeting_votes mv
        LEFT JOIN public.meeting_ballots mb ON mb.vote_id = mv.id
        WHERE mv.meeting_id = p_meeting_id
        GROUP BY mv.id, mv.title_zh, mv.title_en, mb.selected_option_key
        ORDER BY mv.id, mb.selected_option_key NULLS LAST
      LOOP
        v_out := v_out
          || '- ' || v_rec.vote_title
          || CASE WHEN v_rec.selected_option_key IS NOT NULL THEN ': ' || v_rec.selected_option_key || ' x ' || v_rec.cnt::text ELSE ' (no ballots)' END
          || E'\n';
      END LOOP;
    END IF;
  END IF;

  IF NOT v_has_resolution AND NOT v_has_election AND NOT v_legacy_vote THEN
    v_out := v_out || E'\nNo voting aggregates available yet.' || E'\n';
  END IF;

  RETURN v_out;
END;
$$;

-- 05 — results snapshot.
CREATE OR REPLACE FUNCTION public._archive_build_results_snapshot(
  p_meeting_id uuid,
  p_property_id uuid,
  p_ov_meeting_id uuid,
  p_meeting_title text
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_out text := '';
  v_rec record;
  v_agenda record;
  v_meta jsonb;
  v_seats int;
  v_rank int;
  v_cand record;
  v_has_any boolean := false;
  v_participation numeric;
BEGIN
  v_out := '05 Resolution Results' || E'\n';
  v_out := v_out || '================================' || E'\n';
  v_out := v_out || 'Meeting: ' || coalesce(p_meeting_title, '-') || E'\n';
  v_out := v_out || 'Generated at: ' || to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') || E'\n\n';

  IF p_ov_meeting_id IS NULL THEN
    v_out := v_out || 'No finalized result available yet.' || E'\n';
    RETURN v_out;
  END IF;

  v_out := v_out || '=== Resolution results ===' || E'\n';

  FOR v_rec IN
    SELECT
      r.resolution_id,
      r.title,
      r.threshold,
      r.yes_count,
      r.no_count,
      r.abstain_count,
      r.total_cast,
      r.eligible_count,
      r.passed
    FROM public.owner_vote_resolution_results r
    WHERE r.property_id = p_property_id
      AND r.meeting_id = p_ov_meeting_id
    ORDER BY r.title NULLS LAST, r.resolution_id
  LOOP
    v_has_any := true;
    v_participation := CASE
      WHEN coalesce(v_rec.eligible_count, 0) > 0 THEN
        round((coalesce(v_rec.total_cast, 0)::numeric / v_rec.eligible_count::numeric) * 100, 1)
      ELSE NULL
    END;

    v_out := v_out
      || E'\n- ' || coalesce(nullif(trim(v_rec.title), ''), 'Resolution')
      || E'\n  Outcome: ' || CASE WHEN v_rec.passed IS TRUE THEN 'Passed' WHEN v_rec.passed IS FALSE THEN 'Not passed' ELSE 'Pending' END
      || E'\n  Yes: ' || coalesce(v_rec.yes_count::text, '0')
      || ' | No: ' || coalesce(v_rec.no_count::text, '0')
      || ' | Abstain: ' || coalesce(v_rec.abstain_count::text, '0')
      || ' | Total: ' || coalesce(v_rec.total_cast::text, '0')
      || CASE WHEN v_participation IS NOT NULL THEN ' | Participation: ' || v_participation::text || '%' ELSE '' END
      || E'\n';
  END LOOP;

  IF NOT v_has_any THEN
    v_out := v_out || 'No finalized result available yet.' || E'\n';
  END IF;

  v_out := v_out || E'\n=== Election results ===' || E'\n';
  v_has_any := false;

  FOR v_agenda IN
    SELECT
      mai.id,
      mai.sort_order,
      coalesce(nullif(trim(mai.title_zh), ''), nullif(trim(mai.title_en), ''), 'Election') AS agenda_title,
      mai.description_zh
    FROM public.meeting_agenda_items mai
    WHERE mai.meeting_id = p_meeting_id
      AND coalesce(mai.description_zh, '') LIKE '%<!--clearstrata-election-agenda%'
    ORDER BY mai.sort_order NULLS LAST, mai.created_at NULLS LAST
  LOOP
    v_meta := public.try_extract_election_agenda_meta(v_agenda.description_zh);
    IF v_meta IS NULL THEN
      CONTINUE;
    END IF;

    v_seats := greatest(1, coalesce((v_meta ->> 'seats')::int, 1));
    v_rank := 0;

    v_out := v_out
      || E'\nAgenda #' || coalesce(v_agenda.sort_order::text, 'n/a')
      || ': ' || v_agenda.agenda_title
      || E'\n';

    FOR v_cand IN
      WITH tallies AS (
        SELECT
          cand_id AS candidate_id,
          count(*) AS vote_count
        FROM public.owner_election_ballots eb,
        LATERAL jsonb_array_elements_text(eb.selected_candidate_ids) AS cand_id
        WHERE eb.property_id = p_property_id
          AND eb.meeting_id = p_ov_meeting_id
          AND eb.agenda_item_id = v_agenda.id
        GROUP BY cand_id
      )
      SELECT
        t.candidate_id,
        t.vote_count,
        c.elem AS candidate_json
      FROM tallies t
      LEFT JOIN LATERAL (
        SELECT elem
        FROM jsonb_array_elements(coalesce(v_meta -> 'candidates', '[]'::jsonb)) AS elem
        WHERE elem ->> 'id' = t.candidate_id
        LIMIT 1
      ) c ON true
      ORDER BY t.vote_count DESC, t.candidate_id
    LOOP
      v_has_any := true;
      v_rank := v_rank + 1;
      v_out := v_out
        || '  - ' || coalesce(nullif(trim(v_cand.candidate_json ->> 'name'), ''), v_cand.candidate_id)
        || CASE WHEN nullif(trim(v_cand.candidate_json ->> 'unit'), '') IS NOT NULL THEN ' | Unit ' || trim(v_cand.candidate_json ->> 'unit') ELSE '' END
        || ' | votes=' || v_cand.vote_count::text
        || CASE WHEN v_rank <= v_seats THEN ' | Elected (top ' || v_seats::text || ')' ELSE '' END
        || E'\n';
    END LOOP;

    IF v_rank = 0 THEN
      v_out := v_out || '  No finalized result available yet.' || E'\n';
    END IF;
  END LOOP;

  IF NOT v_has_any THEN
    v_out := v_out || 'No finalized election result available yet.' || E'\n';
  END IF;

  RETURN v_out;
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: generate_meeting_archive_snapshots
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_meeting_archive_snapshots(p_meeting_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
  v_property_id uuid;
  v_meeting_title text;
  v_ov_meeting_id uuid;
  v_discussion text;
  v_votes text;
  v_results text;
  v_disc_id uuid;
  v_votes_id uuid;
  v_results_id uuid;
BEGIN
  -- allow SQL editor / service role execution
  IF auth.uid() IS NULL THEN
    SELECT id
    INTO v_actor
    FROM public.profiles
    WHERE app_role IN ('platform_admin', 'superadmin')
    ORDER BY created_at
    LIMIT 1;

    IF v_actor IS NULL THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'no_system_actor'
      );
    END IF;
  ELSE
    v_actor := auth.uid();
  END IF;

  IF p_meeting_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'meeting_not_found');
  END IF;

  SELECT
    m.property_id,
    coalesce(nullif(trim(m.title_zh), ''), nullif(trim(m.title_en), ''), 'Untitled meeting')
  INTO v_property_id, v_meeting_title
  FROM public.meetings m
  WHERE m.id = p_meeting_id
  LIMIT 1;

  IF NOT FOUND OR v_property_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'meeting_not_found');
  END IF;

  IF auth.uid() IS NOT NULL
     AND NOT public.is_property_vote_staff(v_property_id)
  THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  v_ov_meeting_id := public._archive_resolve_owner_vote_meeting_id(v_property_id, p_meeting_id);

  IF to_regclass('public.meeting_public_comments') IS NOT NULL THEN
    v_discussion := public._archive_build_discussion_snapshot(p_meeting_id);
    v_disc_id := public._archive_upsert_generated_document(v_property_id, p_meeting_id, '03', v_discussion, v_actor);
  ELSE
    v_discussion := 'Discussion table not available.';
    v_disc_id := public._archive_upsert_generated_document(v_property_id, p_meeting_id, '03', v_discussion, v_actor);
  END IF;

  v_votes := public._archive_build_vote_snapshot(p_meeting_id, v_property_id, v_ov_meeting_id, v_meeting_title);
  v_votes_id := public._archive_upsert_generated_document(v_property_id, p_meeting_id, '04', v_votes, v_actor);

  v_results := public._archive_build_results_snapshot(p_meeting_id, v_property_id, v_ov_meeting_id, v_meeting_title);
  v_results_id := public._archive_upsert_generated_document(v_property_id, p_meeting_id, '05', v_results, v_actor);

  RETURN jsonb_build_object(
    'ok', true,
    'discussion', v_disc_id IS NOT NULL,
    'votes', v_votes_id IS NOT NULL,
    'results', v_results_id IS NOT NULL
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'generate_meeting_archive_snapshots failed: %', SQLERRM;
  RETURN jsonb_build_object('ok', false, 'error', 'archive_failed');
END;
$$;

COMMENT ON FUNCTION public.generate_meeting_archive_snapshots(uuid) IS
  'Staff-only: upsert plain-text archive snapshots 03/04/05 into meeting_documents for a council meeting.';

REVOKE ALL ON FUNCTION public._archive_snapshot_title_en(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._archive_snapshot_title_zh(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._archive_plain_text_data_url(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._archive_resolve_owner_vote_meeting_id(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._archive_upsert_generated_document(uuid, uuid, text, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._archive_build_discussion_snapshot(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._archive_build_vote_snapshot(uuid, uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._archive_build_results_snapshot(uuid, uuid, uuid, text) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.generate_meeting_archive_snapshots(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_meeting_archive_snapshots(uuid) TO authenticated;

COMMIT;
