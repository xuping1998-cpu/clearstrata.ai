-- Allow active property members to silently refresh archive slots 04/05 after owner vote.
-- Extends existing generate_meeting_archive_snapshots (no new RPC).

BEGIN;

DROP FUNCTION IF EXISTS public.generate_meeting_archive_snapshots(uuid);

CREATE OR REPLACE FUNCTION public.generate_meeting_archive_snapshots(
  p_meeting_id uuid,
  p_slots text[] DEFAULT ARRAY['03', '04', '05']
)
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
  v_slots text[] := coalesce(p_slots, ARRAY['03', '04', '05']::text[]);
BEGIN
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

  IF auth.uid() IS NOT NULL THEN
    IF NOT public.is_property_vote_staff(v_property_id) THEN
      IF NOT public.is_property_member(v_property_id) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
      END IF;
      IF '03' = ANY (v_slots) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
      END IF;
    END IF;
  END IF;

  v_ov_meeting_id := public._archive_resolve_owner_vote_meeting_id(v_property_id, p_meeting_id);

  v_disc_id := NULL;
  v_votes_id := NULL;
  v_results_id := NULL;

  IF '03' = ANY (v_slots) THEN
    IF to_regclass('public.meeting_public_comments') IS NOT NULL THEN
      v_discussion := public._archive_build_discussion_snapshot(p_meeting_id);
      v_disc_id := public._archive_upsert_generated_document(v_property_id, p_meeting_id, '03', v_discussion, v_actor);
    ELSE
      v_discussion := 'Discussion table not available.';
      v_disc_id := public._archive_upsert_generated_document(v_property_id, p_meeting_id, '03', v_discussion, v_actor);
    END IF;
  END IF;

  IF '04' = ANY (v_slots) THEN
    v_votes := public._archive_build_vote_snapshot(p_meeting_id, v_property_id, v_ov_meeting_id, v_meeting_title);
    v_votes_id := public._archive_upsert_generated_document(v_property_id, p_meeting_id, '04', v_votes, v_actor);
  END IF;

  IF '05' = ANY (v_slots) THEN
    v_results := public._archive_build_results_snapshot(p_meeting_id, v_property_id, v_ov_meeting_id, v_meeting_title);
    v_results_id := public._archive_upsert_generated_document(v_property_id, p_meeting_id, '05', v_results, v_actor);
  END IF;

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

COMMENT ON FUNCTION public.generate_meeting_archive_snapshots(uuid, text[]) IS
  'Upsert plain-text archive snapshots into meeting_documents. Staff: slots 03/04/05. Active members: 04/05 only (e.g. after owner vote).';

REVOKE ALL ON FUNCTION public.generate_meeting_archive_snapshots(uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_meeting_archive_snapshots(uuid, text[]) TO authenticated;

COMMIT;
