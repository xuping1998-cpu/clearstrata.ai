-- Ensure legacy link-invite RPCs exist (PostgREST: supabase.rpc('create_property_invite', { p_property_id, ... })).
-- Fixes remote DBs where migrations were skipped or schema cache is stale.

-- ---------------------------------------------------------------------------
-- Table (idempotent; align with 20260410120000_property_members_saas.sql)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.property_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  role public.user_role NOT NULL DEFAULT 'owner',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'expired')),
  max_uses int NOT NULL DEFAULT 1 CHECK (max_uses >= 0),
  used_count int NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  expires_at timestamptz,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_invites_property_id ON public.property_invites(property_id);

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

REVOKE ALL ON FUNCTION public.create_property_invite(uuid, user_role, int, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_property_invite(uuid, user_role, int, timestamptz) TO authenticated;

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
