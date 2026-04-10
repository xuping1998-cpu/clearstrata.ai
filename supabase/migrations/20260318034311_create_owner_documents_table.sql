/*
  # Create Owner Documents Table

  1. New Tables
    - `owner_documents`
      - `id` (uuid, primary key)
      - `name` (text) - Original filename
      - `description` (text) - Optional description
      - `file_path` (text) - Path in storage bucket
      - `file_size` (bigint) - File size in bytes
      - `uploaded_by` (uuid, foreign key to profiles)
      - `created_at` (timestamptz) - Upload timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `owner_documents` table
    - Add policy for all authenticated users to read documents
    - Add policy for council members to insert documents
    - Add policy for council members to delete documents

  3. Indexes
    - Index on uploaded_by for performance
    - Index on created_at for sorting
*/

CREATE TABLE IF NOT EXISTS owner_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  file_path text NOT NULL UNIQUE,
  file_size bigint NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE owner_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view documents"
  ON owner_documents
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Council can insert documents"
  ON owner_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );

CREATE POLICY "Council can delete documents"
  ON owner_documents
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );

CREATE INDEX IF NOT EXISTS owner_documents_uploaded_by_idx ON owner_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS owner_documents_created_at_idx ON owner_documents(created_at DESC);



