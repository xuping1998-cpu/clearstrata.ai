/*
  # join_requests INSERT: demo (BCS3736) only for members; anon blocked

  - `service_role` uses `GRANT ALL` and typically bypasses RLS (Supabase), so server-side jobs unchanged.
  - `authenticated` INSERT must satisfy: either row is **not** the public demo property (resolved like
    `resolve_public_demo_property('BCS3736')`), **or** the inserter is an **active** `property_members` row
    for that `property_id`.
  - `anon` has no INSERT policy and typically no table GRANT; inserts are denied.
*/

GRANT INSERT ON public.join_requests TO authenticated;

DROP POLICY IF EXISTS "jr_insert_own" ON public.join_requests;
CREATE POLICY "jr_insert_own"
  ON public.join_requests FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (
      NOT EXISTS (
        SELECT 1
        FROM public.resolve_public_demo_property('BCS3736') AS d
        WHERE d.id = join_requests.property_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.property_members pm
        WHERE pm.user_id = (SELECT auth.uid())
          AND pm.property_id = join_requests.property_id
          AND pm.status = 'active'
      )
    )
  );

COMMENT ON POLICY "jr_insert_own" ON public.join_requests IS
  'Authenticated: own user_id; demo (BCS3736) property only if already active property_members. Non-demo: allowed (subject to other constraints). Service role bypasses RLS.';

NOTIFY pgrst, 'reload schema';
