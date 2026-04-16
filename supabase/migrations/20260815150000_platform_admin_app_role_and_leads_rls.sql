/*
  20260815150000_platform_admin_app_role_and_leads_rls.sql
  Platform admin auth model + leads RLS tightening

  - public.profiles.app_role: 'user' | 'platform_admin'
  - helper: public.is_platform_admin()
  - leads RLS:
      INSERT: authenticated may insert own row (created_by = auth.uid())
      SELECT/UPDATE/DELETE: platform_admin only
*/

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) profiles.app_role
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS app_role text;

UPDATE public.profiles
SET app_role = 'user'
WHERE app_role IS NULL;

-- Ensure Serena can be platform_admin (idempotent)
UPDATE public.profiles
SET app_role = 'platform_admin'
WHERE lower(email) = 'serena@clearstrata.ai';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_app_role_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_app_role_check
      CHECK (app_role IN ('user', 'platform_admin'))
      NOT VALID;
  END IF;
EXCEPTION
  WHEN others THEN
    NULL;
END
$$;

-- ---------------------------------------------------------------------------
-- 2) SQL helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.app_role = 'platform_admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) leads RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Drop legacy / prior policies to avoid accidental exposure
DROP POLICY IF EXISTS "leads_insert_self" ON public.leads;
DROP POLICY IF EXISTS "leads_internal_select" ON public.leads;
DROP POLICY IF EXISTS "leads_internal_update" ON public.leads;
DROP POLICY IF EXISTS "leads_platform_select" ON public.leads;
DROP POLICY IF EXISTS "leads_platform_update" ON public.leads;
DROP POLICY IF EXISTS "leads_platform_delete" ON public.leads;

-- INSERT: only allow logged-in user inserting their own lead row
CREATE POLICY "leads_insert_self"
  ON public.leads
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

-- SELECT: platform_admin only
CREATE POLICY "leads_platform_select"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

-- UPDATE: platform_admin only
CREATE POLICY "leads_platform_update"
  ON public.leads
  FOR UPDATE
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- DELETE: platform_admin only (optional but safer)
CREATE POLICY "leads_platform_delete"
  ON public.leads
  FOR DELETE
  TO authenticated
  USING (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- 4) properties SELECT for platform admin (needed for platform overview metrics)
--    Does not affect tenant isolation for normal users.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "properties_platform_admin_select" ON public.properties;
CREATE POLICY "properties_platform_admin_select"
  ON public.properties
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

NOTIFY pgrst, 'reload schema';

COMMIT;

