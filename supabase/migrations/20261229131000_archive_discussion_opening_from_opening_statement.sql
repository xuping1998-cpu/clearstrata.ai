-- 03 discussion archive: Opening Statement from meetings.opening_statement_* with description fallback.

BEGIN;

CREATE OR REPLACE FUNCTION public._archive_strip_meeting_description_meta(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(both FROM regexp_replace(
    regexp_replace(coalesce(p_text, ''), '<!--clearstrata-written-remote[\s\S]*?-->', '', 'g'),
    '<!--clearstrata-meeting-governance[\s\S]*?-->',
    '',
    'g'
  ));
$$;

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
  v_opening_zh text;
  v_opening_en text;
  v_desc_zh text;
  v_desc_en text;
  v_body_zh text;
  v_body_en text;
  v_has_opening boolean := false;
BEGIN
  v_out := '03 Discussion Record' || E'\n';
  v_out := v_out || '================================' || E'\n\n';
  v_out := v_out || '=== Opening Statement ===' || E'\n';

  SELECT
    public._archive_strip_meeting_description_meta(m.opening_statement_zh),
    trim(both FROM coalesce(m.opening_statement_en, '')),
    public._archive_strip_meeting_description_meta(m.description_zh),
    trim(both FROM coalesce(m.description_en, ''))
  INTO v_opening_zh, v_opening_en, v_desc_zh, v_desc_en
  FROM public.meetings m
  WHERE m.id = p_meeting_id
  LIMIT 1;

  v_body_zh := coalesce(nullif(v_opening_zh, ''), nullif(v_desc_zh, ''), '');
  v_body_en := coalesce(nullif(v_opening_en, ''), nullif(v_desc_en, ''), '');

  IF v_body_zh <> '' THEN
    v_has_opening := true;
    v_out := v_out || v_body_zh || E'\n';
    IF v_body_en <> '' AND v_body_en <> v_body_zh THEN
      v_out := v_out || E'\n' || v_body_en || E'\n';
    END IF;
    v_out := v_out || E'\n';
  ELSIF v_body_en <> '' THEN
    v_has_opening := true;
    v_out := v_out || v_body_en || E'\n\n';
  END IF;

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

COMMENT ON FUNCTION public._archive_strip_meeting_description_meta(text) IS
  'Strip embedded written-remote / governance HTML comments from meeting text fields for archive display.';

COMMENT ON FUNCTION public._archive_build_discussion_snapshot(uuid) IS
  'Plain-text 03 discussion snapshot: opening from meetings.opening_statement_* (fallback description), then public comments/replies.';

COMMIT;
