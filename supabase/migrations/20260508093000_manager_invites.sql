/*
  Property manager email invites (council / property_admin / property-scoped admin only).
  - No platform_admin bypass in policies (property_members.role only).
*/

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

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

CREATE TABLE public.manager_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'manager' CHECK (role = 'manager'),
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_manager_invites_property_id ON public.manager_invites (property_id);
CREATE INDEX idx_manager_invites_email_lower ON public.manager_invites ((lower(trim(email))));
CREATE INDEX idx_manager_invites_token ON public.manager_invites (token);
CREATE INDEX idx_manager_invites_status ON public.manager_invites (status);

DROP TRIGGER IF EXISTS trg_manager_invites_updated_at ON public.manager_invites;
CREATE TRIGGER trg_manager_invites_updated_at
  BEFORE UPDATE ON public.manager_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.manager_invites IS
  'Email-based property manager invitations; drafted by council/admin/property_admin; accepted links add property_members(manager).';

ALTER TABLE public.manager_invites ENABLE ROW LEVEL SECURITY;

-- Staff who may send invites can read/write rows for their property only.
DROP POLICY IF EXISTS "manager_invites_select_staff" ON public.manager_invites;
CREATE POLICY "manager_invites_select_staff"
  ON public.manager_invites
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = manager_invites.property_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'active'::public.member_status
        AND pm.role IN (
          'council'::public.user_role,
          'admin'::public.user_role,
          'property_admin'::public.user_role
        )
    )
  );

DROP POLICY IF EXISTS "manager_invites_insert_staff" ON public.manager_invites;
CREATE POLICY "manager_invites_insert_staff"
  ON public.manager_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = manager_invites.property_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'active'::public.member_status
        AND pm.role IN (
          'council'::public.user_role,
          'admin'::public.user_role,
          'property_admin'::public.user_role
        )
    )
  );

DROP POLICY IF EXISTS "manager_invites_update_staff" ON public.manager_invites;
CREATE POLICY "manager_invites_update_staff"
  ON public.manager_invites
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = manager_invites.property_id
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
      WHERE pm.property_id = manager_invites.property_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'active'::public.member_status
        AND pm.role IN (
          'council'::public.user_role,
          'admin'::public.user_role,
          'property_admin'::public.user_role
        )
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.manager_invites TO authenticated;

COMMIT;
