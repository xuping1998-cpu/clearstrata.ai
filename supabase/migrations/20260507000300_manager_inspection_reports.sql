/*
  Phase 1: manager inspection reports + owner reviews (RLS-only; no frontend / Edge Function).

  Flow: manager creates inspection → publish / progress / complete → visible to owners + reviews.

  Constraints:
  - No platform_admin cross-property bypass (policies use property_members only).
*/

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Reuse existing touch helper when present (see manager_monthly_reports migration).
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

-- Optional alias requested by spec (same behaviour as set_updated_at).
CREATE OR REPLACE FUNCTION public.set_property_manager_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$fn$;

COMMENT ON FUNCTION public.set_property_manager_updated_at() IS
  'Alias for manager property tooling; keeps updated_at in sync with set_updated_at.';

-- ---------------------------------------------------------------------------
-- 1. manager_inspection_reports
-- ---------------------------------------------------------------------------
CREATE TABLE public.manager_inspection_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  title text NOT NULL,
  inspection_date date NOT NULL,
  inspector_name text,
  areas text[] NOT NULL DEFAULT ARRAY[]::text[],
  categories text[] NOT NULL DEFAULT ARRAY[]::text[],

  summary text,
  findings text NOT NULL,
  risk_level text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'draft',
  action_plan text,
  expected_completion_date date,
  completed_at timestamptz,

  evidence_urls jsonb NOT NULL DEFAULT '[]'::jsonb,

  report_text text,
  published_at timestamptz,
  published_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT manager_inspection_reports_risk_level_check
    CHECK (risk_level IN ('normal', 'repair_needed', 'high_risk')),
  CONSTRAINT manager_inspection_reports_status_check
    CHECK (status IN ('draft', 'published', 'in_progress', 'completed', 'archived'))
);

CREATE INDEX idx_manager_inspection_reports_property_id
  ON public.manager_inspection_reports (property_id);

CREATE INDEX idx_manager_inspection_reports_inspection_date_desc
  ON public.manager_inspection_reports (inspection_date DESC);

CREATE INDEX idx_manager_inspection_reports_status
  ON public.manager_inspection_reports (status);

CREATE INDEX idx_manager_inspection_reports_risk_level
  ON public.manager_inspection_reports (risk_level);

DROP TRIGGER IF EXISTS trg_manager_inspection_reports_updated_at ON public.manager_inspection_reports;
CREATE TRIGGER trg_manager_inspection_reports_updated_at
  BEFORE UPDATE ON public.manager_inspection_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.set_property_manager_updated_at();

-- ---------------------------------------------------------------------------
-- 2. manager_inspection_report_reviews
-- ---------------------------------------------------------------------------
CREATE TABLE public.manager_inspection_report_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_report_id uuid NOT NULL REFERENCES public.manager_inspection_reports(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_role text,

  rating integer CHECK (rating BETWEEN 1 AND 5),
  comment text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT manager_inspection_report_reviews_report_reviewer_uk
    UNIQUE (inspection_report_id, reviewer_id)
);

CREATE INDEX idx_manager_inspection_report_reviews_inspection_report_id
  ON public.manager_inspection_report_reviews (inspection_report_id);

CREATE INDEX idx_manager_inspection_report_reviews_property_id
  ON public.manager_inspection_report_reviews (property_id);

CREATE OR REPLACE FUNCTION public.trg_manager_inspection_report_reviews_align_property_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pid uuid;
BEGIN
  SELECT r.property_id INTO v_pid
  FROM public.manager_inspection_reports r
  WHERE r.id = NEW.inspection_report_id;

  IF v_pid IS NULL THEN
    RAISE EXCEPTION 'manager_inspection_report_reviews: invalid inspection_report_id';
  END IF;

  NEW.property_id := v_pid;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_manager_inspection_report_reviews_align_property_id() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_manager_inspection_report_reviews_align_property_id
  ON public.manager_inspection_report_reviews;
CREATE TRIGGER trg_manager_inspection_report_reviews_align_property_id
  BEFORE INSERT OR UPDATE OF inspection_report_id ON public.manager_inspection_report_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_manager_inspection_report_reviews_align_property_id();

DROP TRIGGER IF EXISTS trg_manager_inspection_report_reviews_updated_at ON public.manager_inspection_report_reviews;
CREATE TRIGGER trg_manager_inspection_report_reviews_updated_at
  BEFORE UPDATE ON public.manager_inspection_report_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_property_manager_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Grants (no DELETE for authenticated)
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON public.manager_inspection_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.manager_inspection_report_reviews TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. RLS: manager_inspection_reports
-- ---------------------------------------------------------------------------
ALTER TABLE public.manager_inspection_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "manager_inspection_reports_select" ON public.manager_inspection_reports;
CREATE POLICY "manager_inspection_reports_select"
  ON public.manager_inspection_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = manager_inspection_reports.property_id
        AND pm.user_id = (SELECT auth.uid())
        AND pm.status = 'active'::public.member_status
        AND (
          manager_inspection_reports.status IN ('published', 'in_progress', 'completed')
          OR (
            manager_inspection_reports.status IN ('draft', 'archived')
            AND pm.role = 'manager'::public.user_role
          )
        )
    )
  );

DROP POLICY IF EXISTS "manager_inspection_reports_insert" ON public.manager_inspection_reports;
CREATE POLICY "manager_inspection_reports_insert"
  ON public.manager_inspection_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = manager_inspection_reports.property_id
        AND pm.user_id = (SELECT auth.uid())
        AND pm.status = 'active'::public.member_status
        AND pm.role = 'manager'::public.user_role
    )
  );

DROP POLICY IF EXISTS "manager_inspection_reports_update" ON public.manager_inspection_reports;
CREATE POLICY "manager_inspection_reports_update"
  ON public.manager_inspection_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = manager_inspection_reports.property_id
        AND pm.user_id = (SELECT auth.uid())
        AND pm.status = 'active'::public.member_status
        AND pm.role = 'manager'::public.user_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = manager_inspection_reports.property_id
        AND pm.user_id = (SELECT auth.uid())
        AND pm.status = 'active'::public.member_status
        AND pm.role = 'manager'::public.user_role
    )
  );

-- ---------------------------------------------------------------------------
-- 5. RLS: manager_inspection_report_reviews
-- ---------------------------------------------------------------------------
ALTER TABLE public.manager_inspection_report_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "manager_inspection_report_reviews_select" ON public.manager_inspection_report_reviews;
CREATE POLICY "manager_inspection_report_reviews_select"
  ON public.manager_inspection_report_reviews
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = manager_inspection_report_reviews.property_id
        AND pm.user_id = (SELECT auth.uid())
        AND pm.status = 'active'::public.member_status
    )
  );

DROP POLICY IF EXISTS "manager_inspection_report_reviews_insert" ON public.manager_inspection_report_reviews;
CREATE POLICY "manager_inspection_report_reviews_insert"
  ON public.manager_inspection_report_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    reviewer_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = manager_inspection_report_reviews.property_id
        AND pm.user_id = (SELECT auth.uid())
        AND pm.status = 'active'::public.member_status
    )
    AND EXISTS (
      SELECT 1
      FROM public.manager_inspection_reports r
      WHERE r.id = manager_inspection_report_reviews.inspection_report_id
        AND r.property_id = manager_inspection_report_reviews.property_id
        AND r.status IN ('published', 'in_progress', 'completed')
    )
  );

DROP POLICY IF EXISTS "manager_inspection_report_reviews_update" ON public.manager_inspection_report_reviews;
CREATE POLICY "manager_inspection_report_reviews_update"
  ON public.manager_inspection_report_reviews
  FOR UPDATE
  TO authenticated
  USING (
    reviewer_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = manager_inspection_report_reviews.property_id
        AND pm.user_id = (SELECT auth.uid())
        AND pm.status = 'active'::public.member_status
    )
  )
  WITH CHECK (
    reviewer_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = manager_inspection_report_reviews.property_id
        AND pm.user_id = (SELECT auth.uid())
        AND pm.status = 'active'::public.member_status
    )
  );

COMMIT;

NOTIFY pgrst, 'reload schema';
