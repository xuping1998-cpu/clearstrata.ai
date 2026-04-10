-- Per-user inbox for join decision toasts; extends approve/reject RPC returns + inserts.

CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  related_property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  related_join_request_id uuid REFERENCES public.join_requests(id) ON DELETE SET NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread
  ON public.user_notifications (user_id, is_read, created_at DESC);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_notifications_select_own" ON public.user_notifications;
CREATE POLICY "user_notifications_select_own"
  ON public.user_notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_notifications_update_own" ON public.user_notifications;
CREATE POLICY "user_notifications_update_own"
  ON public.user_notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, UPDATE ON public.user_notifications TO authenticated;
GRANT ALL ON public.user_notifications TO service_role;

-- ---------------------------------------------------------------------------
-- approve_join_request: rich JSON + user_notifications
-- ---------------------------------------------------------------------------

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
  v_property_name text;
  v_target_email text;
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
      AND pm.status = 'active'
      AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  SELECT p.name INTO v_property_name FROM public.properties p WHERE p.id = r.property_id;
  v_property_name := COALESCE(NULLIF(trim(v_property_name), ''), 'Property');

  v_unit := COALESCE(NULLIF(trim(p_unit_number), ''), r.unit_number);
  v_role := COALESCE(r.requested_role, 'owner'::public.user_role);

  v_target_email := NULLIF(trim(COALESCE(r.email, '')), '');

  v_target_uid := r.user_id;
  IF v_target_uid IS NULL AND r.email IS NOT NULL AND length(trim(r.email)) > 0 THEN
    SELECT u.id INTO v_target_uid
    FROM auth.users u
    WHERE lower(u.email) = lower(trim(r.email))
    LIMIT 1;
  END IF;

  IF v_target_uid IS NOT NULL THEN
    v_user_linked := true;
    IF v_target_email IS NULL OR v_target_email = '' THEN
      SELECT NULLIF(trim(u.email::text), '') INTO v_target_email FROM auth.users u WHERE u.id = v_target_uid LIMIT 1;
    END IF;
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
      'active',
      v_unit,
      p_reviewer_id,
      now()
    )
    ON CONFLICT (property_id, user_id) DO UPDATE SET
      role = EXCLUDED.role,
      status = 'active',
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

  IF v_target_uid IS NOT NULL THEN
    BEGIN
      INSERT INTO public.user_notifications (
        user_id, type, title, message, related_property_id, related_join_request_id
      ) VALUES (
        v_target_uid,
        'join_request_approved',
        '加入申请已通过',
        format('您已获准加入 %s', v_property_name),
        r.property_id,
        p_join_request_id
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'user_notifications insert failed: %', SQLERRM;
    END;
  END IF;

  IF NOT v_user_linked THEN
    RETURN jsonb_build_object(
      'success', true,
      'membership_created', false,
      'user_linked', false,
      'message', 'approved but user not linked yet',
      'property_id', r.property_id,
      'property_name', v_property_name,
      'target_user_id', NULL,
      'target_email', v_target_email
    );
  END IF;

  IF v_membership_exists THEN
    RETURN jsonb_build_object(
      'success', true,
      'membership_created', false,
      'user_linked', true,
      'message', 'already_member',
      'property_id', r.property_id,
      'property_name', v_property_name,
      'target_user_id', v_target_uid,
      'target_email', v_target_email
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'membership_created', v_membership_created,
    'user_linked', true,
    'property_id', r.property_id,
    'property_name', v_property_name,
    'target_user_id', v_target_uid,
    'target_email', v_target_email
  );
END;
$fn$;

-- ---------------------------------------------------------------------------
-- reject_join_request: notification + rich JSON
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.reject_join_request(
  p_join_request_id uuid,
  p_reviewer_id uuid,
  p_rejection_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_actor uuid := auth.uid();
  r public.join_requests%ROWTYPE;
  v_property_name text;
  v_target_uid uuid;
  v_target_email text;
  v_reason text := NULLIF(trim(COALESCE(p_rejection_reason, '')), '');
  v_msg text;
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
      AND pm.status = 'active'
      AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  SELECT p.name INTO v_property_name FROM public.properties p WHERE p.id = r.property_id;
  v_property_name := COALESCE(NULLIF(trim(v_property_name), ''), 'Property');

  v_target_email := NULLIF(trim(COALESCE(r.email, '')), '');
  v_target_uid := r.user_id;
  IF v_target_uid IS NULL AND r.email IS NOT NULL AND length(trim(r.email)) > 0 THEN
    SELECT u.id INTO v_target_uid
    FROM auth.users u
    WHERE lower(u.email) = lower(trim(r.email))
    LIMIT 1;
  END IF;

  IF v_target_uid IS NOT NULL AND (v_target_email IS NULL OR v_target_email = '') THEN
    SELECT NULLIF(trim(u.email::text), '') INTO v_target_email FROM auth.users u WHERE u.id = v_target_uid LIMIT 1;
  END IF;

  v_msg := format('您加?%s 的申请未通过审核?, v_property_name);
  IF v_reason IS NOT NULL AND v_reason <> '' THEN
    v_msg := v_msg || E'\n原因? || v_reason;
  END IF;

  UPDATE public.join_requests
  SET status = 'rejected'::join_request_status,
      reviewed_by = p_reviewer_id,
      reviewed_at = now(),
      rejection_reason = v_reason,
      updated_at = now()
  WHERE id = p_join_request_id;

  IF v_target_uid IS NOT NULL THEN
    BEGIN
      INSERT INTO public.user_notifications (
        user_id, type, title, message, related_property_id, related_join_request_id
      ) VALUES (
        v_target_uid,
        'join_request_rejected',
        '加入申请未通过',
        v_msg,
        r.property_id,
        p_join_request_id
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'user_notifications insert failed: %', SQLERRM;
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'property_id', r.property_id,
    'property_name', v_property_name,
    'target_user_id', v_target_uid,
    'target_email', v_target_email
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.approve_join_request(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_join_request(uuid, uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.reject_join_request(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_join_request(uuid, uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';




