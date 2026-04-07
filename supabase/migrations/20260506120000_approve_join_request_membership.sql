-- Enhance approve_join_request: resolve user via auth.users email, upsert property_members, idempotent approval.

CREATE OR REPLACE FUNCTION public.approve_join_request(
  p_join_request_id uuid,
  p_reviewer_id uuid,
  p_unit_number text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_actor uuid := auth.uid();
  r public.join_requests%ROWTYPE;
  inv public.property_invites%ROWTYPE;
  v_unit text;
  v_target_uid uuid;
  v_membership_exists boolean := false;
  v_membership_created boolean := false;
  v_user_linked boolean := false;
  v_role public.user_role;
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  IF p_reviewer_id IS NULL OR p_reviewer_id <> v_actor THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_reviewer');
  END IF;

  SELECT * INTO r FROM public.join_requests WHERE id = p_join_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  IF r.status <> 'pending'::join_request_status THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_processed');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.property_members pm
    WHERE pm.user_id = v_actor
      AND pm.property_id = r.property_id
      AND pm.status = 'active'::member_status
      AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  v_unit := COALESCE(NULLIF(trim(p_unit_number), ''), r.unit_number);
  v_role := COALESCE(r.requested_role, 'owner'::public.user_role);

  -- Resolve applicant: join_requests.user_id, else auth.users by email
  v_target_uid := r.user_id;
  IF v_target_uid IS NULL AND r.email IS NOT NULL AND length(trim(r.email)) > 0 THEN
    SELECT u.id INTO v_target_uid
    FROM auth.users u
    WHERE lower(u.email) = lower(trim(r.email))
    LIMIT 1;
  END IF;

  IF v_target_uid IS NOT NULL THEN
    v_user_linked := true;
    SELECT EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = v_target_uid
        AND pm.property_id = r.property_id
    ) INTO v_membership_exists;
  END IF;

  IF v_target_uid IS NOT NULL AND NOT v_membership_exists THEN
    INSERT INTO public.property_members (
      property_id, user_id, role, status, unit_number, approved_by, approved_at
    ) VALUES (
      r.property_id,
      v_target_uid,
      v_role,
      'active'::member_status,
      v_unit,
      p_reviewer_id,
      now()
    )
    ON CONFLICT (property_id, user_id) DO UPDATE SET
      role = EXCLUDED.role,
      status = 'active'::member_status,
      unit_number = COALESCE(EXCLUDED.unit_number, public.property_members.unit_number),
      approved_by = EXCLUDED.approved_by,
      approved_at = EXCLUDED.approved_at;
    v_membership_created := true;
  END IF;

  UPDATE public.join_requests
  SET status = 'approved'::join_request_status,
      reviewed_by = p_reviewer_id,
      reviewed_at = now(),
      rejection_reason = NULL,
      user_id = COALESCE(r.user_id, v_target_uid),
      updated_at = now()
  WHERE id = p_join_request_id;

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

  IF NOT v_user_linked THEN
    RETURN jsonb_build_object(
      'success', true,
      'membership_created', false,
      'user_linked', false,
      'message', 'approved but user not linked yet'
    );
  END IF;

  IF v_membership_exists THEN
    RETURN jsonb_build_object(
      'success', true,
      'membership_created', false,
      'user_linked', true,
      'message', 'already_member'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'membership_created', v_membership_created,
    'user_linked', true
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.approve_join_request(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_join_request(uuid, uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
