-- Phase 7E-3: archive slot 01 Formal Notice — client-built body, server upsert only.

BEGIN;

CREATE OR REPLACE FUNCTION public._archive_snapshot_title_en(p_slot text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE trim(both FROM coalesce(p_slot, ''))
    WHEN '01' THEN '01 Formal Notice'
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
    WHEN '01' THEN '01 正式会议通知'
    WHEN '03' THEN '03 Discussion Record'
    WHEN '04' THEN '04 Voting Record'
    WHEN '05' THEN '05 Resolution Results'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_meeting_formal_notice_snapshot(
  p_meeting_id uuid,
  p_body text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
  v_property_id uuid;
  v_doc_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  v_actor := auth.uid();

  IF p_meeting_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'meeting_not_found');
  END IF;

  SELECT m.property_id
  INTO v_property_id
  FROM public.meetings m
  WHERE m.id = p_meeting_id
  LIMIT 1;

  IF NOT FOUND OR v_property_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'meeting_not_found');
  END IF;

  IF NOT public.is_property_vote_staff(v_property_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  v_doc_id := public._archive_upsert_generated_document(
    v_property_id,
    p_meeting_id,
    '01',
    coalesce(p_body, ''),
    v_actor
  );

  RETURN jsonb_build_object(
    'ok', true,
    'document_id', v_doc_id
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'upsert_meeting_formal_notice_snapshot failed: %', SQLERRM;
  RETURN jsonb_build_object('ok', false, 'error', 'formal_notice_failed');
END;
$$;

COMMENT ON FUNCTION public.upsert_meeting_formal_notice_snapshot(uuid, text) IS
  'Staff-only: upsert slot 01 Formal Notice plain-text snapshot (body built client-side).';

REVOKE ALL ON FUNCTION public.upsert_meeting_formal_notice_snapshot(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_meeting_formal_notice_snapshot(uuid, text) TO authenticated;

COMMIT;
