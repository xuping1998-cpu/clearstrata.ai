/*
  # Allow All Users to Upload Documents

  1. Changes
    - Drop the existing "Council can insert documents" policy
    - Create a new policy that allows all authenticated users to insert documents
    - This enables all logged-in users to upload documents to the owner_documents table

  2. Security
    - Only authenticated users can upload documents
    - Users must be logged in to upload
    - The uploaded_by field will be set to their user ID
*/

DROP POLICY IF EXISTS "Council can insert documents" ON owner_documents;

CREATE POLICY "Authenticated users can insert documents"
  ON owner_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);
