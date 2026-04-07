-- submit_join_request: invite path runs validation, INSERT join_requests, UPDATE used_count
-- in one implicit transaction (single PL/pgSQL function invocation; no intermediate COMMIT).

COMMENT ON FUNCTION public.submit_join_request(uuid, public.user_role, text, text, text, text, text, text) IS
  'Authenticated users: optional invite code path validates property_invites (FOR UPDATE), may insert join_requests and increment used_count atomically; public path by property_id.';
