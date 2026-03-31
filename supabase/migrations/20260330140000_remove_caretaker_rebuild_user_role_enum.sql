/*
  # Remove `caretaker` from `user_role` enum

  1. Data: former caretakers become `manager` (building / property staff).
  2. Replace enum with exactly: owner, council, admin, manager.
  3. RLS: replace `caretaker` checks with council, manager, and admin where appropriate.
*/

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
-- 3. RLS: maintenance + residents (live policies still reference caretaker)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Council and caretaker can update maintenance requests" ON maintenance_requests;
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
