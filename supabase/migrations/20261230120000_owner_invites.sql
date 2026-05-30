/*
  Owner Invite Phase A — directed OWNER invitation table.

  Scope (strict):
    - Create public.owner_invites + indexes + pending dedup unique index.
    - updated_at trigger via shared public.set_updated_at().
    - RLS: same-property council / admin / property_admin only (manager EXCLUDED).
    - Grants + PostgREST schema reload.

  Out of scope (UNTOUCHED):
    - submit_join_request / join_requests / property_invites / property_invite_codes.
    - staff_invites / manager_invites and their Edge Functions.
    - QR entry (/entry). No DDL on property_members / residents (acceptance flow,
      built later as a separate Edge Function, will write those via service_role).

  Idempotency:
    - CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS.
    - DROP POLICY IF EXISTS + CREATE POLICY for repeatable RLS apply.
    - DO block guards set_updated_at() creation; DROP TRIGGER IF EXISTS before create.
*/

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- 0) Reuse set_updated_at() if a prior migration created it; otherwise create
--    (mirrors staff_invites_phase1 guard).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'set_updated_at'
  ) THEN
    CREATE FUNCTION public.set_updated_at()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $fn$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $fn$;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 1) owner_invites table — parallel to staff_invites; role locked to 'owner'.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.owner_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  email       text NOT NULL,
  full_name   text NOT NULL,
  unit_no     text NOT NULL,
  member_role public.user_role NOT NULL DEFAULT 'owner'
              CHECK (member_role = 'owner'),
  token       text NOT NULL UNIQUE,
  status      text NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  invited_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.owner_invites IS
  'Email-based directed OWNER invitations. Drafted by council / admin / property_admin only; '
  'accepted by Edge service_role which writes property_members(role=owner, status=active, unit_no) '
  'and residents(unit_no). Parallel to staff_invites; independent of join_requests / QR entry.';

-- ---------------------------------------------------------------------------
-- 2) Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_owner_invites_property_id
  ON public.owner_invites (property_id);

CREATE INDEX IF NOT EXISTS idx_owner_invites_email_lower
  ON public.owner_invites ((lower(trim(email))));

CREATE INDEX IF NOT EXISTS idx_owner_invites_status
  ON public.owner_invites (status);

-- ---------------------------------------------------------------------------
-- 3) Pending dedup: at most one pending invite per (property, email).
--    accepted / expired / revoked rows coexist freely (supports resending).
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_owner_invites_pending_property_email
  ON public.owner_invites (property_id, (lower(trim(email))))
  WHERE status = 'pending';

-- ---------------------------------------------------------------------------
-- 4) updated_at trigger
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_owner_invites_updated_at ON public.owner_invites;
CREATE TRIGGER trg_owner_invites_updated_at
  BEFORE UPDATE ON public.owner_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5) RLS — only council / admin / property_admin of the SAME property may
--          SELECT / INSERT / UPDATE. manager is intentionally EXCLUDED.
--          Accept flow runs as service_role and bypasses RLS.
-- ---------------------------------------------------------------------------
ALTER TABLE public.owner_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_invites_select_staff" ON public.owner_invites;
CREATE POLICY "owner_invites_select_staff"
  ON public.owner_invites
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = owner_invites.property_id
        AND pm.user_id = auth.uid()
        AND pm.status::text = 'active'
        AND pm.role::text IN ('council', 'admin', 'property_admin')
    )
  );

DROP POLICY IF EXISTS "owner_invites_insert_staff" ON public.owner_invites;
CREATE POLICY "owner_invites_insert_staff"
  ON public.owner_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = owner_invites.property_id
        AND pm.user_id = auth.uid()
        AND pm.status::text = 'active'
        AND pm.role::text IN ('council', 'admin', 'property_admin')
    )
  );

DROP POLICY IF EXISTS "owner_invites_update_staff" ON public.owner_invites;
CREATE POLICY "owner_invites_update_staff"
  ON public.owner_invites
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = owner_invites.property_id
        AND pm.user_id = auth.uid()
        AND pm.status::text = 'active'
        AND pm.role::text IN ('council', 'admin', 'property_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = owner_invites.property_id
        AND pm.user_id = auth.uid()
        AND pm.status::text = 'active'
        AND pm.role::text IN ('council', 'admin', 'property_admin')
    )
  );

-- ---------------------------------------------------------------------------
-- 6) Grants
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON public.owner_invites TO authenticated;
GRANT ALL ON public.owner_invites TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
