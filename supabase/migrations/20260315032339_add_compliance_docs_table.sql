/*
  # Add Compliance Documents Table

  1. New Tables
    - `compliance_docs`
      - `id` (uuid, primary key)
      - `title_en` (text) - Document title in English
      - `title_zh` (text) - Document title in Chinese
      - `category` (text) - Category: legal, insurance, license, contract
      - `description_en` (text) - Description in English
      - `description_zh` (text) - Description in Chinese
      - `expiry_date` (date) - Expiration date for the document
      - `status` (text) - Document status: active, expired, pending
      - `document_url` (text) - URL to the document file
      - `uploaded_by` (uuid) - Reference to user who uploaded
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `compliance_docs` table
    - Add policy for authenticated users to view documents
    - Add policy for council members to create and manage documents

  3. Indexes
    - Index on category for filtering
    - Index on expiry_date for sorting
    - Index on uploaded_by for user tracking
*/

CREATE TABLE IF NOT EXISTS compliance_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en text NOT NULL,
  title_zh text,
  category text NOT NULL CHECK (category IN ('legal', 'insurance', 'license', 'contract')),
  description_en text,
  description_zh text,
  expiry_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'pending')),
  document_url text,
  uploaded_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE compliance_docs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view compliance docs"
  ON compliance_docs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Council members can insert compliance docs"
  ON compliance_docs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );

CREATE POLICY "Council members can update compliance docs"
  ON compliance_docs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );

CREATE POLICY "Council members can delete compliance docs"
  ON compliance_docs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );

CREATE INDEX IF NOT EXISTS idx_compliance_docs_category ON compliance_docs(category);
CREATE INDEX IF NOT EXISTS idx_compliance_docs_expiry_date ON compliance_docs(expiry_date);
CREATE INDEX IF NOT EXISTS idx_compliance_docs_uploaded_by ON compliance_docs(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_compliance_docs_status ON compliance_docs(status);




