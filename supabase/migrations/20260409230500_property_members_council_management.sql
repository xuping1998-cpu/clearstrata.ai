-- ---------------------------------------------------------------------------
-- Council-only member management on property_members
-- - status enum: add inactive, removed (alongside pending, active, suspended)
-- - RLS: only active council on same property may UPDATE (role, status)
-- - BEFORE UPDATE trigger: cannot target self; must keep ≥1 active council
-- - AFTER UPDATE trigger: status → removed clears residents.user_id (SECURITY DEFINER)
-- Replaces 20260409220000_property_members_staff_update_role (council-only + status).
-- ---------------------------------------------------------------------------

-- 1) Extend member_status (PG15+: IF NOT EXISTS)
ALTER TYPE public.member_status ADD VALUE IF NOT EXISTS 'inactive';
ALTER TYPE public.member_status ADD VALUE IF NOT EXISTS 'removed';

-- 2) Grants: role + status for authenticated updates under RLS
REVOKE UPDATE (role) ON public.property_members FROM authenticated;
GRANT UPDATE (role, status) ON public.property_members TO authenticated;

-- 3) Drop prior staff update policy
DROP POLICY IF EXISTS "property_members_staff_update_role" ON public.property_members;

CREATE POLICY "property_members_council_update"
  ON public.property_members
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = property_members.property_id
        AND pm.user_id = (SELECT auth.uid())
        AND pm.status::text = 'active'
        AND pm.role::text = 'council'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = property_members.property_id
        AND pm.user_id = (SELECT auth.uid())
        AND pm.status::text = 'active'
        AND pm.role::text = 'council'
    )
    AND role::text IN ('owner', 'council', 'manager')
    AND status::text IN (
      'pending',
      'active',
      'suspended',
      'inactive',
      'removed'
    )
  );

-- 4) BEFORE UPDATE: no self-modify; keep at least one active council
CREATE OR REPLACE FUNCTION public.trg_property_members_council_business_rules()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $fn$
DECLARE
  v_others int;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF (SELECT auth.uid()) IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id = (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'property_members_guard:self'
      USING ERRCODE = '23514',
        HINT = 'Council cannot modify their own membership row from this flow.';
  END IF;

  IF OLD.role::text = 'council' AND OLD.status::text = 'active' THEN
    IF NOT (
      NEW.role::text = 'council'
      AND NEW.status::text = 'active'
    ) THEN
      SELECT count(*)::int
      INTO v_others
      FROM public.property_members pm
      WHERE pm.property_id = OLD.property_id
        AND pm.user_id IS DISTINCT FROM OLD.user_id
        AND pm.role::text = 'council'
        AND pm.status::text = 'active';

      IF coalesce(v_others, 0) < 1 THEN
        RAISE EXCEPTION 'property_members_guard:last_council'
          USING ERRCODE = '23514',
            HINT = 'At least one active council member is required for this property.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS property_members_council_business_rules ON public.property_members;
CREATE TRIGGER property_members_council_business_rules
  BEFORE UPDATE ON public.property_members
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_property_members_council_business_rules();

-- 5) AFTER UPDATE: kick → clear resident binding (definer bypasses residents RLS)
CREATE OR REPLACE FUNCTION public.trg_property_members_clear_resident_on_removed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn2$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.status::text = 'removed'
     AND OLD.status::text IS DISTINCT FROM 'removed' THEN
    UPDATE public.residents r
    SET user_id = NULL,
        updated_at = now()
    WHERE r.property_id = NEW.property_id
      AND r.user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$fn2$;

DROP TRIGGER IF EXISTS property_members_clear_resident_on_removed ON public.property_members;
CREATE TRIGGER property_members_clear_resident_on_removed
  AFTER UPDATE ON public.property_members
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_property_members_clear_resident_on_removed();
