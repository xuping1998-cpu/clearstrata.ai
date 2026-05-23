-- Phase 6B-3: Meeting minutes revision history — versioned slot 06 documents (v1, v2, ...).
-- Depends on: meeting_minutes, meeting_documents, is_meeting_discussion_moderator, _archive_plain_text_data_url.

BEGIN;

-- ---------------------------------------------------------------------------
-- Version helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._minutes_version_title_en(p_version integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN coalesce(p_version, 1) <= 1 THEN '06 Meeting Minutes'
    ELSE '06 Meeting Minutes v' || p_version::text
  END;
$$;

CREATE OR REPLACE FUNCTION public._minutes_extract_version_from_title(p_title text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE trim(both FROM coalesce(p_title, ''))
    WHEN '06 Meeting Minutes' THEN 1
    WHEN '' THEN NULL
    ELSE (
      SELECT (m[1])::integer
      FROM regexp_match(trim(both FROM p_title), '^06 Meeting Minutes v([0-9]+)$') AS m
      LIMIT 1
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public._minutes_is_minutes_document_title(p_title text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT public._minutes_extract_version_from_title(p_title) IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public._minutes_decode_data_url(p_url text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_url text := coalesce(p_url, '');
  v_comma int;
  v_meta text;
  v_data text;
BEGIN
  IF v_url = '' THEN
    RETURN NULL;
  END IF;

  v_comma := position(',' IN v_url);
  IF v_comma <= 0 THEN
    RETURN NULL;
  END IF;

  v_meta := lower(substring(v_url FROM 1 FOR v_comma - 1));
  v_data := substring(v_url FROM v_comma + 1);

  IF v_meta LIKE '%;base64%' THEN
    BEGIN
      RETURN convert_from(decode(v_data, 'base64'), 'UTF8');
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END;
  END IF;

  BEGIN
    RETURN convert_from(decode(v_data, 'escape'), 'UTF8');
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$;

-- Latest finalized minutes document row (highest version wins).
CREATE OR REPLACE FUNCTION public._minutes_latest_finalized_document(
  p_meeting_id uuid
)
RETURNS TABLE (
  id uuid,
  title_en text,
  document_url text,
  mime_type text,
  uploaded_at timestamptz,
  version integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    d.id,
    d.title_en,
    d.document_url,
    d.mime_type,
    d.uploaded_at,
    public._minutes_extract_version_from_title(d.title_en) AS version
  FROM public.meeting_documents d
  WHERE d.meeting_id = p_meeting_id
    AND public._minutes_is_minutes_document_title(d.title_en)
  ORDER BY
    public._minutes_extract_version_from_title(d.title_en) DESC NULLS LAST,
    d.uploaded_at DESC NULLS LAST
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public._minutes_latest_finalized_version(p_meeting_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lf.version
  FROM public._minutes_latest_finalized_document(p_meeting_id) lf
  LIMIT 1;
$$;

-- Backward compat: replace single-title lookup with latest finalized id.
CREATE OR REPLACE FUNCTION public._minutes_finalized_document_id(p_meeting_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lf.id
  FROM public._minutes_latest_finalized_document(p_meeting_id) lf
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public._minutes_active_property_member(p_meeting_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.meetings m
    WHERE m.id = p_meeting_id
      AND m.property_id IN (SELECT public.user_property_ids())
  );
$$;

-- ---------------------------------------------------------------------------
-- get_latest_meeting_minutes_document — any active property member
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_latest_meeting_minutes_document(p_meeting_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec record;
BEGIN
  IF p_meeting_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'meeting_not_found');
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated');
  END IF;

  IF NOT public._minutes_active_property_member(p_meeting_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  SELECT *
  INTO v_rec
  FROM public._minutes_latest_finalized_document(p_meeting_id) lf
  LIMIT 1;

  IF NOT FOUND OR v_rec.id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'has_minutes', false);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'has_minutes', true,
    'version', coalesce(v_rec.version, 1),
    'title_en', v_rec.title_en,
    'document_url', v_rec.document_url,
    'mime_type', v_rec.mime_type,
    'uploaded_at', v_rec.uploaded_at
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- revise_meeting_minutes — copy latest finalized into new draft version
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.revise_meeting_minutes(p_meeting_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
  v_property_id uuid;
  v_latest record;
  v_existing_minutes record;
  v_body text;
  v_latest_finalized_version int;
  v_new_version int;
  v_minutes_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    SELECT id
    INTO v_actor
    FROM public.profiles
    WHERE app_role IN ('platform_admin', 'superadmin')
    ORDER BY created_at
    LIMIT 1;

    IF v_actor IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'no_system_actor');
    END IF;
  ELSE
    v_actor := auth.uid();
  END IF;

  IF p_meeting_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'meeting_not_found');
  END IF;

  IF auth.uid() IS NOT NULL
     AND NOT public.is_meeting_discussion_moderator(p_meeting_id)
  THEN
    RETURN jsonb_build_object('ok', false, 'error', 'permission_denied');
  END IF;

  SELECT *
  INTO v_existing_minutes
  FROM public.meeting_minutes mm
  WHERE mm.meeting_id = p_meeting_id
    AND coalesce(mm.is_final, false) = false
  ORDER BY mm.updated_at DESC NULLS LAST, mm.created_at DESC
  LIMIT 1;

  IF FOUND AND v_existing_minutes.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'draft', true,
      'version', coalesce(v_existing_minutes.current_version, 1),
      'minutes_id', v_existing_minutes.id,
      'reused_existing_draft', true
    );
  END IF;

  SELECT *
  INTO v_latest
  FROM public._minutes_latest_finalized_document(p_meeting_id) lf
  LIMIT 1;

  IF NOT FOUND OR v_latest.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_finalized_minutes');
  END IF;

  v_body := public._minutes_decode_data_url(v_latest.document_url);
  IF nullif(trim(coalesce(v_body, '')), '') IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'minutes_decode_failed');
  END IF;

  v_latest_finalized_version := public._minutes_latest_finalized_version(p_meeting_id);
  v_new_version := coalesce(v_latest_finalized_version, 0) + 1;

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
  ORDER BY mm.updated_at DESC NULLS LAST, mm.created_at DESC
  LIMIT 1;

  IF v_minutes_id IS NOT NULL THEN
    UPDATE public.meeting_minutes mm
    SET
      property_id = v_property_id,
      draft_content = v_body,
      is_final = false,
      status = 'draft'::minutes_status,
      current_version = v_new_version,
      drafted_by = v_actor,
      drafted_at = now(),
      approved_by = NULL,
      approved_at = NULL,
      updated_at = now()
    WHERE mm.id = v_minutes_id;
  ELSE
    INSERT INTO public.meeting_minutes (
      meeting_id,
      property_id,
      draft_content,
      drafted_by,
      status,
      is_final,
      current_version
    )
    VALUES (
      p_meeting_id,
      v_property_id,
      v_body,
      v_actor,
      'draft'::minutes_status,
      false,
      v_new_version
    )
    RETURNING id INTO v_minutes_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'draft', true,
    'version', v_new_version,
    'minutes_id', v_minutes_id,
    'reused_existing_draft', false
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- get_meeting_minutes_draft — staff; includes version metadata
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
  v_latest record;
  v_minutes_id uuid;
  v_body text;
  v_is_final boolean := false;
  v_current_version int := 1;
  v_has_open_draft boolean := false;
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

  SELECT *
  INTO v_latest
  FROM public._minutes_latest_finalized_document(p_meeting_id) lf
  LIMIT 1;

  SELECT
    mm.id,
    mm.draft_content,
    coalesce(mm.is_final, false),
    greatest(coalesce(mm.current_version, 1), 1)
  INTO v_minutes_id, v_body, v_is_final, v_current_version
  FROM public.meeting_minutes mm
  WHERE mm.meeting_id = p_meeting_id
  ORDER BY mm.updated_at DESC NULLS LAST, mm.created_at DESC
  LIMIT 1;

  v_has_open_draft := (
    v_minutes_id IS NOT NULL
    AND coalesce(v_is_final, false) = false
    AND nullif(trim(coalesce(v_body, '')), '') IS NOT NULL
  );

  IF v_has_open_draft THEN
    RETURN jsonb_build_object(
      'ok', true,
      'finalized', false,
      'has_draft', true,
      'has_finalized', v_latest.id IS NOT NULL,
      'finalized_version', v_latest.version,
      'latest_finalized_title', v_latest.title_en,
      'current_version', v_current_version,
      'is_final', false,
      'body', v_body,
      'minutes_id', v_minutes_id,
      'is_template', false
    );
  END IF;

  IF v_latest.id IS NOT NULL OR coalesce(v_is_final, false) THEN
    RETURN jsonb_build_object(
      'ok', true,
      'finalized', true,
      'has_draft', false,
      'has_finalized', v_latest.id IS NOT NULL,
      'finalized_version', coalesce(v_latest.version, 1),
      'latest_finalized_title', v_latest.title_en,
      'current_version', coalesce(v_latest.version, v_current_version, 1),
      'is_final', coalesce(v_is_final, v_latest.id IS NOT NULL),
      'document_id', v_latest.id,
      'body', CASE WHEN nullif(trim(coalesce(v_body, '')), '') IS NOT NULL THEN v_body ELSE NULL END
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'finalized', false,
    'has_draft', false,
    'has_finalized', false,
    'finalized_version', NULL,
    'latest_finalized_title', NULL,
    'current_version', 1,
    'is_final', false,
    'body', public._minutes_build_default_draft(p_meeting_id),
    'is_template', true
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- create_or_update_meeting_minutes_draft — preserve current_version; allow draft after revise
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
  v_current_version int := 1;
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

  SELECT mm.id, greatest(coalesce(mm.current_version, 1), 1), coalesce(mm.is_final, false)
  INTO v_minutes_id, v_current_version, v_is_final
  FROM public.meeting_minutes mm
  WHERE mm.meeting_id = p_meeting_id
  ORDER BY mm.updated_at DESC NULLS LAST, mm.created_at DESC
  LIMIT 1;

  IF v_minutes_id IS NOT NULL AND v_is_final THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_finalized');
  END IF;

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
      is_final,
      current_version
    )
    VALUES (
      p_meeting_id,
      v_property_id,
      v_body,
      v_actor,
      'draft'::minutes_status,
      false,
      1
    )
    RETURNING id, current_version INTO v_minutes_id, v_current_version;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'saved', true,
    'minutes_id', v_minutes_id,
    'has_draft', true,
    'current_version', v_current_version
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- finalize_meeting_minutes — insert versioned document; do not overwrite older versions
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
  v_version int := 1;
  v_title_en text;
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

  SELECT m.property_id
  INTO v_property_id
  FROM public.meetings m
  WHERE m.id = p_meeting_id
  LIMIT 1;

  IF NOT FOUND OR v_property_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'meeting_not_found');
  END IF;

  SELECT mm.id, mm.draft_content, mm.current_version
  INTO v_minutes_id, v_body, v_version
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

  IF v_version IS NULL THEN
    v_version := coalesce(public._minutes_latest_finalized_version(p_meeting_id), 0) + 1;
  END IF;

  v_version := greatest(v_version, 1);

  v_title_en := public._minutes_version_title_en(v_version);
  v_url := public._archive_plain_text_data_url(v_body);
  v_size := octet_length(convert_to(v_body, 'UTF8'));

  SELECT d.id
  INTO v_existing_doc_id
  FROM public.meeting_documents d
  WHERE d.meeting_id = p_meeting_id
    AND d.title_en = v_title_en
  LIMIT 1;

  IF v_existing_doc_id IS NOT NULL THEN
    UPDATE public.meeting_documents d
    SET
      property_id = v_property_id,
      document_type = 'minutes',
      title_zh = v_title_en,
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
      v_title_en,
      v_title_en,
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
    current_version = v_version,
    updated_at = now()
  WHERE mm.id = v_minutes_id;

  RETURN jsonb_build_object(
    'ok', true,
    'finalized', true,
    'version', v_version,
    'document_id', v_doc_id,
    'title_en', v_title_en
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'finalize_meeting_minutes failed: %', SQLERRM;
    RETURN jsonb_build_object('ok', false, 'error', 'finalize_failed');
END;
$$;

COMMENT ON FUNCTION public.revise_meeting_minutes(uuid) IS
  'Staff/moderator: start a new draft revision from the latest finalized minutes document.';

COMMENT ON FUNCTION public.get_latest_meeting_minutes_document(uuid) IS
  'Active property members: metadata for the latest finalized slot 06 minutes document.';

REVOKE ALL ON FUNCTION public._minutes_version_title_en(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._minutes_extract_version_from_title(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._minutes_is_minutes_document_title(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._minutes_decode_data_url(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._minutes_latest_finalized_document(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._minutes_latest_finalized_version(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._minutes_active_property_member(uuid) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.revise_meeting_minutes(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_latest_meeting_minutes_document(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.revise_meeting_minutes(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_latest_meeting_minutes_document(uuid) TO authenticated;

COMMIT;
