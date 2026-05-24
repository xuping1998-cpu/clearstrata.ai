-- 04 Voting Record: show candidate names (same meta join as 05), not raw candidate_id.

BEGIN;

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
    v_out := v_out || '=== Resolution votes ===' || E'\n';

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
        || E'\n- ' || coalesce(nullif(trim(v_rec.title), ''), 'Resolution');
      IF coalesce(v_rec.total_cast, 0) = 0 THEN
        v_out := v_out || E'\n  No votes cast yet.' || E'\n';
      ELSE
        v_out := v_out
          || E'\n  Yes: ' || coalesce(v_rec.yes_count::text, '0')
          || ' | No: ' || coalesce(v_rec.no_count::text, '0')
          || ' | Abstain: ' || coalesce(v_rec.abstain_count::text, '0')
          || ' | Total cast: ' || coalesce(v_rec.total_cast::text, '0')
          || ' | Eligible: ' || coalesce(v_rec.eligible_count::text, '0')
          || E'\n';
      END IF;
    END LOOP;

    IF NOT v_has_resolution THEN
      v_out := v_out || 'No resolution vote records available.' || E'\n';
    END IF;

    v_out := v_out || E'\n=== Election votes ===' || E'\n';

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
        || E'\n';
      IF coalesce(v_ballot_count, 0) = 0 THEN
        v_out := v_out || '  No election ballots cast yet.' || E'\n';
      ELSE
        v_out := v_out
          || '  Ballots cast (units): ' || coalesce(v_ballot_count::text, '0')
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
          v_out := v_out
            || '  - ' || coalesce(nullif(trim(v_cand.candidate_json ->> 'name'), ''), v_cand.candidate_id)
            || CASE WHEN nullif(trim(v_cand.candidate_json ->> 'unit'), '') IS NOT NULL THEN ' | Unit ' || trim(v_cand.candidate_json ->> 'unit') ELSE '' END
            || ' | votes=' || v_cand.vote_count::text
            || E'\n';
        END LOOP;
      END IF;
    END LOOP;

    IF NOT v_has_election THEN
      v_out := v_out
        || 'No election ballots cast yet.'
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

COMMENT ON FUNCTION public._archive_build_vote_snapshot(uuid, uuid, uuid, text) IS
  'Archive slot 04: resolution + election vote aggregates; election lines use candidate names from agenda meta.';

COMMIT;
