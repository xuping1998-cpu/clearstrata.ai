/*
  Phase 1: manager public matters + owner reviews (RLS-only; no frontend / Edge Function).

  Flow: manager creates matter → publish / track → visible to owners + reviews.

  Constraints:
  - No platform_admin cross-property bypass (policies use property_members only).
*/

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'set_updated_at'
  ) THEN
    CREATE FUNCTION public.set_updated_at()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $fn$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $fn$;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.set_property_manager_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$fn$;

-- ---------------------------------------------------------------------------
-- 1. manager_public_matters
-- ---------------------------------------------------------------------------
CREATE TABLE public.manager_public_matters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  title text NOT NULL,
  matter_type text NOT NULL,
  occurred_at timestamptz,
  location text,
  source text,
  scope text,

  description text NOT NULL,
  impact text,
  risk_level text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'draft',
  management_response text,
  action_plan text,
  expected_completion_date date,
  completed_at timestamptz,

  evidence_urls jsonb NOT NULL DEFAULT '[]'::jsonb,

  report_text text,
  published_at timestamptz,
  published_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT manager_public_matters_matter_type_check
    CHECK (matter_type IN (
      'public_issue',
      'announcement',
      'safety_notice',
      'complaint_hotspot',
      'long_term_followup'
    )),
  CONSTRAINT manager_public_matters_risk_level_check
    CHECK (risk_level IN ('low', 'normal', 'high')),
  CONSTRAINT manager_public_matters_status_check
    CHECK (status IN (
      'draft',
      'published',
      'in_progress',
      'resolved',
      'long_term',
      'closed',
      'archived'
    ))
);

CREATE INDEX idx_manager_public_matters_property_id
  ON public.manager_public_matters (property_id);

CREATE INDEX idx_manager_public_matters_occurred_at_desc
  ON public.manager_public_matters (occurred_at DESC);

CREATE INDEX idx_manager_public_matters_status
  ON public.manager_public_matters (status);

CREATE INDEX idx_manager_public_matters_matter_type
  ON public.manager_public_matters (matter_type);

CREATE INDEX idx_manager_public_matters_risk_level
  ON public.manager_public_matters (risk_level);

DROP TRIGGER IF EXISTS trg_manager_public_matters_updated_at ON public.manager_public_matters;
CREATE TRIGGER trg_manager_public_matters_updated_at
  BEFORE UPDATE ON public.manager_public_matters
  FOR EACH ROW
  EXECUTE FUNCTION public.set_property_manager_updated_at();

-- ---------------------------------------------------------------------------
-- 2. manager_public_matter_reviews
-- ---------------------------------------------------------------------------
CREATE TABLE public.manager_public_matter_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_matter_id uuid NOT NULL REFERENCES public.manager_public_matters(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_role text,

  rating integer CHECK (rating BETWEEN 1 AND 5),
  comment text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT manager_public_matter_reviews_matter_reviewer_uk UNIQUE (public_matter_id, reviewer_id)
);

CREATE INDEX idx_manager_public_matter_reviews_public_matter_id
  ON public.manager_public_matter_reviews (public_matter_id);

CREATE INDEX idx_manager_public_matter_reviews_property_id
  ON public.manager_public_matter_reviews (property_id);

CREATE OR REPLACE FUNCTION public.trg_manager_public_matter_reviews_align_property_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pid uuid;
BEGIN
  SELECT m.property_id INTO v_pid
  FROM public.manager_public_matters m
  WHERE m.id = NEW.public_matter_id;

  IF v_pid IS NULL THEN
    RAISE EXCEPTION 'manager_public_matter_reviews: invalid public_matter_id';
  END IF;

  NEW.property_id := v_pid;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_manager_public_matter_reviews_align_property_id() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_manager_public_matter_reviews_align_property_id
  ON public.manager_public_matter_reviews;
CREATE TRIGGER trg_manager_public_matter_reviews_align_property_id
  BEFORE INSERT OR UPDATE OF public_matter_id ON public.manager_public_matter_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_manager_public_matter_reviews_align_property_id();

DROP TRIGGER IF EXISTS trg_manager_public_matter_reviews_updated_at ON public.manager_public_matter_reviews;
CREATE TRIGGER trg_manager_public_matter_reviews_updated_at
  BEFORE UPDATE ON public.manager_public_matter_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_property_manager_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Grants (no DELETE for authenticated)
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON public.manager_public_matters TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.manager_public_matter_reviews TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. RLS: manager_public_matters
-- ---------------------------------------------------------------------------
ALTER TABLE public.manager_public_matters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "manager_public_matters_select" ON public.manager_public_matters;
CREATE POLICY "manager_public_matters_select"
  ON public.manager_public_matters
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = manager_public_matters.property_id
        AND pm.user_id = (SELECT auth.uid())
        AND pm.status = 'active'::public.member_status
        AND (
          manager_public_matters.status IN (
            'published',
            'in_progress',
            'resolved',
            'long_term',
            'closed'
          )
          OR (
            manager_public_matters.status IN ('draft', 'archived')
            AND pm.role = 'manager'::public.user_role
          )
        )
    )
  );

DROP POLICY IF EXISTS "manager_public_matters_insert" ON public.manager_public_matters;
CREATE POLICY "manager_public_matters_insert"
  ON public.manager_public_matters
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = manager_public_matters.property_id
        AND pm.user_id = (SELECT auth.uid())
        AND pm.status = 'active'::public.member_status
        AND pm.role = 'manager'::public.user_role
    )
  );

DROP POLICY IF EXISTS "manager_public_matters_update" ON public.manager_public_matters;
CREATE POLICY "manager_public_matters_update"
  ON public.manager_public_matters
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = manager_public_matters.property_id
        AND pm.user_id = (SELECT auth.uid())
        AND pm.status = 'active'::public.member_status
        AND pm.role = 'manager'::public.user_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = manager_public_matters.property_id
        AND pm.user_id = (SELECT auth.uid())
        AND pm.status = 'active'::public.member_status
        AND pm.role = 'manager'::public.user_role
    )
  );

-- ---------------------------------------------------------------------------
-- 5. RLS: manager_public_matter_reviews
-- ---------------------------------------------------------------------------
ALTER TABLE public.manager_public_matter_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "manager_public_matter_reviews_select" ON public.manager_public_matter_reviews;
CREATE POLICY "manager_public_matter_reviews_select"
  ON public.manager_public_matter_reviews
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = manager_public_matter_reviews.property_id
        AND pm.user_id = (SELECT auth.uid())
        AND pm.status = 'active'::public.member_status
    )
  );

DROP POLICY IF EXISTS "manager_public_matter_reviews_insert" ON public.manager_public_matter_reviews;
CREATE POLICY "manager_public_matter_reviews_insert"
  ON public.manager_public_matter_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    reviewer_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = manager_public_matter_reviews.property_id
        AND pm.user_id = (SELECT auth.uid())
        AND pm.status = 'active'::public.member_status
    )
    AND EXISTS (
      SELECT 1
      FROM public.manager_public_matters m
      WHERE m.id = manager_public_matter_reviews.public_matter_id
        AND m.property_id = manager_public_matter_reviews.property_id
        AND m.status IN (
          'published',
          'in_progress',
          'resolved',
          'long_term',
          'closed'
        )
    )
  );

DROP POLICY IF EXISTS "manager_public_matter_reviews_update" ON public.manager_public_matter_reviews;
CREATE POLICY "manager_public_matter_reviews_update"
  ON public.manager_public_matter_reviews
  FOR UPDATE
  TO authenticated
  USING (
    reviewer_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = manager_public_matter_reviews.property_id
        AND pm.user_id = (SELECT auth.uid())
        AND pm.status = 'active'::public.member_status
    )
  )
  WITH CHECK (
    reviewer_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = manager_public_matter_reviews.property_id
        AND pm.user_id = (SELECT auth.uid())
        AND pm.status = 'active'::public.member_status
    )
  );

COMMIT;

NOTIFY pgrst, 'reload schema';
