-- ---------------------------------------------------------------------------
-- Unit whitelist + invitation_codes (physical: public.property_invite_codes)
-- - Columns: unit_no, role (default owner); used_count / max_uses = usage_limit semantics
-- - QR gate: check_qr_unit_invite_gate + try_auto_join_property_from_qr(..., p_invite_code)
-- - submit_join_request: unit must match invite when pic.unit_no set; pending no longer consumes pic uses
-- - After approval: trigger bumps property_invite_codes.used_count and may deactivate
-- ---------------------------------------------------------------------------

ALTER TABLE public.property_invite_codes
  ADD COLUMN IF NOT EXISTS unit_no text,
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'owner';

ALTER TABLE public.property_invite_codes
  DROP CONSTRAINT IF EXISTS property_invite_codes_role_check;

ALTER TABLE public.property_invite_codes
  ADD CONSTRAINT property_invite_codes_role_check
  CHECK (role IN ('owner', 'council', 'manager'));

COMMENT ON COLUMN public.property_invite_codes.unit_no IS 'When set, invite is bound to this unit (whitelist slot). Empty = generic code.';
COMMENT ON COLUMN public.property_invite_codes.role IS 'Role granted when joining via this invite (owner/council/manager).';

CREATE INDEX IF NOT EXISTS idx_property_invite_codes_property_unit_lower
  ON public.property_invite_codes (property_id, lower(trim(unit_no)))
  WHERE unit_no IS NOT NULL AND length(trim(unit_no)) > 0;

-- Synonym view for docs / external naming "invitation_codes"
CREATE OR REPLACE VIEW public.invitation_codes AS
SELECT
  id,
  property_id,
  code,
  label,
  unit_no,
  role,
  used_count,
  max_uses AS usage_limit,
  is_active,
  expires_at,
  created_at
FROM public.property_invite_codes;

GRANT SELECT ON public.invitation_codes TO authenticated;
REVOKE ALL ON public.invitation_codes FROM anon;

-- ---------------------------------------------------------------------------
-- Gate: if property has any unit-scoped invite rows, QR must match whitelist + code
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_qr_unit_invite_gate(
  p_property_id uuid,
  p_unit_no text,
  p_invite_code text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $g$
DECLARE
  v_unit text := lower(trim(coalesce(p_unit_no, '')));
  v_strict boolean;
  v_ok boolean;
  v_code text := NULLIF(trim(coalesce(p_invite_code, '')), '');
BEGIN
  IF p_property_id IS NULL OR v_unit = '' THEN
    RETURN jsonb_build_object('ok', false, 'strict_whitelist', false, 'error', 'invalid_arguments');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.property_invite_codes c
    WHERE c.property_id = p_property_id
      AND c.unit_no IS NOT NULL
      AND length(trim(c.unit_no)) > 0
  )
  INTO v_strict;

  IF NOT coalesce(v_strict, false) THEN
    RETURN jsonb_build_object('ok', true, 'strict_whitelist', false);
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.property_invite_codes c
    WHERE c.property_id = p_property_id
      AND c.is_active
      AND (c.expires_at IS NULL OR c.expires_at >= now())
      AND (c.max_uses <= 0 OR c.used_count < c.max_uses)
      AND lower(trim(c.unit_no)) = v_unit
  )
  INTO v_ok;

  IF NOT coalesce(v_ok, false) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'strict_whitelist', true,
      'error', 'unit_not_whitelisted',
      'message', 'Unit is not on the invite whitelist for this property.',
      'message_zh', '该房号不在本物业邀请白名单中'
    );
  END IF;

  IF v_code IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'strict_whitelist', true,
      'error', 'invite_code_required',
      'message', 'This property requires a valid invite code with your unit.',
      'message_zh', '本物业需使用有效邀请码（与房号匹配）'
    );
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.property_invite_codes c
    WHERE c.property_id = p_property_id
      AND c.is_active
      AND (c.expires_at IS NULL OR c.expires_at >= now())
      AND (c.max_uses <= 0 OR c.used_count < c.max_uses)
      AND lower(trim(c.unit_no)) = v_unit
      AND (c.code = v_code OR lower(c.code) = lower(v_code))
  )
  INTO v_ok;

  IF NOT coalesce(v_ok, false) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'strict_whitelist', true,
      'error', 'invite_mismatch',
      'message', 'Invite code does not match this unit.',
      'message_zh', '邀请码与房号不匹配'
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'strict_whitelist', true);
END;
$g$;

REVOKE ALL ON FUNCTION public.check_qr_unit_invite_gate(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_qr_unit_invite_gate(uuid, text, text) TO authenticated, anon;

-- ---------------------------------------------------------------------------
-- try_auto_join_property_from_qr: optional invite code for whitelist gate
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.try_auto_join_property_from_qr(
  p_property_id uuid,
  p_unit_no text,
  p_language_pref text DEFAULT 'en',
  p_invite_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_role public.user_role;
  v_bind jsonb;
  v_gate jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'success', false,
      'error', 'not_authenticated',
      'message', 'Not signed in',
      'message_zh', '请先登录'
    );
  END IF;

  SELECT p.role INTO v_role FROM public.profiles p WHERE p.id = v_uid;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'success', false,
      'error', 'profile_missing',
      'message', 'Profile not found',
      'message_zh', '未找到用户资料'
    );
  END IF;

  IF v_role IS DISTINCT FROM 'owner'::public.user_role THEN
    RETURN jsonb_build_object(
      'ok', false,
      'success', false,
      'error', 'non_owner_role',
      'message', 'Only owner accounts can auto-join from QR.',
      'message_zh', '仅业主账号支持扫码自动进楼，请提交人工审核。'
    );
  END IF;

  v_gate := public.check_qr_unit_invite_gate(p_property_id, p_unit_no, p_invite_code);
  IF coalesce(v_gate ->> 'strict_whitelist', 'false') = 'true' THEN
    IF coalesce(v_gate ->> 'ok', 'false') <> 'true' THEN
      RETURN v_gate || jsonb_build_object('success', false);
    END IF;
  END IF;

  v_bind := public.bind_resident_by_unit(p_property_id, p_unit_no, NULL::date, p_language_pref);

  RETURN v_bind || jsonb_build_object(
    'success', coalesce((v_bind ->> 'ok')::boolean, false)
  );
END;
$fn$;

COMMENT ON FUNCTION public.try_auto_join_property_from_qr(uuid, text, text, text) IS
  'QR entry: owner-only; optional p_invite_code for unit whitelist; delegates to bind_resident_by_unit.';

REVOKE ALL ON FUNCTION public.try_auto_join_property_from_qr(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.try_auto_join_property_from_qr(uuid, text, text, text) TO authenticated, service_role;

-- Keep 3-arg overload for older callers (Postgres: call with defaults)
DROP FUNCTION IF EXISTS public.try_auto_join_property_from_qr(uuid, text, text);
CREATE OR REPLACE FUNCTION public.try_auto_join_property_from_qr(
  p_property_id uuid,
  p_unit_no text,
  p_language_pref text DEFAULT 'en'
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $wrap$
  SELECT public.try_auto_join_property_from_qr(p_property_id, p_unit_no, p_language_pref, NULL::text);
$wrap$;

REVOKE ALL ON FUNCTION public.try_auto_join_property_from_qr(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.try_auto_join_property_from_qr(uuid, text, text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- submit_join_request (patched body from 20260722120000 — pending pic bump removed; unit match enforced)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.submit_join_request(
  p_property_id uuid DEFAULT NULL,
  p_requested_role public.user_role DEFAULT 'owner'::public.user_role,
  p_unit_number text DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_full_name text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_invite_code text DEFAULT NULL,
  p_direct_invite_id uuid DEFAULT NULL,
  p_inferred_role text DEFAULT NULL,
  p_inferred_unit_number text DEFAULT NULL,
  p_move_in_date date DEFAULT NULL,
  p_language_pref text DEFAULT 'en'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_uid uuid := auth.uid();

  vprof public.profiles%ROWTYPE;

  v_name text;
  v_email text;
  v_phone text;
  v_email_norm text;

  inv public.property_invites%ROWTYPE;
  c text := NULLIF(trim(p_invite_code), '');

  dir public.property_direct_invites%ROWTYPE;
  pic public.property_invite_codes%ROWTYPE;

  v_role public.user_role;
  v_unit text;

  v_inf_role text;
  v_inf_unit text;

  v_auto jsonb;
  v_join_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'success', false,
      'error', 'not_authenticated',
      'message', 'NOT_AUTHENTICATED',
      'message_zh', '请先登录后再提交'
    );
  END IF;

  -- ========= A) Directed invite (property_direct_invites) =========
  IF p_direct_invite_id IS NOT NULL THEN
    SELECT * INTO dir
    FROM public.property_direct_invites
    WHERE id = p_direct_invite_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'ok', false,
        'success', false,
        'message', 'INVALID_INVITE',
        'message_zh', '邀请无效'
      );
    END IF;

    IF dir.property_id IS DISTINCT FROM p_property_id THEN
      RETURN jsonb_build_object(
        'ok', false,
        'success', false,
        'message', 'INVALID_INVITE',
        'message_zh', '物业与邀请不匹配'
      );
    END IF;

    IF NOT dir.is_active THEN
      RETURN jsonb_build_object(
        'ok', false,
        'success', false,
        'message', 'INVALID_INVITE',
        'message_zh', '邀请无效'
      );
    END IF;

    IF dir.expires_at IS NOT NULL AND dir.expires_at < now() THEN
      RETURN jsonb_build_object(
        'ok', false,
        'success', false,
        'message', 'INVITE_EXPIRED',
        'message_zh', '邀请码已过期'
      );
    END IF;

    IF dir.max_uses > 0 AND dir.used_count >= dir.max_uses THEN
      RETURN jsonb_build_object(
        'ok', false,
        'success', false,
        'message', 'INVITE_LIMIT_REACHED',
        'message_zh', '该邀请码已达到使用上限'
      );
    END IF;

    SELECT * INTO vprof FROM public.profiles WHERE id = v_uid;

    IF EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = dir.property_id
        AND pm.user_id = v_uid
        AND pm.status = 'active'
    ) THEN
      RETURN jsonb_build_object(
        'ok', false,
        'success', false,
        'error', 'already_member',
        'message', 'ALREADY_MEMBER',
        'message_zh', '你已经是该物业成员，无需重复申请'
      );
    END IF;

    v_role := public.map_intended_role_to_user_role(dir.intended_role);

    v_email := COALESCE(NULLIF(trim(p_email), ''), vprof.email);
    v_name := COALESCE(NULLIF(trim(p_full_name), ''), NULLIF(trim(dir.intended_name), ''), vprof.full_name_en, v_email);
    v_phone := COALESCE(NULLIF(trim(p_phone), ''), vprof.phone);
    v_email_norm := lower(trim(coalesce(v_email, '')));

    IF v_email_norm <> '' AND EXISTS (
      SELECT 1
      FROM public.join_requests jr
      WHERE jr.property_id = dir.property_id
        AND jr.status = 'pending'::join_request_status
        AND lower(trim(coalesce(jr.email, ''))) = v_email_norm
    ) THEN
      RETURN jsonb_build_object(
        'ok', false,
        'success', false,
        'error', 'already_pending',
        'message', 'You already have a pending request for this property.',
        'message_zh', '你已提交过该物业的申请，请等待审核'
      );
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.join_requests jr
      WHERE jr.property_id = dir.property_id
        AND jr.user_id = v_uid
        AND jr.status = 'pending'::join_request_status
    ) THEN
      RETURN jsonb_build_object(
        'ok', false,
        'success', false,
        'error', 'already_pending',
        'message', 'You already have a pending request for this property.',
        'message_zh', '你已提交过该物业的申请，请等待审核'
      );
    END IF;

    v_unit := COALESCE(NULLIF(trim(p_unit_number), ''), NULLIF(trim(dir.unit_number), ''));
    v_inf_role := COALESCE(NULLIF(trim(p_inferred_role), ''), NULLIF(trim(dir.intended_role), ''));
    v_inf_unit := COALESCE(NULLIF(trim(p_inferred_unit_number), ''), NULLIF(trim(dir.unit_number), ''));

    IF v_role = 'owner'::public.user_role
      AND v_unit IS NOT NULL
      AND length(trim(v_unit)) > 0
      AND length(trim(coalesce(v_name, ''))) > 0
      AND length(v_email_norm) > 0
    THEN
      v_auto := public._try_owner_whitelist_auto_join(
        v_uid,
        dir.property_id,
        v_unit,
        p_move_in_date,
        p_language_pref,
        v_name,
        v_email,
        v_phone
      );
      IF (v_auto ->> 'auto_ok') = 'true' THEN
        UPDATE public.property_direct_invites
        SET used_count = used_count + 1
        WHERE id = dir.id;

        IF dir.max_uses > 0 AND dir.used_count + 1 >= dir.max_uses THEN
          UPDATE public.property_direct_invites
          SET is_active = false
          WHERE id = dir.id;
        END IF;

        RETURN jsonb_build_object(
          'ok', true,
          'success', true,
          'property_id', dir.property_id,
          'role', v_role::text,
          'message', 'AUTO_APPROVED',
          'entry_path', 'auto_approved',
          'pending_created', false,
          'auto_approve', 'passed',
          'residents_bind', v_auto -> 'bind',
          'property_members_upsert', v_auto -> 'bind' -> 'property_members_after'
        );
      END IF;
    END IF;

    INSERT INTO public.join_requests (
      property_id, user_id, requested_role, full_name, email, phone, unit_number, note, status,
      invite_id, invite_code, direct_invite_id, inferred_role, inferred_unit_number
    ) VALUES (
      dir.property_id,
      v_uid,
      v_role,
      v_name,
      v_email,
      v_phone,
      v_unit,
      p_note,
      'pending'::join_request_status,
      NULL,
      NULL,
      dir.id,
      v_inf_role,
      v_inf_unit
    )
    RETURNING id INTO v_join_id;

    UPDATE public.property_direct_invites
    SET used_count = used_count + 1
    WHERE id = dir.id;

    IF dir.max_uses > 0 AND dir.used_count + 1 >= dir.max_uses THEN
      UPDATE public.property_direct_invites
      SET is_active = false
      WHERE id = dir.id;
    END IF;

    RETURN jsonb_build_object(
      'ok', true,
      'success', true,
      'property_id', dir.property_id,
      'role', v_role::text,
      'message', 'PENDING_APPROVAL',
      'join_request_id', v_join_id,
      'entry_path', 'pending_submitted',
      'pending_created', true,
      'auto_approve', CASE WHEN v_auto IS NULL THEN 'skipped' ELSE 'failed' END,
      'auto_fail_reason', v_auto ->> 'reason'
    );
  END IF;

  -- ========= B) Legacy property_invites (upper code) =========
  IF c IS NOT NULL THEN
    c := upper(c);

    SELECT * INTO inv
    FROM public.property_invites
    WHERE code = c
    FOR UPDATE;

    IF FOUND THEN
      IF inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN
        UPDATE public.property_invites
        SET status = 'expired'
        WHERE id = inv.id;

        RETURN jsonb_build_object(
          'ok', false,
          'success', false,
          'message', 'INVALID_INVITE'
        );
      END IF;

      IF inv.status <> 'active' THEN
        RETURN jsonb_build_object(
          'ok', false,
          'success', false,
          'message', 'INVALID_INVITE'
        );
      END IF;

      IF inv.max_uses > 0 AND inv.used_count >= inv.max_uses THEN
        RETURN jsonb_build_object(
          'ok', false,
          'success', false,
          'message', 'INVALID_INVITE'
        );
      END IF;

      SELECT * INTO vprof FROM public.profiles WHERE id = v_uid;

      IF EXISTS (
        SELECT 1
        FROM public.property_members pm
        WHERE pm.property_id = inv.property_id
          AND pm.user_id = v_uid
          AND pm.status = 'active'
      ) THEN
        RETURN jsonb_build_object(
          'ok', false,
          'success', false,
          'error', 'already_member',
          'message', 'ALREADY_MEMBER',
          'message_zh', '你已经是该物业成员，无需重复申请'
        );
      END IF;

      v_email_norm := lower(trim(coalesce(vprof.email, '')));

      IF v_email_norm <> '' AND EXISTS (
        SELECT 1
        FROM public.join_requests jr
        WHERE jr.property_id = inv.property_id
          AND jr.status = 'pending'::join_request_status
          AND lower(trim(coalesce(jr.email, ''))) = v_email_norm
      ) THEN
        RETURN jsonb_build_object(
          'ok', false,
          'success', false,
          'error', 'already_pending',
          'message', 'You already have a pending request for this property.',
          'message_zh', '你已提交过该物业的申请，请等待审核'
        );
      END IF;

      IF EXISTS (
        SELECT 1
        FROM public.join_requests jr
        WHERE jr.property_id = inv.property_id
          AND jr.user_id = v_uid
          AND jr.status = 'pending'::join_request_status
      ) THEN
        RETURN jsonb_build_object(
          'ok', false,
          'success', false,
          'error', 'already_pending',
          'message', 'You already have a pending request for this property.',
          'message_zh', '你已提交过该物业的申请，请等待审核'
        );
      END IF;

      INSERT INTO public.join_requests (
        property_id, user_id, requested_role, full_name, email, phone, unit_number, note, status,
        invite_id, invite_code, direct_invite_id, inferred_role, inferred_unit_number
      ) VALUES (
        inv.property_id,
        v_uid,
        inv.role,
        COALESCE(NULLIF(trim(vprof.full_name_en), ''), vprof.email),
        vprof.email,
        vprof.phone,
        NULL,
        NULL,
        'pending'::join_request_status,
        inv.id,
        c,
        NULL,
        inv.role::text,
        NULL
      );

      UPDATE public.property_invites
      SET used_count = used_count + 1
      WHERE id = inv.id;

      RETURN jsonb_build_object(
        'ok', true,
        'success', true,
        'property_id', inv.property_id,
        'role', inv.role::text,
        'message', 'PENDING_APPROVAL',
        'entry_path', 'pending_submitted',
        'pending_created', true,
        'auto_approve', 'skipped'
      );
    END IF;
  END IF;

  -- ========= C) Public property_invite_codes =========
  c := NULLIF(trim(p_invite_code), '');

  IF c IS NOT NULL THEN
    SELECT * INTO pic
    FROM public.property_invite_codes
    WHERE code = c OR lower(code) = lower(c)
    FOR UPDATE;

    IF FOUND THEN
      IF NOT pic.is_active THEN
        RETURN jsonb_build_object(
          'ok', false,
          'success', false,
          'message', 'INVALID_INVITE'
        );
      END IF;

      IF pic.expires_at IS NOT NULL AND pic.expires_at < now() THEN
        RETURN jsonb_build_object(
          'ok', false,
          'success', false,
          'message', 'INVALID_INVITE',
          'message_zh', '邀请码已过期'
        );
      END IF;

      IF pic.max_uses > 0 AND pic.used_count >= pic.max_uses THEN
        RETURN jsonb_build_object(
          'ok', false,
          'success', false,
          'message', 'INVITE_LIMIT_REACHED',
          'message_zh', '该邀请码已达到使用上限'
        );
      END IF;

      IF pic.property_id IS DISTINCT FROM p_property_id THEN
        RETURN jsonb_build_object(
          'ok', false,
          'success', false,
          'message', 'INVALID_INVITE',
          'message_zh', '物业与邀请码不匹配'
        );
      END IF;


      IF pic.unit_no IS NOT NULL AND length(trim(pic.unit_no)) > 0 THEN
        IF lower(trim(coalesce(p_unit_number, ''))) IS DISTINCT FROM lower(trim(pic.unit_no)) THEN
          RETURN jsonb_build_object(
            'ok', false,
            'success', false,
            'message', 'UNIT_INVITE_MISMATCH',
            'message_zh', '房号与邀请码绑定房号不一致'
          );
        END IF;
      END IF;

      SELECT * INTO vprof
      FROM public.profiles
      WHERE id = v_uid;

      v_name := COALESCE(NULLIF(trim(p_full_name), ''), vprof.full_name_en, vprof.email);
      v_email := COALESCE(NULLIF(trim(p_email), ''), vprof.email);
      v_phone := COALESCE(NULLIF(trim(p_phone), ''), vprof.phone);
      v_email_norm := lower(trim(coalesce(v_email, '')));

      IF EXISTS (
        SELECT 1
        FROM public.property_members pm
        WHERE pm.property_id = pic.property_id
          AND pm.user_id = v_uid
          AND pm.status = 'active'
      ) THEN
        RETURN jsonb_build_object(
          'ok', false,
          'success', false,
          'error', 'already_member',
          'message', 'ALREADY_MEMBER',
          'message_zh', '你已经是该物业成员，无需重复申请'
        );
      END IF;

      IF v_email_norm <> '' AND EXISTS (
        SELECT 1
        FROM public.join_requests jr
        WHERE jr.property_id = pic.property_id
          AND jr.status = 'pending'::join_request_status
          AND lower(trim(coalesce(jr.email, ''))) = v_email_norm
      ) THEN
        RETURN jsonb_build_object(
          'ok', false,
          'success', false,
          'error', 'already_pending',
          'message', 'You already have a pending request for this property.',
          'message_zh', '你已提交过该物业的申请，请等待审核'
        );
      END IF;

      IF EXISTS (
        SELECT 1
        FROM public.join_requests jr
        WHERE jr.property_id = pic.property_id
          AND jr.user_id = v_uid
          AND jr.status = 'pending'::join_request_status
      ) THEN
        RETURN jsonb_build_object(
          'ok', false,
          'success', false,
          'error', 'already_pending',
          'message', 'You already have a pending request for this property.',
          'message_zh', '你已提交过该物业的申请，请等待审核'
        );
      END IF;

      v_inf_role := NULLIF(trim(p_inferred_role), '');
      v_inf_unit := NULLIF(trim(p_inferred_unit_number), '');

      IF p_requested_role = 'owner'::public.user_role
        AND NULLIF(trim(p_unit_number), '') IS NOT NULL
        AND length(trim(coalesce(v_name, ''))) > 0
        AND length(v_email_norm) > 0
      THEN
        v_auto := public._try_owner_whitelist_auto_join(
          v_uid,
          pic.property_id,
          trim(p_unit_number),
          p_move_in_date,
          p_language_pref,
          v_name,
          v_email,
          v_phone
        );
        IF (v_auto ->> 'auto_ok') = 'true' THEN
          UPDATE public.property_invite_codes
          SET used_count = used_count + 1
          WHERE id = pic.id;

          IF pic.max_uses > 0 AND pic.used_count + 1 >= pic.max_uses THEN
            UPDATE public.property_invite_codes
            SET is_active = false
            WHERE id = pic.id;
          END IF;

          RETURN jsonb_build_object(
            'ok', true,
            'success', true,
            'property_id', pic.property_id,
            'entry_path', 'auto_approved',
            'pending_created', false,
            'auto_approve', 'passed',
            'residents_bind', v_auto -> 'bind',
            'property_members_upsert', v_auto -> 'bind' -> 'property_members_after'
          );
        END IF;
      END IF;

      INSERT INTO public.join_requests (
        property_id,
        user_id,
        requested_role,
        full_name,
        email,
        phone,
        unit_number,
        note,
        status,
        invite_id,
        invite_code,
        direct_invite_id,
        inferred_role,
        inferred_unit_number
      ) VALUES (
        pic.property_id,
        v_uid,
        p_requested_role,
        v_name,
        v_email,
        v_phone,
        NULLIF(trim(p_unit_number), ''),
        p_note,
        'pending'::join_request_status,
        NULL,
        pic.code,
        NULL,
        v_inf_role,
        v_inf_unit
      )
      RETURNING id INTO v_join_id;

     RETURN jsonb_build_object(
        'ok', true,
        'success', true,
        'join_request_id', v_join_id,
        'entry_path', 'pending_submitted',
        'pending_created', true,
        'auto_approve', CASE WHEN v_auto IS NULL THEN 'skipped' ELSE 'failed' END,
        'auto_fail_reason', v_auto ->> 'reason'
      );
    END IF;

    RETURN jsonb_build_object(
      'ok', false,
      'success', false,
      'message', 'INVALID_INVITE'
    );
  END IF;

  -- ========= D) Public open join by property =========
  IF p_property_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.properties
    WHERE id = p_property_id
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'success', false,
      'error', 'bad_property',
      'message', 'Invalid or missing property.',
      'message_zh', '物业不存在或无效'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.properties p
    WHERE p.id = p_property_id
      AND p.allow_public_join_requests = true
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'success', false,
      'error', 'property_closed',
      'message', 'This property is not accepting public applications.',
      'message_zh', '该物业当前不接受公开申请'
    );
  END IF;

  SELECT * INTO vprof
  FROM public.profiles
  WHERE id = v_uid;

  v_name := COALESCE(NULLIF(trim(p_full_name), ''), vprof.full_name_en, vprof.email);
  v_email := COALESCE(NULLIF(trim(p_email), ''), vprof.email);
  v_phone := COALESCE(NULLIF(trim(p_phone), ''), vprof.phone);
  v_email_norm := lower(trim(coalesce(v_email, '')));

  IF EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.property_id = p_property_id
      AND pm.user_id = v_uid
      AND pm.status = 'active'
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'success', false,
      'error', 'already_member',
      'message', 'You are already a member of this property.',
      'message_zh', '你已经是该物业成员，无需重复申请'
    );
  END IF;

  IF v_email_norm <> '' AND EXISTS (
    SELECT 1
    FROM public.join_requests jr
    WHERE jr.property_id = p_property_id
      AND jr.status = 'pending'::join_request_status
      AND lower(trim(coalesce(jr.email, ''))) = v_email_norm
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'success', false,
      'error', 'already_pending',
      'message', 'You already have a pending request for this property.',
      'message_zh', '你已提交过该物业的申请，请等待审核'
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.join_requests jr
    WHERE jr.property_id = p_property_id
      AND jr.user_id = v_uid
      AND jr.status = 'pending'::join_request_status
  ) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'success', false,
      'error', 'already_pending',
      'message', 'You already have a pending request for this property.',
      'message_zh', '你已提交过该物业的申请，请等待审核'
    );
  END IF;

  v_inf_role := NULLIF(trim(p_inferred_role), '');
  v_inf_unit := NULLIF(trim(p_inferred_unit_number), '');

  v_auto := NULL;
  IF p_requested_role = 'owner'::public.user_role
    AND NULLIF(trim(p_unit_number), '') IS NOT NULL
    AND length(trim(coalesce(v_name, ''))) > 0
    AND length(v_email_norm) > 0
  THEN
    v_auto := public._try_owner_whitelist_auto_join(
      v_uid,
      p_property_id,
      trim(p_unit_number),
      p_move_in_date,
      p_language_pref,
      v_name,
      v_email,
      v_phone
    );
    IF (v_auto ->> 'auto_ok') = 'true' THEN
      RETURN jsonb_build_object(
        'ok', true,
        'success', true,
        'property_id', p_property_id,
        'entry_path', 'auto_approved',
        'pending_created', false,
        'auto_approve', 'passed',
        'residents_bind', v_auto -> 'bind',
        'property_members_upsert', v_auto -> 'bind' -> 'property_members_after'
      );
    END IF;
  END IF;

  INSERT INTO public.join_requests (
    property_id,
    user_id,
    requested_role,
    full_name,
    email,
    phone,
    unit_number,
    note,
    status,
    invite_id,
    invite_code,
    direct_invite_id,
    inferred_role,
    inferred_unit_number
  ) VALUES (
    p_property_id,
    v_uid,
    p_requested_role,
    v_name,
    v_email,
    v_phone,
    NULLIF(trim(p_unit_number), ''),
    p_note,
    'pending'::join_request_status,
    NULL,
    NULL,
    NULL,
    v_inf_role,
    v_inf_unit
  )
  RETURNING id INTO v_join_id;

  RETURN jsonb_build_object(
    'ok', true,
    'success', true,
    'property_id', p_property_id,
    'join_request_id', v_join_id,
    'entry_path', 'pending_submitted',
    'pending_created', true,
    'auto_approve', CASE WHEN v_auto IS NULL THEN 'skipped' ELSE 'failed' END,
    'auto_fail_reason', v_auto ->> 'reason'
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.submit_join_request(
  uuid, public.user_role, text, text, text, text, text, text, uuid, text, text, date, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_join_request(
  uuid, public.user_role, text, text, text, text, text, text, uuid, text, text, date, text
) TO authenticated;

COMMENT ON FUNCTION public.submit_join_request(
  uuid, public.user_role, text, text, text, text, text, text, uuid, text, text, date, text
) IS
  'Submit join request or auto-approve owner when roster unit is free (unified 入楼分流).';

-- ---------------------------------------------------------------------------
-- Bump public property_invite_codes on join_requests approval (pending path no longer consumes at submit)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_join_requests_bump_public_invite_on_approve()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $tr$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.status = 'approved'::public.join_request_status
     AND OLD.status IS DISTINCT FROM NEW.status
     AND NEW.invite_id IS NULL
     AND NEW.invite_code IS NOT NULL
     AND length(trim(NEW.invite_code)) > 0
  THEN
    UPDATE public.property_invite_codes pic
    SET
      used_count = pic.used_count + 1,
      is_active = CASE
        WHEN pic.max_uses > 0 AND (pic.used_count + 1) >= pic.max_uses THEN false
        ELSE pic.is_active
      END
    WHERE pic.property_id = NEW.property_id
      AND (pic.code = trim(NEW.invite_code) OR lower(pic.code) = lower(trim(NEW.invite_code)));
  END IF;
  RETURN NEW;
END;
$tr$;

DROP TRIGGER IF EXISTS join_requests_bump_public_invite_on_approve ON public.join_requests;
CREATE TRIGGER join_requests_bump_public_invite_on_approve
  AFTER UPDATE OF status ON public.join_requests
  FOR EACH ROW
  WHEN (NEW.status = 'approved'::join_request_status AND OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.trg_join_requests_bump_public_invite_on_approve();
