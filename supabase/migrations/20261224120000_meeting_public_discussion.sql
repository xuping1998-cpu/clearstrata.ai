-- Phase 5A: meeting public discussion (opening statements, owner comments, replies).
-- Writes via SECURITY DEFINER RPCs only; SELECT via RLS.
-- Depends on existing public.is_property_vote_staff(uuid) (do not redefine here).

BEGIN;

-- ---------------------------------------------------------------------------
-- Table: meeting_public_comments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meeting_public_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  parent_id uuid NULL REFERENCES public.meeting_public_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_no text NULL,
  author_name text NULL,
  body text NOT NULL,
  comment_type text NOT NULL DEFAULT 'comment',
  status text NOT NULL DEFAULT 'visible',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT meeting_public_comments_body_len_chk CHECK (
    (status = 'withdrawn' AND body = '')
    OR (char_length(body) > 0 AND char_length(body) <= 5000)
  ),
  CONSTRAINT meeting_public_comments_type_chk CHECK (
    comment_type IN ('opening', 'comment', 'reply')
  ),
  CONSTRAINT meeting_public_comments_status_chk CHECK (
    status IN ('visible', 'withdrawn', 'hidden')
  )
);

COMMENT ON TABLE public.meeting_public_comments IS
  'Public meeting discussion: opening statement, owner comments, staff/initiator replies (soft-delete via status).';

CREATE INDEX IF NOT EXISTS meeting_public_comments_property_meeting_created_idx
  ON public.meeting_public_comments (property_id, meeting_id, created_at);

CREATE INDEX IF NOT EXISTS meeting_public_comments_meeting_status_created_idx
  ON public.meeting_public_comments (meeting_id, status, created_at);

CREATE INDEX IF NOT EXISTS meeting_public_comments_parent_idx
  ON public.meeting_public_comments (parent_id);

CREATE INDEX IF NOT EXISTS meeting_public_comments_user_idx
  ON public.meeting_public_comments (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS meeting_public_comments_one_opening_per_meeting_idx
  ON public.meeting_public_comments (meeting_id)
  WHERE comment_type = 'opening' AND parent_id IS NULL;

ALTER TABLE public.meeting_public_comments ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Discussion window + moderator helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_meeting_public_discussion_open(p_meeting_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scheduled timestamptz;
  v_status text;
BEGIN
  IF p_meeting_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT m.scheduled_at, lower(trim(both FROM coalesce(m.status::text, '')))
  INTO v_scheduled, v_status
  FROM public.meetings m
  WHERE m.id = p_meeting_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF public.is_remote_written_v3_meeting(p_meeting_id) THEN
    IF v_scheduled IS NULL THEN
      RETURN false;
    END IF;
    RETURN now() >= v_scheduled AND now() < v_scheduled + interval '14 days';
  END IF;

  RETURN v_status NOT IN ('closed', 'ended', 'archived');
END;
$$;

COMMENT ON FUNCTION public.is_meeting_public_discussion_open(uuid) IS
  'V3 remote written: scheduled_at .. +14d; legacy: meeting status not closed/ended/archived.';

REVOKE ALL ON FUNCTION public.is_meeting_public_discussion_open(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_meeting_public_discussion_open(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_meeting_discussion_moderator(p_meeting_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_created_by uuid;
  v_property_id uuid;
BEGIN
  IF p_meeting_id IS NULL OR uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT m.created_by, m.property_id
  INTO v_created_by, v_property_id
  FROM public.meetings m
  WHERE m.id = p_meeting_id
  LIMIT 1;

  IF NOT FOUND OR v_property_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN v_created_by = uid OR public.is_property_vote_staff(v_property_id);
END;
$$;

COMMENT ON FUNCTION public.is_meeting_discussion_moderator(uuid) IS
  'Meeting creator (e.g. owner-requisitioned initiator) or property vote staff.';

REVOKE ALL ON FUNCTION public.is_meeting_discussion_moderator(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_meeting_discussion_moderator(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Internal: active property member check
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._meeting_public_discussion_active_member(p_property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_property_member(p_property_id);
$$;

REVOKE ALL ON FUNCTION public._meeting_public_discussion_active_member(uuid) FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- RPC: add_meeting_public_comment
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_meeting_public_comment(
  p_meeting_id uuid,
  p_body text,
  p_parent_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_property_id uuid;
  v_body text;
  v_parent_meeting_id uuid;
  v_parent_status text;
  v_unit_no text;
  v_author_name text;
  v_comment_type text;
  v_new_id uuid;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  v_body := trim(both FROM coalesce(p_body, ''));
  IF char_length(v_body) = 0 OR char_length(v_body) > 5000 THEN
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

  IF NOT public._meeting_public_discussion_active_member(v_property_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_property_member');
  END IF;

  IF NOT public.is_meeting_public_discussion_open(p_meeting_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'discussion_closed');
  END IF;

  IF p_parent_id IS NOT NULL THEN
    SELECT c.meeting_id, c.status
    INTO v_parent_meeting_id, v_parent_status
    FROM public.meeting_public_comments c
    WHERE c.id = p_parent_id
    LIMIT 1;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'parent_not_found');
    END IF;

    IF v_parent_meeting_id IS DISTINCT FROM p_meeting_id THEN
      RETURN jsonb_build_object('ok', false, 'error', 'parent_meeting_mismatch');
    END IF;

    IF v_parent_status IS DISTINCT FROM 'visible' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'parent_not_visible');
    END IF;

    v_comment_type := 'reply';
  ELSE
    v_comment_type := 'comment';
  END IF;

  SELECT nullif(trim(both FROM coalesce(pm.unit_no::text, '')), '')
  INTO v_unit_no
  FROM public.property_members pm
  WHERE pm.property_id = v_property_id
    AND pm.user_id = uid
    AND pm.status::text = 'active'
  LIMIT 1;

  SELECT nullif(
    trim(both FROM coalesce(p.full_name_zh, p.full_name_en, p.email, '')),
    ''
  )
  INTO v_author_name
  FROM public.profiles p
  WHERE p.id = uid
  LIMIT 1;

  INSERT INTO public.meeting_public_comments (
    property_id,
    meeting_id,
    parent_id,
    user_id,
    unit_no,
    author_name,
    body,
    comment_type,
    status
  )
  VALUES (
    v_property_id,
    p_meeting_id,
    p_parent_id,
    uid,
    v_unit_no,
    v_author_name,
    v_body,
    v_comment_type,
    'visible'
  )
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object('ok', true, 'id', v_new_id);
END;
$$;

COMMENT ON FUNCTION public.add_meeting_public_comment(uuid, text, uuid) IS
  'Active property member adds a visible comment or reply during open discussion window.';

-- ---------------------------------------------------------------------------
-- RPC: set_meeting_opening_statement
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_meeting_opening_statement(
  p_meeting_id uuid,
  p_body text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_property_id uuid;
  v_body text;
  v_existing_id uuid;
  v_unit_no text;
  v_author_name text;
  v_new_id uuid;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  v_body := trim(both FROM coalesce(p_body, ''));
  IF char_length(v_body) = 0 OR char_length(v_body) > 5000 THEN
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

  IF NOT public.is_meeting_discussion_moderator(p_meeting_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'permission_denied');
  END IF;

  IF NOT public.is_meeting_public_discussion_open(p_meeting_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'discussion_closed');
  END IF;

  SELECT nullif(trim(both FROM coalesce(pm.unit_no::text, '')), '')
  INTO v_unit_no
  FROM public.property_members pm
  WHERE pm.property_id = v_property_id
    AND pm.user_id = uid
    AND pm.status::text = 'active'
  LIMIT 1;

  SELECT nullif(
    trim(both FROM coalesce(p.full_name_zh, p.full_name_en, p.email, '')),
    ''
  )
  INTO v_author_name
  FROM public.profiles p
  WHERE p.id = uid
  LIMIT 1;

  SELECT c.id
  INTO v_existing_id
  FROM public.meeting_public_comments c
  WHERE c.meeting_id = p_meeting_id
    AND c.comment_type = 'opening'
    AND c.parent_id IS NULL
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.meeting_public_comments c
    SET
      user_id = uid,
      unit_no = v_unit_no,
      author_name = v_author_name,
      body = v_body,
      status = 'visible',
      updated_at = now()
    WHERE c.id = v_existing_id;

    RETURN jsonb_build_object('ok', true, 'id', v_existing_id);
  END IF;

  INSERT INTO public.meeting_public_comments (
    property_id,
    meeting_id,
    parent_id,
    user_id,
    unit_no,
    author_name,
    body,
    comment_type,
    status
  )
  VALUES (
    v_property_id,
    p_meeting_id,
    NULL,
    uid,
    v_unit_no,
    v_author_name,
    v_body,
    'opening',
    'visible'
  )
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object('ok', true, 'id', v_new_id);
END;
$$;

COMMENT ON FUNCTION public.set_meeting_opening_statement(uuid, text) IS
  'Moderator upserts one visible opening statement per meeting during discussion window.';

-- ---------------------------------------------------------------------------
-- RPC: withdraw_meeting_public_comment
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.withdraw_meeting_public_comment(p_comment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_row public.meeting_public_comments%ROWTYPE;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF p_comment_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'comment_not_found');
  END IF;

  SELECT *
  INTO v_row
  FROM public.meeting_public_comments c
  WHERE c.id = p_comment_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'comment_not_found');
  END IF;

  IF v_row.user_id IS DISTINCT FROM uid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'permission_denied');
  END IF;

  IF v_row.status IS DISTINCT FROM 'visible' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_withdrawable');
  END IF;

  IF v_row.comment_type NOT IN ('comment', 'reply') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_withdrawable');
  END IF;

  UPDATE public.meeting_public_comments c
  SET
    status = 'withdrawn',
    body = '',
    updated_at = now()
  WHERE c.id = p_comment_id;

  RETURN jsonb_build_object('ok', true, 'id', p_comment_id);
END;
$$;

COMMENT ON FUNCTION public.withdraw_meeting_public_comment(uuid) IS
  'Author withdraws own visible comment/reply (body cleared, status withdrawn).';

-- ---------------------------------------------------------------------------
-- RPC: hide_meeting_public_comment
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hide_meeting_public_comment(p_comment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_row public.meeting_public_comments%ROWTYPE;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF p_comment_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'comment_not_found');
  END IF;

  SELECT *
  INTO v_row
  FROM public.meeting_public_comments c
  WHERE c.id = p_comment_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'comment_not_found');
  END IF;

  IF NOT public.is_meeting_discussion_moderator(v_row.meeting_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'permission_denied');
  END IF;

  UPDATE public.meeting_public_comments c
  SET
    status = 'hidden',
    updated_at = now()
  WHERE c.id = p_comment_id;

  RETURN jsonb_build_object('ok', true, 'id', p_comment_id);
END;
$$;

COMMENT ON FUNCTION public.hide_meeting_public_comment(uuid) IS
  'Discussion moderator hides a comment (status hidden; row retained).';

-- ---------------------------------------------------------------------------
-- RLS: SELECT only (writes via RPC)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS meeting_public_comments_select_member ON public.meeting_public_comments;
CREATE POLICY meeting_public_comments_select_member
  ON public.meeting_public_comments
  FOR SELECT
  TO authenticated
  USING (
    public.is_property_member(property_id)
    AND (
      status IN ('visible', 'withdrawn')
      OR public.is_meeting_discussion_moderator(meeting_id)
    )
  );

REVOKE ALL ON TABLE public.meeting_public_comments FROM PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.meeting_public_comments FROM authenticated;
GRANT SELECT ON TABLE public.meeting_public_comments TO authenticated;

REVOKE ALL ON FUNCTION public.add_meeting_public_comment(uuid, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_meeting_opening_statement(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.withdraw_meeting_public_comment(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hide_meeting_public_comment(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.add_meeting_public_comment(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_meeting_opening_statement(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_meeting_public_comment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hide_meeting_public_comment(uuid) TO authenticated;

COMMIT;

-- Verification (run after apply):
-- SELECT proname FROM pg_proc
-- WHERE proname IN (
--   'add_meeting_public_comment',
--   'set_meeting_opening_statement',
--   'withdraw_meeting_public_comment',
--   'hide_meeting_public_comment',
--   'is_meeting_public_discussion_open',
--   'is_meeting_discussion_moderator'
-- )
-- ORDER BY 1;
