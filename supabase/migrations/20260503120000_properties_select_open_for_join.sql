-- Join-request page loads properties via supabase.from('properties').
-- Existing policy "properties_select_members" only allows rows where the user is already a member,
-- so new users saw an empty dropdown. Allow SELECT for rows that accept public join requests.

DROP POLICY IF EXISTS "public read properties" ON public.properties;
CREATE POLICY "public read properties"
  ON public.properties FOR SELECT TO authenticated
  USING (allow_public_join_requests = true);
