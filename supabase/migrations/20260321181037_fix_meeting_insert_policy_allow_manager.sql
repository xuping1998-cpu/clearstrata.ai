/*
  # Fix meeting creation policy

  1. Changes
    - Update the INSERT policy on `meetings` to also allow users with 'manager' role
    - This fixes silent failures where managers could not create meetings

  2. Security
    - Only 'council' and 'manager' roles can create meetings
    - Policy still requires authentication via auth.uid()
*/

DO $$ BEGIN
  DROP POLICY IF EXISTS "Council can create meetings" ON meetings;
END $$;

CREATE POLICY "Council or manager can create meetings"
  ON meetings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('council', 'manager')
    )
  );
