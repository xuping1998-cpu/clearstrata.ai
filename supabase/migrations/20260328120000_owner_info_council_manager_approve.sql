/*
  # Allow property managers to view and approve owner_info (with council)

  1. SELECT: extend "all rows" visibility to role IN ('council', 'manager')
  2. UPDATE (approve): same extension for approval policy
*/

DROP POLICY IF EXISTS "Council can view all owner info" ON owner_info;

CREATE POLICY "Council or manager can view all owner info"
  ON owner_info FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('council', 'manager')
    )
  );

DROP POLICY IF EXISTS "Council can approve owner info updates" ON owner_info;

CREATE POLICY "Council or manager can approve owner info updates"
  ON owner_info FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('council', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('council', 'manager')
    )
  );




