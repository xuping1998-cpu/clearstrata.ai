/*
  SaaS tenant helpers + property_id on meeting minutes / resolutions / vote options.
  RLS for these objects uses is_property_member / is_property_staff (property_members–aligned).
*/

-- ---------------------------------------------------------------------------
-- 1) Boolean helpers (single property_id) — same semantics as user_property_*()
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_property_member(p_property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.property_id = p_property_id
      AND pm.user_id = (SELECT auth.uid())
      AND pm.status::text = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_property_staff(p_property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.property_id = p_property_id
      AND pm.user_id = (SELECT auth.uid())
      AND pm.status::text = 'active'
      AND pm.role::text IN ('property_admin', 'admin', 'council', 'manager')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_property_admin(p_property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.property_id = p_property_id
      AND pm.user_id = (SELECT auth.uid())
      AND pm.status::text = 'active'
      AND pm.role::text IN ('property_admin', 'admin')
  );
$$;

REVOKE ALL ON FUNCTION public.is_property_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_property_staff(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_property_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_property_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_property_staff(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_property_admin(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.is_property_member(uuid) IS 'True if auth.uid() is an active member of the property.';
COMMENT ON FUNCTION public.is_property_staff(uuid) IS 'True if auth.uid() is active staff (council/manager/admin/property_admin) on the property.';
COMMENT ON FUNCTION public.is_property_admin(uuid) IS 'True if auth.uid() is active property_admin or admin on the property.';

-- ---------------------------------------------------------------------------
-- 2) Columns + backfill
-- ---------------------------------------------------------------------------
ALTER TABLE public.meeting_minutes ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE;
ALTER TABLE public.meeting_minutes_versions ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE;
ALTER TABLE public.meeting_resolutions ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE;
ALTER TABLE public.meeting_vote_options ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE;
ALTER TABLE public.meeting_votes ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL;

UPDATE public.meeting_votes v
SET property_id = m.property_id
FROM public.meetings m
WHERE v.meeting_id = m.id
  AND v.property_id IS NULL
  AND m.property_id IS NOT NULL;

UPDATE public.meeting_minutes mm
SET property_id = m.property_id
FROM public.meetings m
WHERE mm.meeting_id = m.id
  AND mm.property_id IS NULL
  AND m.property_id IS NOT NULL;

UPDATE public.meeting_minutes_versions v
SET property_id = mm.property_id
FROM public.meeting_minutes mm
WHERE v.minutes_id = mm.id
  AND v.property_id IS NULL
  AND mm.property_id IS NOT NULL;

UPDATE public.meeting_resolutions r
SET property_id = m.property_id
FROM public.meetings m
WHERE r.meeting_id = m.id
  AND r.property_id IS NULL
  AND m.property_id IS NOT NULL;

UPDATE public.meeting_vote_options o
SET property_id = v.property_id
FROM public.meeting_votes v
WHERE o.vote_id = v.id
  AND o.property_id IS NULL
  AND v.property_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3) Sync triggers (inserts/updates without property_id from clients)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.meeting_minutes_sync_property_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.meeting_id IS NOT NULL THEN
    SELECT m.property_id INTO NEW.property_id
    FROM public.meetings m
    WHERE m.id = NEW.meeting_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_meeting_minutes_sync_property ON public.meeting_minutes;
CREATE TRIGGER trg_meeting_minutes_sync_property
  BEFORE INSERT OR UPDATE OF meeting_id ON public.meeting_minutes
  FOR EACH ROW
  EXECUTE FUNCTION public.meeting_minutes_sync_property_id();

CREATE OR REPLACE FUNCTION public.meeting_minutes_versions_sync_property_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.minutes_id IS NOT NULL THEN
    SELECT mm.property_id INTO NEW.property_id
    FROM public.meeting_minutes mm
    WHERE mm.id = NEW.minutes_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_meeting_minutes_versions_sync_property ON public.meeting_minutes_versions;
CREATE TRIGGER trg_meeting_minutes_versions_sync_property
  BEFORE INSERT OR UPDATE OF minutes_id ON public.meeting_minutes_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.meeting_minutes_versions_sync_property_id();

CREATE OR REPLACE FUNCTION public.meeting_resolutions_sync_property_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.meeting_id IS NOT NULL THEN
    SELECT m.property_id INTO NEW.property_id
    FROM public.meetings m
    WHERE m.id = NEW.meeting_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_meeting_resolutions_sync_property ON public.meeting_resolutions;
CREATE TRIGGER trg_meeting_resolutions_sync_property
  BEFORE INSERT OR UPDATE OF meeting_id ON public.meeting_resolutions
  FOR EACH ROW
  EXECUTE FUNCTION public.meeting_resolutions_sync_property_id();

CREATE OR REPLACE FUNCTION public.meeting_vote_options_sync_property_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.vote_id IS NOT NULL THEN
    SELECT v.property_id INTO NEW.property_id
    FROM public.meeting_votes v
    WHERE v.id = NEW.vote_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_meeting_vote_options_sync_property ON public.meeting_vote_options;
CREATE TRIGGER trg_meeting_vote_options_sync_property
  BEFORE INSERT OR UPDATE OF vote_id ON public.meeting_vote_options
  FOR EACH ROW
  EXECUTE FUNCTION public.meeting_vote_options_sync_property_id();

-- ---------------------------------------------------------------------------
-- 4) Indexes (canonical name)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS meeting_minutes_property_id_idx ON public.meeting_minutes(property_id);
CREATE INDEX IF NOT EXISTS meeting_minutes_versions_property_id_idx ON public.meeting_minutes_versions(property_id);
CREATE INDEX IF NOT EXISTS meeting_resolutions_property_id_idx ON public.meeting_resolutions(property_id);
CREATE INDEX IF NOT EXISTS meeting_vote_options_property_id_idx ON public.meeting_vote_options(property_id);

-- ---------------------------------------------------------------------------
-- 5) RLS — meeting_minutes / meeting_minutes_versions
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view approved minutes" ON public.meeting_minutes;
DROP POLICY IF EXISTS "Council and managers can draft minutes" ON public.meeting_minutes;
DROP POLICY IF EXISTS "Council and managers can update minutes" ON public.meeting_minutes;

CREATE POLICY meeting_minutes_select_property
  ON public.meeting_minutes FOR SELECT TO authenticated
  USING (
    public.is_property_member(property_id)
    AND (
      status IN ('approved'::minutes_status, 'archived'::minutes_status)
      OR drafted_by = (SELECT auth.uid())
      OR public.is_property_staff(property_id)
    )
  );

CREATE POLICY meeting_minutes_insert_staff
  ON public.meeting_minutes FOR INSERT TO authenticated
  WITH CHECK (public.is_property_staff(property_id));

CREATE POLICY meeting_minutes_update_staff
  ON public.meeting_minutes FOR UPDATE TO authenticated
  USING (public.is_property_staff(property_id) AND is_final = false)
  WITH CHECK (public.is_property_staff(property_id) AND is_final = false);

DROP POLICY IF EXISTS "Users can view minutes versions" ON public.meeting_minutes_versions;
DROP POLICY IF EXISTS "System can create versions" ON public.meeting_minutes_versions;

CREATE POLICY meeting_minutes_versions_select_property
  ON public.meeting_minutes_versions FOR SELECT TO authenticated
  USING (public.is_property_member(property_id));

CREATE POLICY meeting_minutes_versions_insert_staff
  ON public.meeting_minutes_versions FOR INSERT TO authenticated
  WITH CHECK (
    public.is_property_staff(property_id)
    AND modified_by = (SELECT auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 6) RLS — meeting_resolutions + meeting_vote_options (property_id predicates)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS mres_select ON public.meeting_resolutions;
DROP POLICY IF EXISTS mres_write_staff ON public.meeting_resolutions;

CREATE POLICY mres_select ON public.meeting_resolutions FOR SELECT TO authenticated
  USING (public.is_property_member(property_id));

CREATE POLICY mres_write_staff ON public.meeting_resolutions FOR ALL TO authenticated
  USING (public.is_property_staff(property_id))
  WITH CHECK (public.is_property_staff(property_id));

DROP POLICY IF EXISTS mvopt_select_member ON public.meeting_vote_options;
DROP POLICY IF EXISTS mvopt_write_staff ON public.meeting_vote_options;

CREATE POLICY mvopt_select_member ON public.meeting_vote_options FOR SELECT TO authenticated
  USING (public.is_property_member(property_id));

CREATE POLICY mvopt_write_staff ON public.meeting_vote_options FOR ALL TO authenticated
  USING (public.is_property_staff(property_id))
  WITH CHECK (public.is_property_staff(property_id));

-- ---------------------------------------------------------------------------
-- 7) meeting_attendees.property_id + index (if missing)
-- ---------------------------------------------------------------------------
ALTER TABLE public.meeting_attendees ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL;

UPDATE public.meeting_attendees a
SET property_id = m.property_id
FROM public.meetings m
WHERE a.meeting_id = m.id
  AND a.property_id IS NULL
  AND m.property_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS meeting_attendees_property_id_idx ON public.meeting_attendees(property_id);
