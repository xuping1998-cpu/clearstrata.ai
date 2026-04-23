/*
  P0: claim_public_demo_property_membership — lead funnel only, no property_members
  P1: reject_join_request — council only (align with approve_join_request)

  File ordered after 20260815190000 (which defined claim) so this body wins on fresh apply.
*/

-- ---------------------------------------------------------------------------
-- 1) claim: validate demo id, never insert property_members; insert lead row
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_public_demo_property_membership(p_property_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_demo uuid;
  v_name text;
  v_email text;
  v_phone text;
BEGIN
  SELECT r.id INTO v_demo
  FROM public.resolve_public_demo_property('BCS3736') AS r
  LIMIT 1;

  IF v_demo IS NULL OR p_property_id IS DISTINCT FROM v_demo OR v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT
    p.full_name_en,
    p.email,
    p.phone
  INTO v_name, v_email, v_phone
  FROM public.profiles p
  WHERE p.id = v_uid;

  IF v_email IS NULL OR length(trim(COALESCE(v_email, ''))) = 0 THEN
    v_email := v_uid::text || '@pending.profile';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.leads l
    WHERE l.created_by = v_uid
      AND l.property_id = v_demo
      AND l.source = 'demo_public_signup'
  ) THEN
    INSERT INTO public.leads (name, email, phone, property_id, message, source, created_by)
    VALUES (
      COALESCE(NULLIF(TRIM(COALESCE(v_name, '')), ''), v_email),
      v_email,
      v_phone,
      v_demo,
      'Public demo: post-signup interest (no auto membership; /join for real access).',
      'demo_public_signup',
      v_uid
    );
  END IF;

  RETURN v_demo;
END;
$fn$;

COMMENT ON FUNCTION public.claim_public_demo_property_membership(uuid) IS
  'After signup from public demo: one leads row (demo_public_signup); no property_members; returns demo property id.';

-- ---------------------------------------------------------------------------
-- 2) reject: council only
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
      AND pm.role = 'council'::public.user_role
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

  v_msg := format('您加入 %s 的申请未通过审核。', v_property_name);
  IF v_reason IS NOT NULL AND v_reason <> '' THEN
    v_msg := v_msg || E'\n原因：' || v_reason;
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

REVOKE ALL ON FUNCTION public.reject_join_request(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_join_request(uuid, uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
