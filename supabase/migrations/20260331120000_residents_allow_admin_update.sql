/*
  # Allow admin to update/delete residents (account activation on User Management tab)

  Extends existing council-only policies to include `admin` alongside `council`.
*/

DROP POLICY IF EXISTS "Owners can update own resident record" ON residents;
CREATE POLICY "Owners can update own resident record"
  ON residents FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('council', 'admin')
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('council', 'admin')
    )
  );

DROP POLICY IF EXISTS "Council can delete residents" ON residents;
CREATE POLICY "Council or admin can delete residents"
  ON residents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('council', 'admin')
    )
  );




