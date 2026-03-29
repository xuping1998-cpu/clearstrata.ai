/*
  # Add delete policy for procurement_jobs

  1. Security
    - Add DELETE policy on `procurement_jobs` for council members
    - Only authenticated users with 'council' role can delete jobs
*/

CREATE POLICY "Council can delete procurement jobs"
  ON procurement_jobs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );
