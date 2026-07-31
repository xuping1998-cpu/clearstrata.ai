/*
  Project One Phase 2 — Community Deliberation Governance Engine
  Governance Matter: structured lifecycle, revision history, immutable owner comments.
*/

BEGIN;

-- ── Categories & lifecycle ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.governance_matters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN (
    'property_management',
    'budget',
    'major_repair',
    'procurement',
    'special_general_meeting',
    'annual_general_meeting',
    'council_proposal',
    'owner_proposal',
    'bylaw_amendment',
    'policy_proposal',
    'emergency_matter',
    'other'
  )),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'discussion',
    'public_consultation',
    'resolution_draft',
    'council_review',
    'meeting',
    'voting',
    'decision',
    'execution',
    'archived'
  )),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_revision_at timestamptz NOT NULL DEFAULT now(),
  discussion_deadline timestamptz,
  resolution_deadline timestamptz,
  meeting_id uuid REFERENCES public.meetings(id) ON DELETE SET NULL,
  voting_id uuid,
  archived_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_governance_matters_property_status
  ON public.governance_matters(property_id, status);

CREATE INDEX IF NOT EXISTS idx_governance_matters_property_created
  ON public.governance_matters(property_id, created_at DESC);

COMMENT ON TABLE public.governance_matters IS
  'Community Deliberation governance matters (GP-002). Every discussion belongs to one Matter.';

CREATE TABLE IF NOT EXISTS public.governance_matter_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES public.governance_matters(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  revision_no integer NOT NULL CHECK (revision_no >= 1),
  change_kind text NOT NULL,
  title text,
  description text,
  category text,
  status text,
  discussion_deadline timestamptz,
  resolution_deadline timestamptz,
  meeting_id uuid,
  voting_id uuid,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT governance_matter_revisions_matter_rev_unique UNIQUE (matter_id, revision_no)
);

CREATE INDEX IF NOT EXISTS idx_governance_matter_revisions_matter
  ON public.governance_matter_revisions(matter_id, revision_no);

COMMENT ON TABLE public.governance_matter_revisions IS
  'Append-only revision history for governance matters. Nothing is overwritten.';

CREATE TABLE IF NOT EXISTS public.governance_matter_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES public.governance_matters(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(trim(body)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  visibility text NOT NULL DEFAULT 'visible' CHECK (visibility IN ('visible', 'hidden', 'removed'))
);

CREATE INDEX IF NOT EXISTS idx_governance_matter_comments_matter
  ON public.governance_matter_comments(matter_id, created_at);

COMMENT ON TABLE public.governance_matter_comments IS
  'Immutable owner participation comments. Body cannot be edited after insert.';

CREATE TABLE IF NOT EXISTS public.governance_matter_comment_moderation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.governance_matter_comments(id) ON DELETE CASCADE,
  matter_id uuid NOT NULL REFERENCES public.governance_matters(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('hide', 'remove', 'flag')),
  reason text,
  acted_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_governance_matter_comment_mod_comment
  ON public.governance_matter_comment_moderation(comment_id, created_at DESC);

-- ── Revision logging ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.governance_matter_next_revision_no(p_matter_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(MAX(revision_no), 0) + 1 FROM public.governance_matter_revisions WHERE matter_id = p_matter_id;
$$;

CREATE OR REPLACE FUNCTION public.governance_matter_log_revision_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.governance_matter_revisions (
    matter_id, property_id, revision_no, change_kind,
    title, description, category, status,
    discussion_deadline, resolution_deadline, meeting_id, voting_id,
    snapshot, changed_by
  ) VALUES (
    NEW.id, NEW.property_id, 1, 'matter_created',
    NEW.title, NEW.description, NEW.category, NEW.status,
    NEW.discussion_deadline, NEW.resolution_deadline, NEW.meeting_id, NEW.voting_id,
    jsonb_build_object('op', 'insert'), NEW.created_by
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.governance_matter_log_revision_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kind text;
  v_rev integer;
BEGIN
  v_rev := public.governance_matter_next_revision_no(NEW.id);

  IF OLD.title IS DISTINCT FROM NEW.title THEN
    v_kind := 'title_updated';
  ELSIF OLD.description IS DISTINCT FROM NEW.description THEN
    v_kind := 'description_updated';
  ELSIF OLD.discussion_deadline IS DISTINCT FROM NEW.discussion_deadline THEN
    v_kind := 'discussion_deadline_updated';
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    v_kind := 'status_updated';
  ELSIF OLD.category IS DISTINCT FROM NEW.category THEN
    v_kind := 'category_updated';
  ELSE
    v_kind := 'matter_updated';
  END IF;

  INSERT INTO public.governance_matter_revisions (
    matter_id, property_id, revision_no, change_kind,
    title, description, category, status,
    discussion_deadline, resolution_deadline, meeting_id, voting_id,
    snapshot, changed_by
  ) VALUES (
    NEW.id, NEW.property_id, v_rev, v_kind,
    NEW.title, NEW.description, NEW.category, NEW.status,
    NEW.discussion_deadline, NEW.resolution_deadline, NEW.meeting_id, NEW.voting_id,
    jsonb_build_object(
      'previous', jsonb_build_object(
        'title', OLD.title,
        'description', OLD.description,
        'category', OLD.category,
        'status', OLD.status,
        'discussion_deadline', OLD.discussion_deadline,
        'resolution_deadline', OLD.resolution_deadline
      )
    ),
    (SELECT auth.uid())
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.governance_matter_touch_last_revision()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.last_revision_at := now();
  IF NEW.status = 'archived' AND OLD.status IS DISTINCT FROM 'archived' THEN
    NEW.archived_at := COALESCE(NEW.archived_at, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_governance_matter_revision ON public.governance_matters;
DROP TRIGGER IF EXISTS trg_governance_matter_revision_insert ON public.governance_matters;
DROP TRIGGER IF EXISTS trg_governance_matter_revision_update ON public.governance_matters;
DROP TRIGGER IF EXISTS trg_governance_matter_touch ON public.governance_matters;

CREATE TRIGGER trg_governance_matter_touch
  BEFORE UPDATE ON public.governance_matters
  FOR EACH ROW
  EXECUTE FUNCTION public.governance_matter_touch_last_revision();

CREATE TRIGGER trg_governance_matter_revision_insert
  AFTER INSERT ON public.governance_matters
  FOR EACH ROW
  EXECUTE FUNCTION public.governance_matter_log_revision_insert();

CREATE TRIGGER trg_governance_matter_revision_update
  AFTER UPDATE ON public.governance_matters
  FOR EACH ROW
  EXECUTE FUNCTION public.governance_matter_log_revision_update();

-- Immutable comment bodies
CREATE OR REPLACE FUNCTION public.governance_matter_comment_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.body IS DISTINCT FROM NEW.body
      OR OLD.author_id IS DISTINCT FROM NEW.author_id
      OR OLD.matter_id IS DISTINCT FROM NEW.matter_id
      OR OLD.property_id IS DISTINCT FROM NEW.property_id THEN
      RAISE EXCEPTION 'Governance matter comments are immutable';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Governance matter comments cannot be deleted; use moderation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_governance_matter_comment_immutable ON public.governance_matter_comments;
CREATE TRIGGER trg_governance_matter_comment_immutable
  BEFORE UPDATE OR DELETE ON public.governance_matter_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.governance_matter_comment_immutable();

CREATE OR REPLACE FUNCTION public.moderate_governance_matter_comment(
  p_comment_id uuid,
  p_action text,
  p_reason text DEFAULT NULL
)
RETURNS public.governance_matter_comments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comment public.governance_matter_comments;
  v_uid uuid := auth.uid();
  v_visibility text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_comment FROM public.governance_matter_comments WHERE id = p_comment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comment not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.property_members pm
    WHERE pm.user_id = v_uid
      AND pm.property_id = v_comment.property_id
      AND pm.status = 'active'
      AND pm.role IN ('council', 'admin', 'property_admin', 'manager')
  ) THEN
    RAISE EXCEPTION 'Not authorized to moderate';
  END IF;

  IF p_action = 'hide' THEN
    v_visibility := 'hidden';
  ELSIF p_action = 'remove' THEN
    v_visibility := 'removed';
  ELSIF p_action = 'flag' THEN
    v_visibility := v_comment.visibility;
  ELSE
    RAISE EXCEPTION 'Invalid moderation action';
  END IF;

  INSERT INTO public.governance_matter_comment_moderation (
    comment_id, matter_id, property_id, action, reason, acted_by
  ) VALUES (
    v_comment.id, v_comment.matter_id, v_comment.property_id, p_action, p_reason, v_uid
  );

  IF p_action IN ('hide', 'remove') THEN
    UPDATE public.governance_matter_comments
    SET visibility = v_visibility
    WHERE id = v_comment.id
    RETURNING * INTO v_comment;
  ELSE
    SELECT * INTO v_comment FROM public.governance_matter_comments WHERE id = p_comment_id;
  END IF;

  RETURN v_comment;
END;
$$;

GRANT EXECUTE ON FUNCTION public.moderate_governance_matter_comment(uuid, text, text) TO authenticated;

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.governance_matters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_matter_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_matter_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_matter_comment_moderation ENABLE ROW LEVEL SECURITY;

-- RC-011 IU-3: guarded policies for idempotent re-apply (OOB catalog)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'governance_matters' AND policyname = 'gm_select_tenant'
  ) THEN
    CREATE POLICY "gm_select_tenant"
      ON public.governance_matters FOR SELECT TO authenticated
      USING (property_id IN (SELECT public.user_property_ids()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'governance_matters' AND policyname = 'gm_insert_council'
  ) THEN
    CREATE POLICY "gm_insert_council"
      ON public.governance_matters FOR INSERT TO authenticated
      WITH CHECK (
        property_id IN (SELECT public.user_property_ids())
        AND EXISTS (
          SELECT 1 FROM public.property_members pm
          WHERE pm.user_id = (SELECT auth.uid())
            AND pm.property_id = governance_matters.property_id
            AND pm.status = 'active'
            AND pm.role IN ('council', 'admin', 'property_admin')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'governance_matters' AND policyname = 'gm_update_council'
  ) THEN
    CREATE POLICY "gm_update_council"
      ON public.governance_matters FOR UPDATE TO authenticated
      USING (
        property_id IN (SELECT public.user_property_ids())
        AND EXISTS (
          SELECT 1 FROM public.property_members pm
          WHERE pm.user_id = (SELECT auth.uid())
            AND pm.property_id = governance_matters.property_id
            AND pm.status = 'active'
            AND pm.role IN ('council', 'admin', 'property_admin')
        )
      )
      WITH CHECK (
        property_id IN (SELECT public.user_property_ids())
        AND EXISTS (
          SELECT 1 FROM public.property_members pm
          WHERE pm.user_id = (SELECT auth.uid())
            AND pm.property_id = governance_matters.property_id
            AND pm.status = 'active'
            AND pm.role IN ('council', 'admin', 'property_admin')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'governance_matter_revisions' AND policyname = 'gm_rev_select_tenant'
  ) THEN
    CREATE POLICY "gm_rev_select_tenant"
      ON public.governance_matter_revisions FOR SELECT TO authenticated
      USING (property_id IN (SELECT public.user_property_ids()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'governance_matter_comments' AND policyname = 'gm_comment_select_tenant'
  ) THEN
    CREATE POLICY "gm_comment_select_tenant"
      ON public.governance_matter_comments FOR SELECT TO authenticated
      USING (
        property_id IN (SELECT public.user_property_ids())
        AND (
          visibility = 'visible'
          OR author_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.property_members pm
            WHERE pm.user_id = (SELECT auth.uid())
              AND pm.property_id = governance_matter_comments.property_id
              AND pm.status = 'active'
              AND pm.role IN ('council', 'admin', 'property_admin', 'manager')
          )
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'governance_matter_comments' AND policyname = 'gm_comment_insert_member'
  ) THEN
    CREATE POLICY "gm_comment_insert_member"
      ON public.governance_matter_comments FOR INSERT TO authenticated
      WITH CHECK (
        property_id IN (SELECT public.user_property_ids())
        AND author_id = (SELECT auth.uid())
        AND EXISTS (
          SELECT 1 FROM public.property_members pm
          WHERE pm.user_id = (SELECT auth.uid())
            AND pm.property_id = governance_matter_comments.property_id
            AND pm.status = 'active'
            AND pm.role IN ('owner', 'council', 'admin', 'property_admin', 'manager')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'governance_matter_comment_moderation' AND policyname = 'gm_mod_select_staff'
  ) THEN
    CREATE POLICY "gm_mod_select_staff"
      ON public.governance_matter_comment_moderation FOR SELECT TO authenticated
      USING (
        property_id IN (SELECT public.user_property_ids())
        AND EXISTS (
          SELECT 1 FROM public.property_members pm
          WHERE pm.user_id = (SELECT auth.uid())
            AND pm.property_id = governance_matter_comment_moderation.property_id
            AND pm.status = 'active'
            AND pm.role IN ('council', 'admin', 'property_admin', 'manager')
        )
      );
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE ON public.governance_matters TO authenticated;
GRANT SELECT ON public.governance_matter_revisions TO authenticated;
GRANT SELECT, INSERT ON public.governance_matter_comments TO authenticated;
GRANT SELECT ON public.governance_matter_comment_moderation TO authenticated;
GRANT ALL ON public.governance_matters TO service_role;
GRANT ALL ON public.governance_matter_revisions TO service_role;
GRANT ALL ON public.governance_matter_comments TO service_role;
GRANT ALL ON public.governance_matter_comment_moderation TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
