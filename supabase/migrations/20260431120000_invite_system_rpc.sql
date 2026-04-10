-- Invite helpers: generate_invite_code, accept_property_invite, preview, disable; extend create_property_invite + RLS.
-- Requires migration 20260431115959_add_viewer_user_role.sql (viewer enum).

-- ---------------------------------------------------------------------------
-- Code generator (used by create_property_invite)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $fn$
BEGIN
  RETURN upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10));
END;
$fn$;

REVOKE ALL ON FUNCTION public.generate_invite_code() FROM PUBLIC;
-- Only create_property_invite (same owner, SECURITY DEFINER) calls this.

-- ---------------------------------------------------------------------------
-- create_property_invite: use generate_invite_code(); allow council + manager
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_property_invite(
  p_property_id uuid,
  p_role public.user_role DEFAULT 'owner',
  p_max_uses int DEFAULT 1,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_code text;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.property_members pm
    WHERE pm.user_id = v_uid AND pm.property_id = p_property_id
      AND pm.status = 'active'
      AND pm.role IN ('property_admin', 'admin', 'council', 'manager')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  v_code := public.generate_invite_code();

  INSERT INTO public.property_invites (
    property_id, code, role, status, max_uses, used_count, expires_at, created_by
  ) VALUES (
    p_property_id, v_code, p_role, 'active', GREATEST(p_max_uses, 0), 0, p_expires_at, v_uid
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'code', v_code);
END;
$fn$;

-- ---------------------------------------------------------------------------
-- accept_property_invite ?standardized messages for app
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_property_invite(invite_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  c text := upper(trim(invite_code));
  inv public.property_invites%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'NOT_AUTHENTICATED');
  END IF;

  SELECT * INTO inv FROM public.property_invites WHERE code = c FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'INVITE_NOT_FOUND');
  END IF;

  IF inv.status = 'disabled' THEN
    RETURN jsonb_build_object('success', false, 'message', 'INVITE_NOT_ACTIVE');
  END IF;

  IF inv.status = 'expired' THEN
    RETURN jsonb_build_object('success', false, 'message', 'INVITE_EXPIRED');
  END IF;

  IF inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN
    UPDATE public.property_invites SET status = 'expired' WHERE id = inv.id;
    RETURN jsonb_build_object('success', false, 'message', 'INVITE_EXPIRED');
  END IF;

  IF inv.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'message', 'INVITE_NOT_ACTIVE');
  END IF;

  IF inv.max_uses > 0 AND inv.used_count >= inv.max_uses THEN
    RETURN jsonb_build_object('success', false, 'message', 'INVITE_LIMIT_REACHED');
  END IF;

  INSERT INTO public.property_members (property_id, user_id, role, status, approved_at)
  VALUES (inv.property_id, v_uid, inv.role, 'active', now())
  ON CONFLICT (property_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    status = 'active',
    approved_at = now();

  UPDATE public.property_invites
  SET used_count = used_count + 1
  WHERE id = inv.id;

  IF inv.max_uses > 0 AND (inv.used_count + 1) >= inv.max_uses THEN
    UPDATE public.property_invites SET status = 'expired' WHERE id = inv.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'property_id', inv.property_id,
    'role', inv.role::text
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.accept_property_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_property_invite(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Public preview (no auth) ?for /join landing
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_invite_preview(invite_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  c text := upper(trim(invite_code));
  inv public.property_invites%ROWTYPE;
  pname text;
BEGIN
  IF c = '' THEN
    RETURN jsonb_build_object('found', false, 'message', 'INVITE_NOT_FOUND');
  END IF;

  SELECT * INTO inv FROM public.property_invites WHERE code = c;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false, 'message', 'INVITE_NOT_FOUND');
  END IF;

  SELECT name INTO pname FROM public.properties WHERE id = inv.property_id;

  RETURN jsonb_build_object(
    'found', true,
    'property_name', COALESCE(pname, ''),
    'role', inv.role::text,
    'code', inv.code,
    'expires_at', inv.expires_at,
    'is_expired', CASE
      WHEN inv.expires_at IS NULL THEN false
      ELSE inv.expires_at < now()
    END,
    'status', inv.status,
    'max_uses', inv.max_uses,
    'used_count', inv.used_count
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.get_invite_preview(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invite_preview(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_invite_preview(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Disable invite (staff)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.disable_property_invite(p_invite_id uuid, p_property_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  n int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.property_members pm
    WHERE pm.user_id = v_uid AND pm.property_id = p_property_id
      AND pm.status = 'active'
      AND pm.role IN ('property_admin', 'admin', 'council', 'manager')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  UPDATE public.property_invites
  SET status = 'disabled'
  WHERE id = p_invite_id
    AND property_id = p_property_id
    AND status = 'active';

  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$fn$;

REVOKE ALL ON FUNCTION public.disable_property_invite(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.disable_property_invite(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS: staff (council, manager) can read property_invites for their property
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "pi_select_property" ON public.property_invites;
CREATE POLICY "pi_select_property"
  ON public.property_invites FOR SELECT TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = property_invites.property_id
        AND pm.status = 'active'
        AND pm.role IN ('property_admin', 'admin', 'council', 'manager')
    )
  );




