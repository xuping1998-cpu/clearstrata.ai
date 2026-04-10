/*
  # Remove `caretaker` from `user_role` enum

  1. Snapshot & DROP policies that reference `profiles.role` (blocks ALTER TYPE),
     plus ALL policies on `disputes` (per product requirement).
  2. Data: former caretakers become `manager`.
  3. Rebuild enum: owner, council, admin, manager.
  4. Recreate snapped policies (replace caretaker ?manager in expressions).
*/

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Snapshot policies we must drop (depend on profiles.role or whole disputes)
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE _rls_snap (
  id serial PRIMARY KEY,
  schemaname text NOT NULL,
  tablename text NOT NULL,
  policyname text NOT NULL,
  polcmd text NOT NULL,
  permissive boolean NOT NULL,
  polroles oid[] NOT NULL DEFAULT '{}'::oid[],
  qual text,
  with_check text
) ON COMMIT DROP;

INSERT INTO _rls_snap (schemaname, tablename, policyname, polcmd, permissive, polroles, qual, with_check)
SELECT
  n.nspname,
  c.relname,
  pol.polname,
  pol.polcmd::text,
  pol.polpermissive,
  COALESCE(pol.polroles, '{}'::oid[]),
  pg_get_expr(pol.polqual, pol.polrelid),
  pg_get_expr(pol.polwithcheck, pol.polrelid)
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND (
    c.relname = 'disputes'
    OR (
      COALESCE(pg_get_expr(pol.polqual, pol.polrelid), '')
      || ' '
      || COALESCE(pg_get_expr(pol.polwithcheck, pol.polrelid), '')
    ) ILIKE '%profiles%role%'
    OR (
      (
        COALESCE(pg_get_expr(pol.polqual, pol.polrelid), '')
        || ' '
        || COALESCE(pg_get_expr(pol.polwithcheck, pol.polrelid), '')
      ) ILIKE '%FROM profiles%'
      AND (
        COALESCE(pg_get_expr(pol.polqual, pol.polrelid), '')
        || ' '
        || COALESCE(pg_get_expr(pol.polwithcheck, pol.polrelid), '')
      ) ~ E'\\mrole\\M'
    )
    OR (
      c.relname = 'profiles'
      AND (
        COALESCE(pg_get_expr(pol.polqual, pol.polrelid), '')
        || ' '
        || COALESCE(pg_get_expr(pol.polwithcheck, pol.polrelid), '')
      ) ~ E'\\mrole\\M'
    )
  );

-- DROP snapped policies (idempotent per policy name)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT DISTINCT schemaname, tablename, policyname
    FROM _rls_snap
    ORDER BY tablename, policyname
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      r.policyname,
      r.schemaname,
      r.tablename
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 1. Migrate data off caretaker
-- ---------------------------------------------------------------------------
UPDATE profiles SET role = 'manager'::user_role WHERE role::text = 'caretaker';

-- ---------------------------------------------------------------------------
-- 2. Rebuild enum (PostgreSQL cannot drop an enum label in use)
-- ---------------------------------------------------------------------------
CREATE TYPE user_role_new AS ENUM ('owner', 'council', 'admin', 'manager');

ALTER TABLE profiles
  ALTER COLUMN role DROP DEFAULT,
  ALTER COLUMN role TYPE user_role_new
    USING (
      CASE role::text
        WHEN 'owner' THEN 'owner'::user_role_new
        WHEN 'council' THEN 'council'::user_role_new
        WHEN 'admin' THEN 'admin'::user_role_new
        WHEN 'manager' THEN 'manager'::user_role_new
        ELSE 'owner'::user_role_new
      END
    );

DROP TYPE user_role;
ALTER TYPE user_role_new RENAME TO user_role;

ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'owner'::user_role;

-- ---------------------------------------------------------------------------
-- 3. Recreate policies from snapshot (caretaker ?manager in SQL text)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
  cmd_txt text;
  ptype text;
  qual_c text;
  chk_c text;
  role_txt text;
  parts text;
BEGIN
  FOR r IN SELECT * FROM _rls_snap ORDER BY id
  LOOP
    cmd_txt := CASE btrim(r.polcmd)
      WHEN 'r' THEN 'SELECT'
      WHEN 'a' THEN 'INSERT'
      WHEN 'w' THEN 'UPDATE'
      WHEN 'd' THEN 'DELETE'
      WHEN '*' THEN 'ALL'
      ELSE 'SELECT'
    END;

    ptype := CASE WHEN r.permissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END;

    qual_c := r.qual;
    chk_c := r.with_check;

    IF qual_c IS NOT NULL THEN
      qual_c := replace(qual_c, '''caretaker''::user_role', '''manager''::user_role');
      qual_c := replace(qual_c, '''caretaker''', '''manager''');
    END IF;

    IF chk_c IS NOT NULL THEN
      chk_c := replace(chk_c, '''caretaker''::user_role', '''manager''::user_role');
      chk_c := replace(chk_c, '''caretaker''', '''manager''');
    END IF;

    parts := format(
      'CREATE POLICY %I ON %I.%I AS %s FOR %s',
      r.policyname,
      r.schemaname,
      r.tablename,
      ptype,
      cmd_txt
    );

    IF r.polroles IS NOT NULL AND cardinality(r.polroles) > 0 THEN
      SELECT string_agg(quote_ident(rolname), ', ' ORDER BY rolname)
      INTO role_txt
      FROM pg_roles
      WHERE oid = ANY (r.polroles);

      IF role_txt IS NOT NULL AND role_txt <> '' THEN
        parts := parts || ' TO ' || role_txt;
      END IF;
    END IF;

    IF qual_c IS NOT NULL AND btrim(qual_c) <> '' THEN
      parts := parts || ' USING (' || qual_c || ')';
    END IF;

    IF chk_c IS NOT NULL AND btrim(chk_c) <> '' THEN
      parts := parts || ' WITH CHECK (' || chk_c || ')';
    END IF;

    EXECUTE parts;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Canonical policies (admin + manager + council; caretaker names removed)
--    Re-apply after snapshot so lists match app expectations.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Council and caretaker can update maintenance requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Council manager admin can update maintenance requests" ON maintenance_requests;
CREATE POLICY "Council manager admin can update maintenance requests"
  ON maintenance_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('council', 'manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('council', 'manager', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can view updates for their requests" ON maintenance_updates;
CREATE POLICY "Users can view updates for their requests"
  ON maintenance_updates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM maintenance_requests
      WHERE id = maintenance_updates.request_id
      AND (
        submitted_by = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE id = (SELECT auth.uid())
          AND role IN ('council', 'manager', 'admin')
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can add updates to requests they can view" ON maintenance_updates;
CREATE POLICY "Users can add updates to requests they can view"
  ON maintenance_updates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM maintenance_requests
      WHERE id = maintenance_updates.request_id
      AND (
        submitted_by = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE id = (SELECT auth.uid())
          AND role IN ('council', 'manager', 'admin')
        )
      )
    )
  );

DROP POLICY IF EXISTS "Owners can view own resident record" ON residents;
CREATE POLICY "Owners can view own resident record"
  ON residents FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('council', 'manager', 'admin')
    )
  );

DROP POLICY IF EXISTS "Council members can update any dispute" ON disputes;
CREATE POLICY "Council members can update any dispute"
  ON disputes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('council', 'manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('council', 'manager', 'admin')
    )
  );

DROP POLICY IF EXISTS "Dispute parties can view messages" ON dispute_messages;
CREATE POLICY "Dispute parties can view messages"
  ON dispute_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM disputes
      WHERE disputes.id = dispute_messages.dispute_id
      AND (
        disputes.reporter_id = auth.uid()
        OR disputes.respondent_id = auth.uid()
        OR disputes.mediator_id = auth.uid()
        OR disputes.assigned_manager_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('council', 'manager', 'admin')
        )
      )
    )
    AND (NOT is_internal_note OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('council', 'manager', 'admin')
    ))
  );

DROP POLICY IF EXISTS "Dispute parties can send messages" ON dispute_messages;
CREATE POLICY "Dispute parties can send messages"
  ON dispute_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM disputes
      WHERE disputes.id = dispute_messages.dispute_id
      AND (
        disputes.reporter_id = auth.uid()
        OR disputes.respondent_id = auth.uid()
        OR disputes.mediator_id = auth.uid()
        OR disputes.assigned_manager_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('council', 'manager', 'admin')
        )
      )
    )
  );

DROP POLICY IF EXISTS "Dispute parties can view evidence" ON dispute_evidence;
CREATE POLICY "Dispute parties can view evidence"
  ON dispute_evidence FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM disputes
      WHERE disputes.id = dispute_evidence.dispute_id
      AND (
        disputes.reporter_id = auth.uid()
        OR disputes.respondent_id = auth.uid()
        OR disputes.mediator_id = auth.uid()
        OR disputes.assigned_manager_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('council', 'manager', 'admin')
        )
      )
    )
  );

DROP POLICY IF EXISTS "Dispute parties can view timeline" ON dispute_timeline;
CREATE POLICY "Dispute parties can view timeline"
  ON dispute_timeline FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM disputes
      WHERE disputes.id = dispute_timeline.dispute_id
      AND (
        disputes.reporter_id = auth.uid()
        OR disputes.respondent_id = auth.uid()
        OR disputes.mediator_id = auth.uid()
        OR disputes.assigned_manager_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('council', 'manager', 'admin')
        )
      )
    )
  );

COMMIT;




