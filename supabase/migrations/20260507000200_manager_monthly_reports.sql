/*
  Phase 1: manager monthly reports + owner reviews (RLS-only; no frontend / Edge Function).

  Flow: draft (system/manager) -> manager confirms -> publish -> visible to active members + reviews.

  Constraints:
  - No platform_admin cross-property bypass (policies use property_members only).
*/

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Updated_at helper (reuse if present)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 1. manager_monthly_reports
-- ---------------------------------------------------------------------------
CREATE TABLE public.manager_monthly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  report_month date NOT NULL,
  status text NOT NULL DEFAULT 'draft',

  generated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at timestamptz,

  owner_request_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  inspection_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  public_matter_summary jsonb NOT NULL DEFAULT '{}'::jsonb,

  monthly_summary text,
  key_risks text,
  long_term_items text,
  next_month_focus text,

  generated_text jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT manager_monthly_reports_status_check
    CHECK (status IN ('draft', 'published')),
  CONSTRAINT manager_monthly_reports_property_month_uk UNIQUE (property_id, report_month)
);

CREATE INDEX idx_manager_monthly_reports_property_id
  ON public.manager_monthly_reports (property_id);

CREATE INDEX idx_manager_monthly_reports_report_month_desc
  ON public.manager_monthly_reports (report_month DESC);

CREATE INDEX idx_manager_monthly_reports_status
  ON public.manager_monthly_reports (status);

DROP TRIGGER IF EXISTS trg_manager_monthly_reports_updated_at ON public.manager_monthly_reports;
CREATE TRIGGER trg_manager_monthly_reports_updated_at
  BEFORE UPDATE ON public.manager_monthly_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.manager_monthly_reports IS
  'Monthly manager reports: drafts visible only to property managers; published visible to all active members.';

-- ---------------------------------------------------------------------------
-- 2. manager_monthly_report_reviews
-- ---------------------------------------------------------------------------
CREATE TABLE public.manager_monthly_report_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.manager_monthly_reports(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_role text,

  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT manager_monthly_report_reviews_report_reviewer_uk UNIQUE (report_id, reviewer_id)
);

CREATE INDEX idx_manager_monthly_report_reviews_report_id
  ON public.manager_monthly_report_reviews (report_id);

CREATE INDEX idx_manager_monthly_report_reviews_property_id
  ON public.manager_monthly_report_reviews (property_id);

-- Keep property_id aligned with parent report for RLS and safety
CREATE OR REPLACE FUNCTION public.trg_manager_monthly_report_reviews_align_property_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pid uuid;
BEGIN
  SELECT r.property_id INTO v_pid
  FROM public.manager_monthly_reports r
  WHERE r.id = NEW.report_id;

  IF v_pid IS NULL THEN
    RAISE EXCEPTION 'manager_monthly_report_reviews: invalid report_id';
  END IF;

  NEW.property_id := v_pid;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_manager_monthly_report_reviews_align_property_id() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_manager_monthly_report_reviews_align_property_id
  ON public.manager_monthly_report_reviews;
CREATE TRIGGER trg_manager_monthly_report_reviews_align_property_id
  BEFORE INSERT OR UPDATE OF report_id ON public.manager_monthly_report_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_manager_monthly_report_reviews_align_property_id();

DROP TRIGGER IF EXISTS trg_manager_monthly_report_reviews_updated_at ON public.manager_monthly_report_reviews;
CREATE TRIGGER trg_manager_monthly_report_reviews_updated_at
  BEFORE UPDATE ON public.manager_monthly_report_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Grants (no DELETE for authenticated)
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON public.manager_monthly_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.manager_monthly_report_reviews TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. RLS: manager_monthly_reports
-- ---------------------------------------------------------------------------
ALTER TABLE public.manager_monthly_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "manager_monthly_reports_select" ON public.manager_monthly_reports;
CREATE POLICY "manager_monthly_reports_select"
  ON public.manager_monthly_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = manager_monthly_reports.property_id
        AND pm.user_id = (SELECT auth.uid())
        AND pm.status = 'active'::public.member_status
        AND (
          manager_monthly_reports.status = 'published'
          OR (
            manager_monthly_reports.status = 'draft'
            AND pm.role = 'manager'::public.user_role
          )
        )
    )
  );

DROP POLICY IF EXISTS "manager_monthly_reports_insert" ON public.manager_monthly_reports;
CREATE POLICY "manager_monthly_reports_insert"
  ON public.manager_monthly_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    status = 'draft'
    AND EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = manager_monthly_reports.property_id
        AND pm.user_id = (SELECT auth.uid())
        AND pm.status = 'active'::public.member_status
        AND pm.role = 'manager'::public.user_role
    )
  );

DROP POLICY IF EXISTS "manager_monthly_reports_update" ON public.manager_monthly_reports;
CREATE POLICY "manager_monthly_reports_update"
  ON public.manager_monthly_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = manager_monthly_reports.property_id
        AND pm.user_id = (SELECT auth.uid())
        AND pm.status = 'active'::public.member_status
        AND pm.role = 'manager'::public.user_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = manager_monthly_reports.property_id
        AND pm.user_id = (SELECT auth.uid())
        AND pm.status = 'active'::public.member_status
        AND pm.role = 'manager'::public.user_role
    )
  );

-- DELETE: no policy -> denied for authenticated

-- ---------------------------------------------------------------------------
-- 5. RLS: manager_monthly_report_reviews
-- ---------------------------------------------------------------------------
ALTER TABLE public.manager_monthly_report_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "manager_monthly_report_reviews_select" ON public.manager_monthly_report_reviews;
CREATE POLICY "manager_monthly_report_reviews_select"
  ON public.manager_monthly_report_reviews
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = manager_monthly_report_reviews.property_id
        AND pm.user_id = (SELECT auth.uid())
        AND pm.status = 'active'::public.member_status
    )
  );

DROP POLICY IF EXISTS "manager_monthly_report_reviews_insert" ON public.manager_monthly_report_reviews;
CREATE POLICY "manager_monthly_report_reviews_insert"
  ON public.manager_monthly_report_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    reviewer_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = manager_monthly_report_reviews.property_id
        AND pm.user_id = (SELECT auth.uid())
        AND pm.status = 'active'::public.member_status
    )
    AND EXISTS (
      SELECT 1
      FROM public.manager_monthly_reports r
      WHERE r.id = manager_monthly_report_reviews.report_id
        AND r.property_id = manager_monthly_report_reviews.property_id
        AND r.status = 'published'
    )
  );

DROP POLICY IF EXISTS "manager_monthly_report_reviews_update" ON public.manager_monthly_report_reviews;
CREATE POLICY "manager_monthly_report_reviews_update"
  ON public.manager_monthly_report_reviews
  FOR UPDATE
  TO authenticated
  USING (
    reviewer_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = manager_monthly_report_reviews.property_id
        AND pm.user_id = (SELECT auth.uid())
        AND pm.status = 'active'::public.member_status
    )
  )
  WITH CHECK (
    reviewer_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = manager_monthly_report_reviews.property_id
        AND pm.user_id = (SELECT auth.uid())
        AND pm.status = 'active'::public.member_status
    )
    AND EXISTS (
      SELECT 1
      FROM public.manager_monthly_reports r
      WHERE r.id = manager_monthly_report_reviews.report_id
        AND r.property_id = manager_monthly_report_reviews.property_id
        AND r.status = 'published'
    )
  );

-- DELETE: no policy -> denied

COMMIT;

NOTIFY pgrst, 'reload schema';
