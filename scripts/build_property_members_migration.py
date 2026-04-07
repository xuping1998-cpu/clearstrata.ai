"""Build supabase/migrations/20260410120000_property_members_saas.sql from template + policy fragment."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
rls = (ROOT / "supabase/migrations/20260405120100_multi_tenant_rls.sql").read_text(encoding="utf-8")
start = rls.find('CREATE POLICY "cn_select_tenant"')
block = rls[start:]
block = block.replace("public.property_users pu", "public.property_members pm")
block = block.replace("pu.user_id", "pm.user_id")
block = block.replace("pu.property_id", "pm.property_id")
block = block.replace("pu.role", "pm.role")
import re

block = re.sub(
    r"(WHERE pm\.user_id = \(SELECT auth\.uid\(\)\)\s*\n\s*AND pm\.property_id = [^\n]+\s*\n\s*)(AND pm\.role IN)",
    r"\1        AND pm.status = 'active'::member_status\n        \2",
    block,
)
block = block.replace(
    "AND pm.role IN ('admin', 'manager', 'council')",
    "AND pm.role IN ('admin', 'manager', 'council', 'property_admin')",
)
block = block.replace(
    "AND pm.role IN ('council', 'admin', 'manager')",
    "AND pm.role IN ('council', 'admin', 'manager', 'property_admin')",
)
block = block.replace(
    "AND pm.role IN ('council', 'admin')",
    "AND pm.role IN ('council', 'admin', 'manager', 'property_admin')",
)

policies = re.findall(r'CREATE POLICY "([^"]+)"\s*\n\s*ON public\.(\w+)', block)
drops = "\n".join(
    f'DROP POLICY IF EXISTS "{name}" ON public.{table};' for name, table in policies
)

# meeting_records DROP only if table exists — replace flat DROP with conditional for mrec
drops = drops.replace(
    'DROP POLICY IF EXISTS "mrec_all_tenant" ON public.meeting_records;',
    """DO $d$
BEGIN
  IF to_regclass('public.meeting_records') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "mrec_all_tenant" ON public.meeting_records';
  END IF;
END $d$;""",
)

header = r'''/*
  # SaaS: property_members (rename from property_users), invites, join requests, RPCs, RLS refresh
*/

-- ---------------------------------------------------------------------------
-- 1) Enums + extend user_role
-- ---------------------------------------------------------------------------

DO $e$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_status') THEN
    CREATE TYPE public.member_status AS ENUM ('pending', 'active', 'suspended');
  END IF;
END $e$;

DO $e$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'join_request_status') THEN
    CREATE TYPE public.join_request_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END $e$;

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'property_admin';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'tenant';

-- ---------------------------------------------------------------------------
-- 2) Rename property_users → property_members + columns
-- ---------------------------------------------------------------------------

DO $r$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'property_users'
  ) THEN
    ALTER TABLE public.property_users RENAME TO property_members;
  END IF;
END $r$;

ALTER TABLE public.property_members
  ADD COLUMN IF NOT EXISTS status public.member_status,
  ADD COLUMN IF NOT EXISTS unit_number text,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

UPDATE public.property_members SET status = 'active'::member_status WHERE status IS NULL;
ALTER TABLE public.property_members ALTER COLUMN status SET DEFAULT 'active'::member_status;
ALTER TABLE public.property_members ALTER COLUMN status SET NOT NULL;

ALTER INDEX IF EXISTS idx_property_users_user_id RENAME TO idx_property_members_user_id;
ALTER INDEX IF EXISTS idx_property_users_property_id RENAME TO idx_property_members_property_id;

ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- 3) Core functions
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.user_property_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pm.property_id
  FROM public.property_members pm
  WHERE pm.user_id = (SELECT auth.uid())
    AND pm.status = 'active'::member_status;
$$;

REVOKE ALL ON FUNCTION public.user_property_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_property_ids() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.trg_profiles_add_default_property_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $f$
DECLARE
  pid uuid := '00000000-0000-4000-a000-000000000001'::uuid;
BEGIN
  INSERT INTO public.property_members (property_id, user_id, role, status)
  VALUES (pid, NEW.id, NEW.role, 'active'::member_status)
  ON CONFLICT (property_id, user_id) DO UPDATE SET role = EXCLUDED.role, status = 'active'::member_status;
  RETURN NEW;
END;
$f$;

-- ---------------------------------------------------------------------------
-- 4) Invites + join_requests
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

CREATE TABLE IF NOT EXISTS public.join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_role public.user_role NOT NULL DEFAULT 'owner',
  full_name text,
  email text,
  phone text,
  unit_number text,
  note text,
  status public.join_request_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS join_requests_one_pending_per_user
  ON public.join_requests(property_id, user_id)
  WHERE status = 'pending'::join_request_status;

CREATE INDEX IF NOT EXISTS idx_join_requests_property_id ON public.join_requests(property_id);

ALTER TABLE public.property_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 5) RPCs (SECURITY DEFINER)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.redeem_property_invite(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  inv public.property_invites%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO inv FROM public.property_invites
  WHERE code = upper(trim(p_code)) AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  IF inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN
    UPDATE public.property_invites SET status = 'expired' WHERE id = inv.id;
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  IF inv.max_uses > 0 AND inv.used_count >= inv.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'error', 'max_uses');
  END IF;

  INSERT INTO public.property_members (property_id, user_id, role, status, approved_at)
  VALUES (inv.property_id, v_uid, inv.role, 'active'::member_status, now())
  ON CONFLICT (property_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    status = 'active'::member_status,
    approved_at = now();

  UPDATE public.property_invites
  SET used_count = used_count + 1
  WHERE id = inv.id;

  IF inv.max_uses > 0 AND (inv.used_count + 1) >= inv.max_uses THEN
    UPDATE public.property_invites SET status = 'expired' WHERE id = inv.id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'property_id', inv.property_id);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.submit_join_request(
  p_property_id uuid,
  p_requested_role public.user_role DEFAULT 'owner',
  p_unit_number text DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  vprof public.profiles%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF p_property_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.properties WHERE id = p_property_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bad_property');
  END IF;

  SELECT * INTO vprof FROM public.profiles WHERE id = v_uid;

  IF EXISTS (
    SELECT 1 FROM public.property_members pm
    WHERE pm.property_id = p_property_id AND pm.user_id = v_uid AND pm.status = 'active'::member_status
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_member');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.join_requests jr
    WHERE jr.property_id = p_property_id AND jr.user_id = v_uid AND jr.status = 'pending'::join_request_status
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'pending_exists');
  END IF;

  INSERT INTO public.join_requests (
    property_id, user_id, requested_role, full_name, email, phone, unit_number, note, status
  ) VALUES (
    p_property_id,
    v_uid,
    p_requested_role,
    COALESCE(vprof.full_name_en, vprof.email),
    vprof.email,
    vprof.phone,
    p_unit_number,
    p_note,
    'pending'::join_request_status
  );

  RETURN jsonb_build_object('ok', true);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.review_join_request(
  p_request_id uuid,
  p_approve boolean,
  p_unit_number text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  r public.join_requests%ROWTYPE;
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
      AND pm.status = 'active'::member_status
      AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF p_approve THEN
    UPDATE public.join_requests
    SET status = 'approved'::join_request_status,
        reviewed_by = v_uid,
        reviewed_at = now()
    WHERE id = p_request_id;

    INSERT INTO public.property_members (
      property_id, user_id, role, status, unit_number, approved_by, approved_at
    ) VALUES (
      r.property_id,
      r.user_id,
      r.requested_role,
      'active'::member_status,
      COALESCE(p_unit_number, r.unit_number),
      v_uid,
      now()
    )
    ON CONFLICT (property_id, user_id) DO UPDATE SET
      role = EXCLUDED.role,
      status = 'active'::member_status,
      unit_number = COALESCE(EXCLUDED.unit_number, public.property_members.unit_number),
      approved_by = EXCLUDED.approved_by,
      approved_at = EXCLUDED.approved_at;
  ELSE
    UPDATE public.join_requests
    SET status = 'rejected'::join_request_status,
        reviewed_by = v_uid,
        reviewed_at = now()
    WHERE id = p_request_id;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$fn$;

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
      AND pm.status = 'active'::member_status
      AND pm.role IN ('property_admin', 'admin')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  v_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10));

  INSERT INTO public.property_invites (
    property_id, code, role, status, max_uses, used_count, expires_at, created_by
  ) VALUES (
    p_property_id, v_code, p_role, 'active', GREATEST(p_max_uses, 0), 0, p_expires_at, v_uid
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'code', v_code);
END;
$fn$;

REVOKE ALL ON FUNCTION public.redeem_property_invite(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_join_request(uuid, user_role, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_join_request(uuid, boolean, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_property_invite(uuid, user_role, int, timestamptz) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.redeem_property_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_join_request(uuid, user_role, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_join_request(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_property_invite(uuid, user_role, int, timestamptz) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6) Meta RLS: property_members, property_invites, join_requests
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "property_users_select_self" ON public.property_members;
DROP POLICY IF EXISTS "property_members_select_self" ON public.property_members;

CREATE POLICY "property_members_select_self"
  ON public.property_members FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "pi_select_property" ON public.property_invites;
CREATE POLICY "pi_select_property"
  ON public.property_invites FOR SELECT TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = property_invites.property_id
        AND pm.status = 'active'::member_status
        AND pm.role IN ('property_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "jr_select_scope" ON public.join_requests;
CREATE POLICY "jr_select_scope"
  ON public.join_requests FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (
      property_id IN (SELECT public.user_property_ids())
      AND EXISTS (
        SELECT 1 FROM public.property_members pm
        WHERE pm.user_id = (SELECT auth.uid())
          AND pm.property_id = join_requests.property_id
          AND pm.status = 'active'::member_status
          AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 7) Recreate tenant policies (property_members + staff roles)
-- ---------------------------------------------------------------------------

'''

out = ROOT / "supabase/migrations/20260410120000_property_members_saas.sql"
out.write_text(header + drops + "\n\n" + block + "\n", encoding="utf-8")
print("Wrote", out, "bytes", out.stat().st_size)
