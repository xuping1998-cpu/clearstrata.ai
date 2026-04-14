/*
  # Revoke legacy join / property_members–pending approval RPCs from `authenticated`

  **Product path (unchanged in app code):**
  - Entry: `submit_join_request` (auto-join inside DB, else `join_requests` pending)
  - QR auto: `try_auto_join_property_from_qr` → then `createPendingJoinRequest` → `submit_join_request`
  - Staff approve: `approve_join_request_final` only

  These legacy functions remain defined for historical migrations / manual `service_role` use,
  but must not be callable from the browser PostgREST role.
*/

COMMENT ON FUNCTION public.approve_join_request(uuid, uuid, text) IS
  'DEPRECATED: use public.approve_join_request_final. EXECUTE revoked from authenticated.';

REVOKE EXECUTE ON FUNCTION public.approve_join_request(uuid, uuid, text) FROM authenticated;

COMMENT ON FUNCTION public.approve_pending_property_member_with_residents(
  uuid, uuid, text, text, text, text, text, text
) IS
  'DEPRECATED: product no longer uses property_members pending approval path. EXECUTE revoked from authenticated.';

REVOKE EXECUTE ON FUNCTION public.approve_pending_property_member_with_residents(
  uuid, uuid, text, text, text, text, text, text
) FROM authenticated;

COMMENT ON FUNCTION public.review_property_member_membership(uuid, uuid, text) IS
  'DEPRECATED: property_members pending review removed from product. EXECUTE revoked from authenticated.';

REVOKE EXECUTE ON FUNCTION public.review_property_member_membership(uuid, uuid, text) FROM authenticated;

NOTIFY pgrst, 'reload schema';
