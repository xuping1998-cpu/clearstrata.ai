-- Fix review_join_request: column unit_number → unit_no on join_requests + property_members.
--
-- Background:
--   * public.join_requests no longer exposes unit_number on the live DB (42703 from
--     approve_join_request_final on jr.unit_number).
--   * public.property_members.unit_number was dropped in
--     20260730120000_residents_only_unit_enter_property_by_invite.sql; the column is now unit_no.
--   * review_join_request was authored against the old schema and still references the dropped /
--     removed columns inside its INSERT … ON CONFLICT block.
--
-- This migration only touches the function body. Signature stays
-- (uuid, boolean, text, text) so existing GRANTs / overload resolution are preserved.
-- Parameter name p_unit_number is intentionally kept: no frontend or edge function calls this RPC
-- (review actions go through approve_join_request / reject_join_request), and PostgreSQL forbids
-- parameter renames on CREATE OR REPLACE for an existing signature.

CREATE OR REPLACE FUNCTION public.review_join_request(
  p_request_id uuid,
  p_approve boolean,
  p_unit_number text DEFAULT NULL,
  p_rejection_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  r public.join_requests%ROWTYPE;
  inv public.property_invites%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO r FROM public.join_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF r.status <> 'pending'::join_request_status THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_processed');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.property_members pm
    WHERE pm.user_id = v_uid
      AND pm.property_id = r.property_id
      AND pm.status = 'active'
      AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF p_approve THEN
    UPDATE public.join_requests
    SET status = 'approved'::join_request_status,
        reviewed_by = v_uid,
        reviewed_at = now(),
        rejection_reason = NULL
    WHERE id = p_request_id;

    INSERT INTO public.property_members (
      property_id, user_id, role, status, unit_no, approved_by, approved_at
    ) VALUES (
      r.property_id,
      r.user_id,
      r.requested_role,
      'active',
      COALESCE(NULLIF(trim(p_unit_number), ''), NULLIF(trim(r.unit_no), '')),
      v_uid,
      now()
    )
    ON CONFLICT (property_id, user_id) DO UPDATE SET
      role = EXCLUDED.role,
      status = 'active',
      unit_no = COALESCE(EXCLUDED.unit_no, public.property_members.unit_no),
      approved_by = EXCLUDED.approved_by,
      approved_at = EXCLUDED.approved_at;

    IF r.invite_id IS NOT NULL THEN
      SELECT * INTO inv FROM public.property_invites WHERE id = r.invite_id FOR UPDATE;
      IF FOUND THEN
        UPDATE public.property_invites
        SET used_count = used_count + 1
        WHERE id = inv.id;

        IF inv.max_uses > 0 AND (inv.used_count + 1) >= inv.max_uses THEN
          UPDATE public.property_invites SET status = 'expired' WHERE id = inv.id;
        END IF;
      END IF;
    END IF;
  ELSE
    UPDATE public.join_requests
    SET status = 'rejected'::join_request_status,
        reviewed_by = v_uid,
        reviewed_at = now(),
        rejection_reason = NULLIF(trim(p_rejection_reason), '')
    WHERE id = p_request_id;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$fn$;

COMMENT ON FUNCTION public.review_join_request(uuid, boolean, text, text) IS
  'Review (approve/reject) a join_request. Writes property_members.unit_no (not the dropped unit_number) and reads join_requests.unit_no.';

REVOKE ALL ON FUNCTION public.review_join_request(uuid, boolean, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_join_request(uuid, boolean, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
