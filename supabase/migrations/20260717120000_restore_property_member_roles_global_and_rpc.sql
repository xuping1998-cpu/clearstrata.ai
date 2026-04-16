/*
  # Restore mistaken `owner` rows on property_members (all properties) + RPC for staff presence

  ## Rules
  - Only **promote** rows where `property_members.role = 'owner'` (never overwrite admin/council/manager/property_admin).
  - Order: (1) latest **approved** `join_requests.requested_role` per (property_id, user_id), then (2) `profiles.role`.
  - Manual by email: edit and run the commented block at the bottom in the SQL editor (no production emails in repo).

  ## Manual email template (run after migrate if needed)
  See block at end of file.
*/

-- ---------------------------------------------------------------------------
-- 1) RPC: any active member can ask whether this property still has staff
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.property_has_management_staff(p_property_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.property_id = p_property_id
      AND pm.user_id = (SELECT auth.uid())
      AND pm.status::text = 'active'
  ) THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.property_id = p_property_id
      AND pm.status::text = 'active'
      AND pm.role::text IN ('admin', 'council', 'manager', 'property_admin')
  );
END;
$$;

COMMENT ON FUNCTION public.property_has_management_staff(uuid) IS
  'True if the property has at least one active staff member (admin/council/manager/property_admin). Caller must be an active member.';

REVOKE ALL ON FUNCTION public.property_has_management_staff(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.property_has_management_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.property_has_management_staff(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- 2) One-time restore: join_requests → property_members (owner rows only)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  n_jr int := 0;
  n_pf int := 0;
BEGIN
  WITH jr_best AS (
    SELECT DISTINCT ON (jr.property_id, jr.user_id)
      jr.property_id,
      jr.user_id,
      CASE jr.requested_role::text
        WHEN 'admin' THEN 'admin'::public.user_role
        WHEN 'council' THEN 'council'::public.user_role
        WHEN 'manager' THEN 'manager'::public.user_role
        WHEN 'property_admin' THEN 'manager'::public.user_role
        ELSE NULL::public.user_role
      END AS staff_role,
      jr.reviewed_at,
      jr.created_at
    FROM public.join_requests jr
    WHERE jr.status::text = 'approved'
    ORDER BY
      jr.property_id,
      jr.user_id,
      jr.reviewed_at DESC NULLS LAST,
      jr.created_at DESC
  ),
  promoted AS (
    UPDATE public.property_members pm
    SET role = jb.staff_role
    FROM jr_best jb
    WHERE pm.property_id = jb.property_id
      AND pm.user_id = jb.user_id
      AND pm.role::text = 'owner'
      AND jb.staff_role IS NOT NULL
    RETURNING pm.user_id
  )
  SELECT COUNT(*) INTO n_jr FROM promoted;

  RAISE NOTICE '[property_members restore] promoted from join_requests (owner→staff): %', n_jr;

  WITH promoted AS (
    UPDATE public.property_members pm
    SET role = (
      CASE p.role::text
        WHEN 'admin' THEN 'admin'
        WHEN 'council' THEN 'council'
        WHEN 'manager' THEN 'manager'
        WHEN 'property_admin' THEN 'manager'
        ELSE 'owner'
      END
    )::public.user_role
    FROM public.profiles p
    WHERE pm.user_id = p.id
      AND pm.role::text = 'owner'
      AND p.role::text IN ('admin', 'council', 'manager', 'property_admin')
    RETURNING pm.user_id
  )
  SELECT COUNT(*) INTO n_pf FROM promoted;

  RAISE NOTICE '[property_members restore] promoted from profiles.role (owner→staff): %', n_pf;
END;
$$;

COMMENT ON FUNCTION public.residents_ensure_property_member() IS
  'Keeps property_members in sync when residents are added or moved: inserts (property_id, user_id) with role=owner and status=active only when no row exists (NOT EXISTS). Never updates an existing membership row.';

/*
  ## Manual restore by profiles.email (run in SQL editor after editing)

  UPDATE public.property_members pm
  SET role = 'admin'::public.user_role
  FROM public.profiles p
  WHERE pm.user_id = p.id
    AND pm.role = 'owner'::public.user_role
    AND lower(trim(p.email::text)) = lower(trim('YOUR_ADMIN_EMAIL@example.com'));

  Repeat for council / manager; only touches rows still role = owner.
*/
