/*
  # Create vendor registry system

  1. New Tables
    - `vendor_registry`
      - `id` (uuid, primary key)
      - `company_name` (text) - vendor company name
      - `contact_name` (text) - primary contact person
      - `email` (text) - contact email
      - `phone` (text) - contact phone
      - `service_categories` (text[]) - array of service categories the vendor provides
      - `description` (text) - brief description of services
      - `status` (text) - active/inactive
      - `registered_by` (uuid) - who registered this vendor
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `vendor_registry` table
    - Authenticated users can read all vendors
    - Council members can insert, update, delete vendors

  3. Notes
    - Service categories use a text array for flexibility
    - Standard categories: landscaping, cleaning, plumbing, electrical, hvac, roofing, painting, elevator, fire_safety, security, general_maintenance
*/

CREATE TABLE IF NOT EXISTS vendor_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  service_categories text[] NOT NULL DEFAULT '{}',
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  registered_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE vendor_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view vendors"
  ON vendor_registry FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Council members can insert vendors"
  ON vendor_registry FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );

CREATE POLICY "Council members can update vendors"
  ON vendor_registry FOR UPDATE
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

CREATE POLICY "Council members can delete vendors"
  ON vendor_registry FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );

CREATE INDEX IF NOT EXISTS idx_vendor_registry_categories ON vendor_registry USING GIN (service_categories);
CREATE INDEX IF NOT EXISTS idx_vendor_registry_status ON vendor_registry (status);
