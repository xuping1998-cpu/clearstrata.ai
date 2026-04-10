/*
  # Create Residents Table and Deregistration Requests

  ## 1. New Tables

  ### residents
  Unified resident registry for the strata scheme. Augments auth profiles 
  with committee, fee, and status tracking.
    - `id` (uuid, primary key)
    - `user_id` (uuid, references profiles)
    - `unit_no` (text, unit number)
    - `name_en` (text, English name)
    - `name_zh` (text, Chinese name)
    - `email` (text)
    - `phone` (text)
    - `move_in_date` (date)
    - `language_pref` (text, en or zh)
    - `role` (text, owner/council/manager)
    - `status` (text, active/pending/deregistered)
    - `committee_role` (text, optional committee position)
    - `term_start` (date, committee term start)
    - `term_end` (date, committee term end)
    - `strata_fee_status` (text, current/overdue/prepaid)

  ### deregistration_requests
  Tracks owner deregistration/departure requests with council approval.
    - `id` (uuid, primary key)
    - `resident_id` (uuid, references residents)
    - `reason` (text)
    - `requested_date` (date)
    - `status` (text, pending/approved/rejected)
    - `reviewed_by` (uuid, the council member who reviewed)
    - `reviewed_at` (timestamptz)
    - `review_notes` (text)

  ## 2. Security
  - RLS on all tables
  - Owners: can only view/edit their own resident record
  - Council: can view all residents, manage deregistration
  - Manager: read-only on all residents

  ## 3. Indexes
  - residents(user_id), residents(unit_no), residents(status)
  - deregistration_requests(resident_id), deregistration_requests(status)
*/

CREATE TABLE IF NOT EXISTS residents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  unit_no text NOT NULL,
  name_en text NOT NULL,
  name_zh text,
  email text NOT NULL,
  phone text DEFAULT '',
  move_in_date date,
  language_pref text NOT NULL DEFAULT 'en' CHECK (language_pref IN ('en', 'zh')),
  role text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'council', 'manager')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'deregistered')),
  committee_role text CHECK (committee_role IN ('chairperson', 'secretary', 'treasurer', 'member') OR committee_role IS NULL),
  term_start date,
  term_end date,
  strata_fee_status text NOT NULL DEFAULT 'current' CHECK (strata_fee_status IN ('current', 'overdue', 'prepaid')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE residents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own resident record"
  ON residents FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('council', 'caretaker')
    )
  );

CREATE POLICY "Owners can insert own resident record"
  ON residents FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owners can update own resident record"
  ON residents FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );

CREATE POLICY "Council can delete residents"
  ON residents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );

CREATE TABLE IF NOT EXISTS deregistration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  reason text NOT NULL DEFAULT '',
  requested_date date NOT NULL DEFAULT CURRENT_DATE,
  effective_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE deregistration_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own deregistration requests"
  ON deregistration_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM residents
      WHERE residents.id = deregistration_requests.resident_id
      AND residents.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );

CREATE POLICY "Owners can create own deregistration request"
  ON deregistration_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM residents
      WHERE residents.id = resident_id
      AND residents.user_id = auth.uid()
    )
  );

CREATE POLICY "Council can update deregistration requests"
  ON deregistration_requests FOR UPDATE
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

CREATE INDEX IF NOT EXISTS idx_residents_user_id ON residents(user_id);
CREATE INDEX IF NOT EXISTS idx_residents_unit_no ON residents(unit_no);
CREATE INDEX IF NOT EXISTS idx_residents_status ON residents(status);
CREATE INDEX IF NOT EXISTS idx_residents_role ON residents(role);
CREATE INDEX IF NOT EXISTS idx_dereg_resident_id ON deregistration_requests(resident_id);
CREATE INDEX IF NOT EXISTS idx_dereg_status ON deregistration_requests(status);

CREATE OR REPLACE FUNCTION update_residents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_residents_updated_at_trigger ON residents;
CREATE TRIGGER update_residents_updated_at_trigger
  BEFORE UPDATE ON residents
  FOR EACH ROW
  EXECUTE FUNCTION update_residents_updated_at();

DROP TRIGGER IF EXISTS update_dereg_updated_at_trigger ON deregistration_requests;
CREATE TRIGGER update_dereg_updated_at_trigger
  BEFORE UPDATE ON deregistration_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_residents_updated_at();




