/*
  # Add Owner Info Delete Policy

  ## Summary
  Enables council members to delete owner information records.

  ## Changes
  1. Policies
    - Add DELETE policy for owner_info table allowing council members to remove records
    - This supports data cleanup and removal of invalid/outdated owner information

  ## Security
  - Only users with role='council' can delete owner_info records
  - Uses RLS to ensure proper authorization
  - Follows principle of least privilege
*/

-- Allow council members to delete owner info records
CREATE POLICY "Council can delete owner info"
  ON owner_info FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );




