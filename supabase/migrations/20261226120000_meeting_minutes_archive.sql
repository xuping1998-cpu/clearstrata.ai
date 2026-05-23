-- Phase 6B-1: Meeting archive slot 06 — minutes draft RPCs + finalized document in meeting_documents.
-- Draft stored in meeting_minutes.draft_content; finalized plain-text archive in meeting_documents.
-- Depends on: is_meeting_discussion_moderator, _archive_plain_text_data_url, _archive_resolve_owner_vote_meeting_id.

BEGIN;

-- ---------------------------------------------------------------------------
-- Slot 06 constants (English-only — frontend shows localized title)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._minutes_archive_title_en()
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT '06 Meeting Minutes';
$$;

CREATE OR REPLACE FUNCTION public._minutes_can_manage(p_meeting_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_meeting_discussion_moderator(p_meeting_id);
$$;

CREATE OR REPLACE FUNCTION public._minutes_finalized_document_id(p_meeting_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id
  FROM public.meeting_documents d
  WHERE d.meeting_id = p_meeting_id
    AND d.title_en = public._minutes_archive_title_en()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public._minutes_build_default_draft(p_meeting_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property_id uuid;
  v_title text;
  v_type text;
  v_date text;
  v_ov_id uuid;
  v_resolution_lines text := '';
  v_rec record;
BEGIN
  SELECT
    m.property_id,
    coalesce(nullif(trim(m.title_en), ''), nullif(trim(m.title_zh), ''), 'Untitled meeting'),
    coalesce(m.meeting_type::text, 'meeting'),
    coalesce(to_char(m.scheduled_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI'), 'TBD')
  INTO v_property_id, v_title, v_type, v_date
  FROM public.meetings m
  WHERE m.id = p_meeting_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN '06 Meeting Minutes' || E'\n================================' || E'\n\n(Draft template unavailable.)' || E'\n';
  END IF;

  v_ov_id := public._archive_resolve_owner_vote_meeting_id(v_property_id, p_meeting_id);

  IF v_ov_id IS NOT NULL THEN
    FOR v_rec IN
      SELECT coalesce(nullif(trim(r.title), ''), 'Resolution') AS res_title
      FROM public.owner_vote_resolution_results r
      WHERE r.property_id = v_property_id
        AND r.meeting_id = v_ov_id
      ORDER BY r.title NULLS LAST, r.resolution_id
      LIMIT 20
    LOOP
      v_resolution_lines := v_resolution_lines || '- ' || v_rec.res_title || E'\n';
    END LOOP;
  END IF;

  RETURN
    '06 Meeting Minutes' || E'\n'
    || '================================' || E'\n\n'
    || 'Meeting: ' || v_title || E'\n'
    || 'Date: ' || v_date || ' UTC' || E'\n'
    || 'Type: ' || v_type || E'\n\n'
    || '--- Summary ---' || E'\n'
    || '(Add meeting summary here.)' || E'\n\n'
    || '--- Resolutions ---' || E'\n'
    || CASE
      WHEN v_resolution_lines <> '' THEN v_resolution_lines
      ELSE '(Reference: see 05 Resolution Results archive slot.)' || E'\n'
    END
    || E'\n--- Discussion ---' || E'\n'
    || '(Reference: see 03 Discussion Record archive slot.)' || E'\n\n'
    || '--- Voting ---' || E'\n'
    || '(Reference: see 04 Voting Record archive slot.)' || E'\n\n'
    || '--- Chair notes ---' || E'\n'
    || '(Add chair notes here.)' || E'\n';
END;
$$;

-- ---------------------------------------------------------------------------
-- get_meeting_minutes_draft — staff/moderator only; owners use finalized document
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_meeting_minutes_draft(p_meeting_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_final_doc_id uuid;
  v_minutes_id uuid;
  v_body text;
  v_is_final boolean := false;
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated');
  END IF;

  IF p_meeting_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'meeting_not_found');
  END IF;

  IF NOT public._minutes_can_manage(p_meeting_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  v_final_doc_id := public._minutes_finalized_document_id(p_meeting_id);

  SELECT mm.id, mm.draft_content, mm.is_final
  INTO v_minutes_id, v_body, v_is_final
  FROM public.meeting_minutes mm
  WHERE mm.meeting_id = p_meeting_id
  ORDER BY mm.updated_at DESC NULLS LAST, mm.created_at DESC
  LIMIT 1;

  IF v_final_doc_id IS NOT NULL OR coalesce(v_is_final, false) THEN
    RETURN jsonb_build_object(
      'ok', true,
      'finalized', true,
      'has_draft', v_minutes_id IS NOT NULL AND nullif(trim(coalesce(v_body, '')), '') IS NOT NULL,
      'document_id', v_final_doc_id
    );
  END IF;

  IF v_minutes_id IS NULL OR nullif(trim(coalesce(v_body, '')), '') IS NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'finalized', false,
      'has_draft', false,
      'body', public._minutes_build_default_draft(p_meeting_id),
      'is_template', true
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'finalized', false,
    'has_draft', true,
    'body', v_body,
    'minutes_id', v_minutes_id,
    'is_template', false
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- create_or_update_meeting_minutes_draft
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_or_update_meeting_minutes_draft(
  p_meeting_id uuid,
  p_body text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_property_id uuid;
  v_minutes_id uuid;
  v_body text := coalesce(p_body, '');
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated');
  END IF;

  IF p_meeting_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'meeting_not_found');
  END IF;

  IF NOT public._minutes_can_manage(p_meeting_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF public._minutes_finalized_document_id(p_meeting_id) IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_finalized');
  END IF;

  IF char_length(trim(v_body)) < 1 OR char_length(v_body) > 20000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_body');
  END IF;

  SELECT m.property_id
  INTO v_property_id
  FROM public.meetings m
  WHERE m.id = p_meeting_id
  LIMIT 1;

  IF NOT FOUND OR v_property_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'meeting_not_found');
  END IF;

  SELECT mm.id
  INTO v_minutes_id
  FROM public.meeting_minutes mm
  WHERE mm.meeting_id = p_meeting_id
    AND coalesce(mm.is_final, false) = false
  ORDER BY mm.updated_at DESC NULLS LAST, mm.created_at DESC
  LIMIT 1;

  IF v_minutes_id IS NOT NULL THEN
    UPDATE public.meeting_minutes mm
    SET
      draft_content = v_body,
      drafted_by = v_actor,
      property_id = v_property_id,
      status = 'draft'::minutes_status,
      is_final = false,
      updated_at = now()
    WHERE mm.id = v_minutes_id;
  ELSE
    INSERT INTO public.meeting_minutes (
      meeting_id,
      property_id,
      draft_content,
      drafted_by,
      status,
      is_final
    )
    VALUES (
      p_meeting_id,
      v_property_id,
      v_body,
      v_actor,
      'draft'::minutes_status,
      false
    )
    RETURNING id INTO v_minutes_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'saved', true,
    'minutes_id', v_minutes_id,
    'has_draft', true
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- finalize_meeting_minutes — upsert slot 06 document; lock draft row
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finalize_meeting_minutes(p_meeting_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_property_id uuid;
  v_minutes_id uuid;
  v_body text;
  v_url text;
  v_size int;
  v_existing_doc_id uuid;
  v_doc_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated');
  END IF;

  IF p_meeting_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'meeting_not_found');
  END IF;

  IF NOT public._minutes_can_manage(p_meeting_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  v_existing_doc_id := public._minutes_finalized_document_id(p_meeting_id);
  IF v_existing_doc_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'finalized', true,
      'document_id', v_existing_doc_id
    );
  END IF;

  SELECT m.property_id
  INTO v_property_id
  FROM public.meetings m
  WHERE m.id = p_meeting_id
  LIMIT 1;

  IF NOT FOUND OR v_property_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'meeting_not_found');
  END IF;

  SELECT mm.id, mm.draft_content
  INTO v_minutes_id, v_body
  FROM public.meeting_minutes mm
  WHERE mm.meeting_id = p_meeting_id
    AND coalesce(mm.is_final, false) = false
  ORDER BY mm.updated_at DESC NULLS LAST, mm.created_at DESC
  LIMIT 1;

  IF v_minutes_id IS NULL OR nullif(trim(coalesce(v_body, '')), '') IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_draft');
  END IF;

  IF char_length(v_body) > 20000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_body');
  END IF;

  v_url := public._archive_plain_text_data_url(v_body);
  v_size := octet_length(convert_to(v_body, 'UTF8'));

  v_existing_doc_id := public._minutes_finalized_document_id(p_meeting_id);

  IF v_existing_doc_id IS NOT NULL THEN
    UPDATE public.meeting_documents d
    SET
      property_id = v_property_id,
      document_type = 'minutes',
      title_zh = public._minutes_archive_title_en(),
      document_url = v_url,
      uploaded_by = v_actor,
      uploaded_at = now(),
      file_size_bytes = v_size,
      mime_type = 'text/plain'
    WHERE d.id = v_existing_doc_id;
    v_doc_id := v_existing_doc_id;
  ELSE
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
      v_property_id,
      'minutes',
      public._minutes_archive_title_en(),
      public._minutes_archive_title_en(),
      v_url,
      v_actor,
      now(),
      v_size,
      'text/plain'
    )
    RETURNING id INTO v_doc_id;
  END IF;

  UPDATE public.meeting_minutes mm
  SET
    is_final = true,
    status = 'approved'::minutes_status,
    approved_by = v_actor,
    approved_at = now(),
    updated_at = now()
  WHERE mm.id = v_minutes_id;

  RETURN jsonb_build_object(
    'ok', true,
    'finalized', true,
    'document_id', v_doc_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'finalize_meeting_minutes failed: %', SQLERRM;
    RETURN jsonb_build_object('ok', false, 'error', 'finalize_failed');
END;
$$;

COMMENT ON FUNCTION public.get_meeting_minutes_draft(uuid) IS
  'Staff/moderator: read minutes draft or template; owners use finalized meeting_documents row.';

COMMENT ON FUNCTION public.create_or_update_meeting_minutes_draft(uuid, text) IS
  'Staff/moderator: save slot 06 minutes draft without finalizing.';

COMMENT ON FUNCTION public.finalize_meeting_minutes(uuid) IS
  'Staff/moderator: finalize minutes into meeting_documents slot 06 (read-only archive).';

REVOKE ALL ON FUNCTION public._minutes_archive_title_en() FROM PUBLIC;
REVOKE ALL ON FUNCTION public._minutes_can_manage(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._minutes_finalized_document_id(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._minutes_build_default_draft(uuid) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.get_meeting_minutes_draft(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_or_update_meeting_minutes_draft(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_meeting_minutes(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_meeting_minutes_draft(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_or_update_meeting_minutes_draft(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_meeting_minutes(uuid) TO authenticated;

COMMIT;
