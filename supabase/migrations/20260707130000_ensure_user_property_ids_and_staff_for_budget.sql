/*
  Budget / dashboard RPC helpers: property sets for the current auth user (same idea as 20260410120000).

  Requires: public.member_status enum, public.property_members (status, role).
  Run earlier migrations in order before this file. This file should run before 20260708120000_dashboard_budget_rpc_deploy.sql.
*/

DO $g$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_status') THEN
    RAISE EXCEPTION 'Missing type public.member_status; apply 20260410120000_property_members_saas.sql (or full tenant chain) first';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'property_members'
  ) THEN
    RAISE EXCEPTION 'Missing table public.property_members; apply 20260410120000_property_members_saas.sql first';
  END IF;
END;
$g$;

CREATE OR REPLACE FUNCTION public.user_property_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pm.property_id
  FROM public.property_members pm
  WHERE pm.user_id = (SELECT auth.uid())
    AND pm.status = 'active';
$$;

REVOKE ALL ON FUNCTION public.user_property_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_property_ids() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.user_property_staff_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pm.property_id
  FROM public.property_members pm
  WHERE pm.user_id = (SELECT auth.uid())
    AND pm.status = 'active'
    AND pm.role IN ('property_admin', 'admin', 'council', 'manager');
$$;

REVOKE ALL ON FUNCTION public.user_property_staff_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_property_staff_ids() TO authenticated, service_role;

COMMENT ON FUNCTION public.user_property_ids() IS 'Active property memberships for auth.uid(); used by budget dashboard RPCs and RLS.';
COMMENT ON FUNCTION public.user_property_staff_ids() IS 'Staff-visible properties for current user; used by budget write RLS.';

NOTIFY pgrst, 'reload schema';




