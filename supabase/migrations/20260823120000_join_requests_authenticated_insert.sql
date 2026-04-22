-- Allow authenticated users to create their own join_requests (replaces client-only access via submit_join_request RPC).
GRANT INSERT ON public.join_requests TO authenticated;

DROP POLICY IF EXISTS "jr_insert_own" ON public.join_requests;
CREATE POLICY "jr_insert_own"
  ON public.join_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
