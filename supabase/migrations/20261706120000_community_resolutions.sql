/*
  Project One Phase 5 — Community Resolution + Meeting/Voting Integration
  GP-004: constitutional bridge from deliberation to formal decision-making.
*/

BEGIN;

CREATE TABLE IF NOT EXISTS public.community_resolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  governance_matter_id uuid REFERENCES public.governance_matters(id) ON DELETE SET NULL,
  title text NOT NULL,
  executive_summary text,
  constitutional_basis jsonb NOT NULL DEFAULT '[]'::jsonb,
  council_review_status text NOT NULL DEFAULT 'draft' CHECK (
    council_review_status IN ('draft', 'in_review', 'revised', 'ready_for_meeting', 'scheduled', 'archived')
  ),
  meeting_id uuid REFERENCES public.meetings(id) ON DELETE SET NULL,
  owner_vote_resolution_id uuid,
  cda_report_id uuid REFERENCES public.governance_matter_cda_reports(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'council_review', 'approved', 'scheduled', 'voted', 'archived')
  ),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_revision_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_resolutions_property
  ON public.community_resolutions(property_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_resolutions_matter
  ON public.community_resolutions(governance_matter_id);

CREATE INDEX IF NOT EXISTS idx_community_resolutions_meeting
  ON public.community_resolutions(meeting_id);

COMMENT ON TABLE public.community_resolutions IS
  'GP-004 Community Resolution — organized proposal between deliberation and formal vote.';

CREATE TABLE IF NOT EXISTS public.community_resolution_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resolution_id uuid NOT NULL REFERENCES public.community_resolutions(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  revision_no integer NOT NULL CHECK (revision_no >= 1),
  change_kind text NOT NULL,
  title text,
  executive_summary text,
  council_review_status text,
  status text,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_resolution_revisions_rev_unique UNIQUE (resolution_id, revision_no)
);

CREATE INDEX IF NOT EXISTS idx_community_resolution_revisions_resolution
  ON public.community_resolution_revisions(resolution_id, revision_no);

ALTER TABLE public.governance_matters
  ADD COLUMN IF NOT EXISTS resolution_id uuid REFERENCES public.community_resolutions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_governance_matters_resolution
  ON public.governance_matters(resolution_id);

ALTER TABLE public.meeting_agenda_items
  ADD COLUMN IF NOT EXISTS community_resolution_id uuid REFERENCES public.community_resolutions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_meeting_agenda_items_community_resolution
  ON public.meeting_agenda_items(community_resolution_id);

DO $$
BEGIN
  IF to_regclass('public.owner_vote_resolutions') IS NOT NULL THEN
    ALTER TABLE public.owner_vote_resolutions
      ADD COLUMN IF NOT EXISTS community_resolution_id uuid REFERENCES public.community_resolutions(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_owner_vote_resolutions_community_resolution
      ON public.owner_vote_resolutions(community_resolution_id);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.meeting_votes') IS NOT NULL THEN
    ALTER TABLE public.meeting_votes
      ADD COLUMN IF NOT EXISTS community_resolution_id uuid REFERENCES public.community_resolutions(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_meeting_votes_community_resolution
      ON public.meeting_votes(community_resolution_id);
  END IF;
END $$;

-- Revision logging
CREATE OR REPLACE FUNCTION public.community_resolution_next_revision_no(p_resolution_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(MAX(revision_no), 0) + 1 FROM public.community_resolution_revisions WHERE resolution_id = p_resolution_id;
$$;

CREATE OR REPLACE FUNCTION public.community_resolution_log_revision_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.community_resolution_revisions (
    resolution_id, property_id, revision_no, change_kind,
    title, executive_summary, council_review_status, status,
    snapshot, changed_by
  ) VALUES (
    NEW.id, NEW.property_id, 1, 'resolution_created',
    NEW.title, NEW.executive_summary, NEW.council_review_status, NEW.status,
    jsonb_build_object('op', 'insert'), NEW.created_by
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.community_resolution_log_revision_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kind text;
  v_rev integer;
BEGIN
  v_rev := public.community_resolution_next_revision_no(NEW.id);
  IF OLD.title IS DISTINCT FROM NEW.title THEN
    v_kind := 'title_updated';
  ELSIF OLD.executive_summary IS DISTINCT FROM NEW.executive_summary THEN
    v_kind := 'summary_updated';
  ELSIF OLD.council_review_status IS DISTINCT FROM NEW.council_review_status THEN
    v_kind := 'council_review_updated';
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    v_kind := 'status_updated';
  ELSIF OLD.meeting_id IS DISTINCT FROM NEW.meeting_id THEN
    v_kind := 'meeting_linked';
  ELSE
    v_kind := 'resolution_updated';
  END IF;

  INSERT INTO public.community_resolution_revisions (
    resolution_id, property_id, revision_no, change_kind,
    title, executive_summary, council_review_status, status,
    snapshot, changed_by
  ) VALUES (
    NEW.id, NEW.property_id, v_rev, v_kind,
    NEW.title, NEW.executive_summary, NEW.council_review_status, NEW.status,
    jsonb_build_object(
      'previous', jsonb_build_object(
        'title', OLD.title,
        'executive_summary', OLD.executive_summary,
        'council_review_status', OLD.council_review_status,
        'status', OLD.status,
        'meeting_id', OLD.meeting_id
      )
    ),
    (SELECT auth.uid())
  );
  NEW.last_revision_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_resolution_revision_insert ON public.community_resolutions;
DROP TRIGGER IF EXISTS trg_community_resolution_revision_update ON public.community_resolutions;

CREATE TRIGGER trg_community_resolution_revision_insert
  AFTER INSERT ON public.community_resolutions
  FOR EACH ROW
  EXECUTE FUNCTION public.community_resolution_log_revision_insert();

CREATE TRIGGER trg_community_resolution_revision_update
  BEFORE UPDATE ON public.community_resolutions
  FOR EACH ROW
  EXECUTE FUNCTION public.community_resolution_log_revision_update();

-- RLS
ALTER TABLE public.community_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_resolution_revisions ENABLE ROW LEVEL SECURITY;

-- RC-011 IU-3: guarded policies for idempotent re-apply (OOB catalog)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'community_resolutions' AND policyname = 'cr_select_tenant'
  ) THEN
    CREATE POLICY "cr_select_tenant"
      ON public.community_resolutions FOR SELECT TO authenticated
      USING (property_id IN (SELECT public.user_property_ids()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'community_resolutions' AND policyname = 'cr_insert_council'
  ) THEN
    CREATE POLICY "cr_insert_council"
      ON public.community_resolutions FOR INSERT TO authenticated
      WITH CHECK (
        property_id IN (SELECT public.user_property_ids())
        AND EXISTS (
          SELECT 1 FROM public.property_members pm
          WHERE pm.user_id = (SELECT auth.uid())
            AND pm.property_id = community_resolutions.property_id
            AND pm.status = 'active'
            AND pm.role IN ('council', 'admin', 'property_admin')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'community_resolutions' AND policyname = 'cr_update_council'
  ) THEN
    CREATE POLICY "cr_update_council"
      ON public.community_resolutions FOR UPDATE TO authenticated
      USING (
        property_id IN (SELECT public.user_property_ids())
        AND EXISTS (
          SELECT 1 FROM public.property_members pm
          WHERE pm.user_id = (SELECT auth.uid())
            AND pm.property_id = community_resolutions.property_id
            AND pm.status = 'active'
            AND pm.role IN ('council', 'admin', 'property_admin')
        )
      )
      WITH CHECK (
        property_id IN (SELECT public.user_property_ids())
        AND EXISTS (
          SELECT 1 FROM public.property_members pm
          WHERE pm.user_id = (SELECT auth.uid())
            AND pm.property_id = community_resolutions.property_id
            AND pm.status = 'active'
            AND pm.role IN ('council', 'admin', 'property_admin')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'community_resolution_revisions' AND policyname = 'cr_rev_select_tenant'
  ) THEN
    CREATE POLICY "cr_rev_select_tenant"
      ON public.community_resolution_revisions FOR SELECT TO authenticated
      USING (property_id IN (SELECT public.user_property_ids()));
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE ON public.community_resolutions TO authenticated;
GRANT SELECT ON public.community_resolution_revisions TO authenticated;
GRANT ALL ON public.community_resolutions TO service_role;
GRANT ALL ON public.community_resolution_revisions TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
