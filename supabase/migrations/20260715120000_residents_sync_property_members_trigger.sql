/*
  # Residents → property_members: automatic membership (single source of truth)

  When a row is inserted into `public.residents` (or `property_id` / `user_id` changes),
  ensure an `active` `owner` row exists in `public.property_members` for the same
  `(property_id, user_id)` if not already present (NOT EXISTS).

  One-time backfill: all existing residents without a matching membership get inserted.
*/

-- ---------------------------------------------------------------------------
-- 1) Trigger function
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.residents_ensure_property_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.property_members (property_id, user_id, role, status)
    SELECT NEW.property_id, NEW.user_id, 'owner'::public.user_role, 'active'::public.member_status
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = NEW.property_id
        AND pm.user_id = NEW.user_id
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.property_id IS DISTINCT FROM OLD.property_id OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      INSERT INTO public.property_members (property_id, user_id, role, status)
      SELECT NEW.property_id, NEW.user_id, 'owner'::public.user_role, 'active'::public.member_status
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.property_members pm
        WHERE pm.property_id = NEW.property_id
          AND pm.user_id = NEW.user_id
      );
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_residents_ensure_property_member ON public.residents;

CREATE TRIGGER trg_residents_ensure_property_member
  AFTER INSERT OR UPDATE OF property_id, user_id ON public.residents
  FOR EACH ROW
  EXECUTE FUNCTION public.residents_ensure_property_member();

COMMENT ON FUNCTION public.residents_ensure_property_member() IS
  'Keeps property_members in sync when residents are added or moved (owner/active, NOT EXISTS).';

-- ---------------------------------------------------------------------------
-- 2) Backfill: existing residents → property_members (idempotent)
-- ---------------------------------------------------------------------------

INSERT INTO public.property_members (property_id, user_id, role, status)
SELECT DISTINCT
  r.property_id,
  r.user_id,
  'owner'::public.user_role,
  'active'::public.member_status
FROM public.residents r
WHERE NOT EXISTS (
  SELECT 1
  FROM public.property_members pm
  WHERE pm.property_id = r.property_id
    AND pm.user_id = r.user_id
);
