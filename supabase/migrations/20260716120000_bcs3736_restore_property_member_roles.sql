/*
  # BCS3736 — backfill property_members from residents + restore staff roles (no overwrites)

  Property id (BCS3736 in seed / demo data):
    497a907d-8df2-4e62-8859-66de6449c5c2

  ## Historical role sources (repo + schema audit)

  1. **public.property_members.role** — canonical per-property role (target of this migration).
  2. **public.profiles.role** — global account role; in single-property / legacy flows often matched
     council / manager / admin for staff accounts.
  3. **public.join_requests.requested_role** — role the user requested for this property when the
     request was **approved** (best property-specific signal).
  4. No **member_role** table/column found in migrations.

  ## Behaviour

  * **INSERT** only where `(property_id, user_id)` is missing from `property_members` (NOT EXISTS).
    Never updates or deletes existing rows in this step.
  * **Deduced role for INSERT**: latest **approved** `join_requests.requested_role` for that
    property+user (coerced to admin/council/manager/owner; `property_admin` → `manager`),
    else if `profiles.role` ∈ (admin, council, manager) use it, else **owner**.
  * **UPDATE** only rows that are still **owner**: promote to admin/council/manager when
    join_requests or profiles indicates staff — **never** demote existing admin/council/manager
    and **never** set role to owner in this migration.

  ## Manual audit (run in SQL editor after migrate)

  -- Registered in Auth but no profile row (unusual):
  -- SELECT id FROM auth.users u WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

  -- Residents for BCS not in property_members (should be 0 after INSERT):
  -- SELECT r.user_id FROM public.residents r
  -- WHERE r.property_id = '497a907d-8df2-4e62-8859-66de6449c5c2'
  --   AND NOT EXISTS (SELECT 1 FROM public.property_members pm WHERE pm.property_id = r.property_id AND pm.user_id = r.user_id);

  -- Members whose role was promoted from owner (after UPDATE waves):
  -- Re-run with your own snapshot; compare property_members.role before/after backup.
*/

DO $$
DECLARE
  v_property uuid := '497a907d-8df2-4e62-8859-66de6449c5c2'::uuid;
  n_ins int := 0;
  n_up_jr int := 0;
  n_up_pf int := 0;
BEGIN
  -- -------------------------------------------------------------------------
  -- 1) INSERT missing members from residents (no touch if row already exists)
  -- -------------------------------------------------------------------------
  WITH jr_best AS (
    SELECT DISTINCT ON (jr.user_id)
      jr.user_id,
      jr.requested_role,
      jr.reviewed_at,
      jr.created_at
    FROM public.join_requests jr
    WHERE jr.property_id = v_property
      AND jr.status::text = 'approved'
    ORDER BY jr.user_id, jr.reviewed_at DESC NULLS LAST, jr.created_at DESC
  ),
  src AS (
    SELECT
      r.property_id,
      r.user_id,
      COALESCE(
        CASE
          WHEN jb.requested_role::text IN ('admin', 'council', 'manager', 'owner')
            THEN jb.requested_role::public.user_role
          WHEN jb.requested_role::text = 'property_admin' THEN 'manager'::public.user_role
          ELSE NULL::public.user_role
        END,
        CASE
          WHEN p.role::text IN ('admin', 'council', 'manager') THEN p.role::public.user_role
          ELSE NULL::public.user_role
        END,
        'owner'::public.user_role
      ) AS deduced_role
    FROM public.residents r
    LEFT JOIN public.profiles p ON p.id = r.user_id
    LEFT JOIN jr_best jb ON jb.user_id = r.user_id
    WHERE r.property_id = v_property
      AND NOT EXISTS (
        SELECT 1
        FROM public.property_members pm
        WHERE pm.property_id = r.property_id
          AND pm.user_id = r.user_id
      )
  ),
  ins AS (
    INSERT INTO public.property_members (property_id, user_id, role, status)
    SELECT src.property_id, src.user_id, src.deduced_role, 'active'
    FROM src
    RETURNING 1
  )
  SELECT COUNT(*) INTO n_ins FROM ins;

  RAISE NOTICE '[bcs3736 backfill] inserted property_members rows: %', n_ins;

  -- -------------------------------------------------------------------------
  -- 2) Promote existing **owner** rows using latest approved join_requests
  -- -------------------------------------------------------------------------
  WITH jr_best AS (
    SELECT DISTINCT ON (jr.user_id)
      jr.user_id,
      CASE
        WHEN jr.requested_role::text IN ('admin', 'council', 'manager')
          THEN jr.requested_role::public.user_role
        WHEN jr.requested_role::text = 'property_admin' THEN 'manager'::public.user_role
        ELSE NULL::public.user_role
      END AS staff_role
    FROM public.join_requests jr
    WHERE jr.property_id = v_property
      AND jr.status::text = 'approved'
    ORDER BY jr.user_id, jr.reviewed_at DESC NULLS LAST, jr.created_at DESC
  ),
  promoted AS (
    UPDATE public.property_members pm
    SET role = jb.staff_role
    FROM jr_best jb
    WHERE pm.property_id = v_property
      AND pm.user_id = jb.user_id
      AND pm.role::text = 'owner'
      AND jb.staff_role IS NOT NULL
      AND jb.staff_role::text IN ('admin', 'council', 'manager')
    RETURNING pm.user_id
  )
  SELECT COUNT(*) INTO n_up_jr FROM promoted;

  RAISE NOTICE '[bcs3736 backfill] rows promoted from join_requests (owner→staff): %', n_up_jr;

  -- -------------------------------------------------------------------------
  -- 3) Promote remaining **owner** rows from profiles.role (global staff)
  -- -------------------------------------------------------------------------
  WITH promoted AS (
    UPDATE public.property_members pm
    SET role = p.role::public.user_role
    FROM public.profiles p
    WHERE pm.property_id = v_property
      AND pm.user_id = p.id
      AND pm.role::text = 'owner'
      AND p.role::text IN ('admin', 'council', 'manager')
    RETURNING pm.user_id
  )
  SELECT COUNT(*) INTO n_up_pf FROM promoted;

  RAISE NOTICE '[bcs3736 backfill] rows promoted from profiles.role (owner→staff): %', n_up_pf;
END;
$$;
