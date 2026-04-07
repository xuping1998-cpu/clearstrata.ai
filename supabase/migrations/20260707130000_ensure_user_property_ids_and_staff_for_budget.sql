/*
  预算 / Dashboard RPC 依赖：当前登录用户可见物业集合（与 20260410120000_property_members_saas 一致）

  须已存在：
  - public.member_status 枚举
  - public.property_members 表（及 pm.status、pm.role）

  若上述不存在，请先按 BUDGET_CHAIN_DEPLOYMENT.txt 顺序执行更早的 migration（勿只执行本文件）。

  本文件在 20260708120000_dashboard_budget_rpc_deploy.sql 之前执行，避免 RPC 已部署但 user_property_ids 缺失。
*/

DO $g$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_status') THEN
    RAISE EXCEPTION 'Missing type public.member_status — apply 20260410120000_property_members_saas.sql (or full tenant chain) first';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'property_members'
  ) THEN
    RAISE EXCEPTION 'Missing table public.property_members — apply 20260410120000_property_members_saas.sql first';
  END IF;
END $g$;

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
    AND pm.status = 'active'::member_status;
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
    AND pm.status = 'active'::member_status
    AND pm.role IN ('property_admin', 'admin', 'council', 'manager');
$$;

REVOKE ALL ON FUNCTION public.user_property_staff_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_property_staff_ids() TO authenticated, service_role;

COMMENT ON FUNCTION public.user_property_ids() IS 'Active property memberships for auth.uid(); used by budget dashboard RPCs and RLS.';
COMMENT ON FUNCTION public.user_property_staff_ids() IS 'Staff-visible properties for current user; used by budget write RLS.';

NOTIFY pgrst, 'reload schema';
