-- Advanced commercial invites:
-- property_direct_invites: directed links /join?invite=TOKEN (legacy table name "property_invites" already taken)
-- * resolve_* RPCs for anon join landing
-- * submit_join_request: direct invite + public property_invite_codes + legacy property_invites

-- ---------------------------------------------------------------------------
-- 0) property_invite_codes: optional expiry on public codes
-- ---------------------------------------------------------------------------
ALTER TABLE public.property_invite_codes ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- ---------------------------------------------------------------------------
-- 1) Directed invites (token-based)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.property_direct_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  invite_token text NOT NULL,
  label text NOT NULL DEFAULT '',
  unit_number text,
  intended_role text,
  intended_email text,
  intended_name text,
  max_uses int NOT NULL DEFAULT 1 CHECK (max_uses >= 0),
  used_count int NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT property_direct_invites_token_unique UNIQUE (invite_token)
);

CREATE INDEX IF NOT EXISTS idx_property_direct_invites_property_id
  ON public.property_direct_invites(property_id);
CREATE INDEX IF NOT EXISTS idx_property_direct_invites_invite_token
  ON public.property_direct_invites(invite_token);

ALTER TABLE public.property_direct_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pdi_select_staff"
  ON public.property_direct_invites FOR SELECT TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = property_direct_invites.property_id
        AND pm.status = 'active'
        AND pm.role IN ('property_admin', 'admin', 'council', 'manager')
    )
  );

CREATE POLICY "pdi_insert_staff"
  ON public.property_direct_invites FOR INSERT TO authenticated
  WITH CHECK (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = property_direct_invites.property_id
        AND pm.status = 'active'
        AND pm.role IN ('property_admin', 'admin', 'council', 'manager')
    )
  );

CREATE POLICY "pdi_update_staff"
  ON public.property_direct_invites FOR UPDATE TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = property_direct_invites.property_id
        AND pm.status = 'active'
        AND pm.role IN ('property_admin', 'admin', 'council', 'manager')
    )
  )
  WITH CHECK (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = property_direct_invites.property_id
        AND pm.status = 'active'
        AND pm.role IN ('property_admin', 'admin', 'council', 'manager')
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.property_direct_invites TO authenticated;
GRANT ALL ON public.property_direct_invites TO service_role;

-- ---------------------------------------------------------------------------
-- 2) join_requests: directed invite + inference snapshot
-- ---------------------------------------------------------------------------
ALTER TABLE public.join_requests
  ADD COLUMN IF NOT EXISTS direct_invite_id uuid REFERENCES public.property_direct_invites(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS inferred_role text,
  ADD COLUMN IF NOT EXISTS inferred_unit_number text;

CREATE INDEX IF NOT EXISTS idx_join_requests_direct_invite_id
  ON public.join_requests(direct_invite_id);

-- ---------------------------------------------------------------------------
-- 3) Resolve public invite code (property_invite_codes) anon OK
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_public_invite_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  c text := NULLIF(trim(p_code), '');
  pic public.property_invite_codes%ROWTYPE;
  pname text;
BEGIN
  IF c IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;

  SELECT * INTO pic
  FROM public.property_invite_codes
  WHERE code = c OR lower(code) = lower(c)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;

  IF NOT pic.is_active THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;

  IF pic.expires_at IS NOT NULL AND pic.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'expired');
  END IF;

  IF pic.max_uses > 0 AND pic.used_count >= pic.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'exhausted');
  END IF;

  SELECT name INTO pname FROM public.properties WHERE id = pic.property_id;

  RETURN jsonb_build_object(
    'ok', true,
    'property_id', pic.property_id,
    'property_name', COALESCE(pname, ''),
    'invite_code', pic.code,
    'label', pic.label
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.resolve_public_invite_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_public_invite_code(text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) Resolve directed invite token anon OK
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_direct_invite_for_join(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  t text := NULLIF(trim(p_token), '');
  dir public.property_direct_invites%ROWTYPE;
  pname text;
BEGIN
  IF t IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;

  SELECT * INTO dir FROM public.property_direct_invites WHERE invite_token = t;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;

  IF NOT dir.is_active THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;

  IF dir.expires_at IS NOT NULL AND dir.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'expired');
  END IF;

  IF dir.max_uses > 0 AND dir.used_count >= dir.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'exhausted');
  END IF;

  SELECT name INTO pname FROM public.properties WHERE id = dir.property_id;

  RETURN jsonb_build_object(
    'ok', true,
    'direct_invite_id', dir.id,
    'property_id', dir.property_id,
    'property_name', COALESCE(pname, ''),
    'unit_number', dir.unit_number,
    'intended_role', dir.intended_role,
    'intended_email', dir.intended_email,
    'intended_name', dir.intended_name,
    'expires_at', dir.expires_at,
    'invite_token', dir.invite_token,
    'label', dir.label
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.resolve_direct_invite_for_join(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_direct_invite_for_join(text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5) Map intended_role text user_role (resident owner)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.map_intended_role_to_user_role(p text)
RETURNS public.user_role
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $m$
  SELECT CASE lower(trim(coalesce(p, '')))
    WHEN 'tenant' THEN 'owner'::public.user_role
    WHEN 'viewer' THEN 'owner'::public.user_role
    WHEN 'council' THEN 'council'::public.user_role
    WHEN 'manager' THEN 'manager'::public.user_role
    WHEN 'property_admin' THEN 'owner'::public.user_role
    WHEN 'owner' THEN 'owner'::public.user_role
    WHEN 'resident' THEN 'owner'::public.user_role
    ELSE 'owner'::public.user_role
  END
$m$;

REVOKE ALL ON FUNCTION public.map_intended_role_to_user_role(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.map_intended_role_to_user_role(text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6) submit_join_request (replace): direct_id + inferred + public pic + legacy invite
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
  p_inferred_unit_number text DEFAULT NULL
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
    );

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
      'message', 'PENDING_APPROVAL'
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
        'message', 'PENDING_APPROVAL'
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
      );

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
        'success', true
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
  );

  RETURN jsonb_build_object(
    'ok', true,
    'success', true
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.submit_join_request(uuid, public.user_role, text, text, text, text, text, text, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_join_request(uuid, public.user_role, text, text, text, text, text, text, uuid, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';