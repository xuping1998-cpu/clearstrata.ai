/*
  # Admin role on profiles + RLS for role management

  1. Extend `user_role` enum with `admin` (platform / strata admin).
  2. Allow users with role `admin` (or `council`) to UPDATE any profile row
     (same as existing council-only policy, now includes admin).
*/

-- PG15+: safe if migration is re-applied
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';

DROP POLICY IF EXISTS "Council can update user roles" ON profiles;

CREATE POLICY "Council or admin can update user roles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('council', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('council', 'admin')
    )
  );




