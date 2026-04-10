/*
  # Fix Documents Storage Bucket INSERT Policy

  1. Issue
    - The INSERT policy for the documents storage bucket is missing the WITH CHECK condition
    - This causes uploads to fail silently

  2. Changes
    - Drop the existing "Authenticated users can upload documents" policy
    - Recreate it with the proper WITH CHECK condition to allow authenticated users to upload to the documents bucket

  3. Security
    - Only authenticated users can upload documents
    - The WITH CHECK ensures bucket_id = 'documents'
*/

DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;

CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documents');



