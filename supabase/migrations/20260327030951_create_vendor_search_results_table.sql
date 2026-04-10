/*
  # Create vendor search results table

  1. New Tables
    - `vendor_search_results`
      - `id` (uuid, primary key)
      - `job_id` (uuid, foreign key to procurement_jobs)
      - `company_name` (text)
      - `phone` (text)
      - `website` (text)
      - `address` (text)
      - `description_en` (text)
      - `description_zh` (text)
      - `price_reference` (text)
      - `searched_at` (timestamptz, when the search was performed)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `vendor_search_results` table
    - Add SELECT policy for authenticated users
    - Add INSERT policy for authenticated council members
    - Add DELETE policy for authenticated council members

  3. Notes
    - All vendors from a single search share the same `searched_at` timestamp
    - On re-search, old results are deleted and replaced with new ones
*/

CREATE TABLE IF NOT EXISTS vendor_search_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES procurement_jobs(id) ON DELETE CASCADE,
  company_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  description_en text NOT NULL DEFAULT '',
  description_zh text NOT NULL DEFAULT '',
  price_reference text NOT NULL DEFAULT '',
  searched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_search_results_job_id ON vendor_search_results(job_id);

ALTER TABLE vendor_search_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view vendor search results"
  ON vendor_search_results
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
    )
  );

CREATE POLICY "Council members can insert vendor search results"
  ON vendor_search_results
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );

CREATE POLICY "Council members can delete vendor search results"
  ON vendor_search_results
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );




