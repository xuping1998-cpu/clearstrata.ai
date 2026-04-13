/*
  # Directory / user management: same-property member visibility

  Replaces overly restrictive SELECT rules that only allowed:
  - property_members: own row OR staff-property; owners only saw themselves.
  - residents: own row OR staff; owners only saw their own resident row.

  New rule: any **active** member of property P may SELECT all `property_members`
  and `residents` rows for property P (directory, activation labels, user list).

  INSERT/UPDATE/DELETE policies on these tables are unchanged by this migration.
*/

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

DROP POLICY IF EXISTS "res_select_tenant" ON public.residents;

CREATE POLICY "res_select_tenant"
  ON public.residents FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.property_members viewer
      WHERE viewer.user_id = (SELECT auth.uid())
        AND viewer.property_id = residents.property_id
        AND viewer.status = 'active'
    )
  );
