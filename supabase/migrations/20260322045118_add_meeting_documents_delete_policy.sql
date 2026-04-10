/*
  # Add delete policy for meeting_documents

  1. Security Changes
    - Add DELETE policy on `meeting_documents` table
    - Only authenticated users with 'council' or 'manager' role in profiles can delete documents
    - Users can also delete documents they uploaded themselves

  2. Notes
    - Matches the existing INSERT policy pattern for council/manager access
    - Also allows the uploader to delete their own documents
*/

CREATE POLICY "Council or manager or uploader can delete documents"
  ON meeting_documents
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = uploaded_by
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('council', 'manager')
    )
  );




