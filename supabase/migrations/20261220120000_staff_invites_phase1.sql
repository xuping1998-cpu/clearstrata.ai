/*
  Phase 1 — Staff invites (lawyer / auditor / finance / accountant) data structures.

  Scope (strict):
    - Add public.property_members.staff_type text NULL.
    - Create public.staff_invites table + RLS + indexes.
    - Reuse public.set_updated_at() trigger function (manager_invites already creates it).

  Out of scope (untouched):
    - public.user_role enum.
    - public.manager_invites table / policies / data.
    - send-manager-invite / accept-manager-invite Edge Functions.
    - Frontend.

  Authorization model (DB layer):
    - SELECT / INSERT / UPDATE on staff_invites: council / admin / property_admin only.
    - manager is intentionally excluded (managers cannot invite staff).
    - Accept flow runs as service_role from Edge, so no DELETE / authenticated write paths
      for acceptance are needed yet.

  Idempotency:
    - CREATE TABLE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS, CREATE INDEX IF NOT EXISTS.
    - DROP POLICY IF EXISTS + CREATE POLICY for repeatable RLS apply.
    - DO blocks guard CHECK / unique constraints + trigger creation.
*/

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- 0) Defensive: reuse set_updated_at() if a prior migration created it;
--    otherwise create now (mirrors 20260508093000_manager_invites.sql guard).
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
-- 1) property_members.staff_type — business identity (orthogonal to role)
--    role stays as RLS gate (viewer for these accounts); staff_type is for UI
--    + future module-level checks.
-- ---------------------------------------------------------------------------

ALTER TABLE public.property_members
  ADD COLUMN IF NOT EXISTS staff_type text NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.property_members'::regclass
      AND conname = 'property_members_staff_type_check'
  ) THEN
    ALTER TABLE public.property_members
      ADD CONSTRAINT property_members_staff_type_check
      CHECK (
        staff_type IS NULL
        OR staff_type IN ('lawyer', 'auditor', 'finance', 'accountant')
      );
  END IF;
END
$$;

COMMENT ON COLUMN public.property_members.staff_type IS
  'Phase 1 staff business identity for viewer-role accounts invited via staff_invites '
  '(lawyer / auditor / finance / accountant). NULL for owner / tenant / council / manager / admin / property_admin / viewer added by other flows.';

-- ---------------------------------------------------------------------------
-- 2) staff_invites table — decoupled from manager_invites
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.staff_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  email       text NOT NULL,
  full_name   text,
  staff_type  text NOT NULL
              CHECK (staff_type IN ('lawyer', 'auditor', 'finance', 'accountant')),
  member_role public.user_role NOT NULL DEFAULT 'viewer'
              CHECK (member_role = 'viewer'),
  token       text NOT NULL UNIQUE,
  status      text NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  invited_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.staff_invites IS
  'Email-based staff invitations (lawyer / auditor / finance / accountant). '
  'Drafted by council / admin / property_admin only; accepted by Edge service_role '
  'which writes property_members(role=viewer, staff_type=<staff_type>). '
  'Independent of manager_invites.';

-- ---------------------------------------------------------------------------
-- 3) Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_staff_invites_property_id
  ON public.staff_invites (property_id);

-- token UNIQUE constraint above already provides a unique index; add explicit
-- lookup index by email (lower-trim) and status for invite drafting UIs.
CREATE INDEX IF NOT EXISTS idx_staff_invites_email_lower
  ON public.staff_invites ((lower(trim(email))));

CREATE INDEX IF NOT EXISTS idx_staff_invites_status
  ON public.staff_invites (status);

-- Avoid duplicate active drafts: at most one pending invite per (property, email).
-- Partial unique index keeps accepted / expired / cancelled rows free to coexist
-- and supports resending invitations later.
CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_invites_pending_property_email
  ON public.staff_invites (property_id, (lower(trim(email))))
  WHERE status = 'pending';

-- ---------------------------------------------------------------------------
-- 4) updated_at trigger
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_staff_invites_updated_at ON public.staff_invites;
CREATE TRIGGER trg_staff_invites_updated_at
  BEFORE UPDATE ON public.staff_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5) RLS — only council / admin / property_admin of the SAME property
--          may SELECT / INSERT / UPDATE. manager is excluded.
--          Accept flow runs as service_role and bypasses RLS.
-- ---------------------------------------------------------------------------

ALTER TABLE public.staff_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_invites_select_staff" ON public.staff_invites;
CREATE POLICY "staff_invites_select_staff"
  ON public.staff_invites
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = staff_invites.property_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'active'::public.member_status
        AND pm.role IN (
          'council'::public.user_role,
          'admin'::public.user_role,
          'property_admin'::public.user_role
        )
    )
  );

DROP POLICY IF EXISTS "staff_invites_insert_staff" ON public.staff_invites;
CREATE POLICY "staff_invites_insert_staff"
  ON public.staff_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = staff_invites.property_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'active'::public.member_status
        AND pm.role IN (
          'council'::public.user_role,
          'admin'::public.user_role,
          'property_admin'::public.user_role
        )
    )
  );

DROP POLICY IF EXISTS "staff_invites_update_staff" ON public.staff_invites;
CREATE POLICY "staff_invites_update_staff"
  ON public.staff_invites
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = staff_invites.property_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'active'::public.member_status
        AND pm.role IN (
          'council'::public.user_role,
          'admin'::public.user_role,
          'property_admin'::public.user_role
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = staff_invites.property_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'active'::public.member_status
        AND pm.role IN (
          'council'::public.user_role,
          'admin'::public.user_role,
          'property_admin'::public.user_role
        )
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.staff_invites TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
