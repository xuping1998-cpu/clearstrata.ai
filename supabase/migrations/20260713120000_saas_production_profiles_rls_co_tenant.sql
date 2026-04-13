/*
  # SaaS production: profiles SELECT co-tenant only + residents SELECT hardening

  Replaces open "Users can view all profiles" (USING true) with same-property visibility:
  - Self always.
  - Other profiles only if an active property_members row links viewer and target
    to the same property (directory / invoices / UI cannot enumerate global users).

  Residents SELECT: co-tenant visibility with explicit residents.property_id alignment
  (prevents cross-property edge cases if a user_id appears in multiple properties).

  property_members SELECT: idempotent refresh (matches production SaaS spec).
*/

-- ---------------------------------------------------------------------------
-- property_members (directory: active members see all rows in same property)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "property_members_select_scope" ON public.property_members;

CREATE POLICY "property_members_select_scope"
  ON public.property_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.property_members viewer
      WHERE viewer.user_id = (SELECT auth.uid())
        AND viewer.property_id = property_members.property_id
        AND viewer.status = 'active'
    )
  );

-- ---------------------------------------------------------------------------
-- residents
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "res_select_tenant" ON public.residents;

CREATE POLICY "res_select_tenant"
  ON public.residents FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.property_members viewer
      INNER JOIN public.property_members target
        ON target.property_id = viewer.property_id
      WHERE viewer.user_id = (SELECT auth.uid())
        AND viewer.status = 'active'
        AND target.user_id = residents.user_id
        AND viewer.property_id = residents.property_id
    )
  );

-- ---------------------------------------------------------------------------
-- profiles — remove global read; add co-tenant + self
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

DROP POLICY IF EXISTS "profiles_select_same_property" ON public.profiles;

CREATE POLICY "profiles_select_same_property"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.property_members viewer
      INNER JOIN public.property_members target
        ON target.property_id = viewer.property_id
      WHERE viewer.user_id = (SELECT auth.uid())
        AND viewer.status = 'active'
        AND target.user_id = profiles.id
    )
  );
