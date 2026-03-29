/*
  # Add delete policy for compliance_docs

  1. Security Changes
    - Add DELETE policy on `compliance_docs` table
    - Only authenticated users who uploaded the document can delete it
*/

CREATE POLICY "Users can delete own compliance docs"
  ON compliance_docs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = uploaded_by);
