/*
  # Account activation: profiles.status + RLS for council/admin updates

  Fixes 400s when PATCH references missing columns, and ensures staff can
  UPDATE other users' profiles (status) for approve/reject activation.
*/

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

DO $m$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_status_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_status_check
      CHECK (status IN ('pending', 'active', 'suspended'));
  END IF;
END $m$;

DROP POLICY IF EXISTS "Council can update user roles" ON profiles;
DROP POLICY IF EXISTS "Council or admin can update user roles" ON profiles;

CREATE POLICY "Council or admin can update user roles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles AS actor
      WHERE actor.id = (SELECT auth.uid())
      AND actor.role IN ('council', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles AS actor
      WHERE actor.id = (SELECT auth.uid())
      AND actor.role IN ('council', 'admin')
    )
  );

DROP POLICY IF EXISTS "Owners can update own resident record" ON residents;

CREATE POLICY "Owners can update own resident record"
  ON residents FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('council', 'admin')
    )
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('council', 'admin')
    )
  );




