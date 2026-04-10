/*
  # Add Missing Policies and Tables

  ## Summary
  Completes the database security setup by adding missing RLS policies and tables.

  ## Changes Made

  ### 1. Security Enhancements
  - Add DELETE policy for notifications table (users can delete their own notifications)
  - Ensure all tables have comprehensive CRUD policies
  
  ### 2. New Table: maintenance_updates
  - Communication thread for maintenance requests
  - Columns:
    - id (uuid, primary key)
    - request_id (uuid, references maintenance_requests)
    - user_id (uuid, references profiles)
    - message_en (text, required)
    - message_zh (text, optional)
    - created_at (timestamptz, default now)
  
  ### 3. Enhanced Maintenance Requests
  - Add missing columns for workflow tracking:
    - category (public_area/private_unit)
    - assigned_council_member_id (uuid)
    - payment_method (strata_pays/owner_pays)
    - actual_cost (numeric)
    - payment_confirmed_by (uuid)
    - payment_confirmed_at (timestamptz)
  
  ## Security Notes
  - All DELETE operations restricted to owner or council role
  - Maintenance updates visible to request submitter, council, and caretaker
  - Notifications can only be deleted by their owner
  - All policies follow principle of least privilege
*/

-- Add DELETE policy for notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create maintenance_updates table if it doesn't exist
CREATE TABLE IF NOT EXISTS maintenance_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES maintenance_requests(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  message_en text NOT NULL,
  message_zh text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE maintenance_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view updates for their requests"
  ON maintenance_updates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM maintenance_requests
      WHERE maintenance_requests.id = maintenance_updates.request_id
      AND (
        maintenance_requests.submitted_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('council', 'caretaker')
        )
      )
    )
  );

CREATE POLICY "Users can add updates to requests they can view"
  ON maintenance_updates FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM maintenance_requests
      WHERE maintenance_requests.id = maintenance_updates.request_id
      AND (
        maintenance_requests.submitted_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('council', 'caretaker')
        )
      )
    )
  );

-- Add missing columns to maintenance_requests if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_requests' AND column_name = 'category'
  ) THEN
    ALTER TABLE maintenance_requests 
    ADD COLUMN category text DEFAULT 'public_area' CHECK (category IN ('public_area', 'private_unit'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_requests' AND column_name = 'assigned_council_member_id'
  ) THEN
    ALTER TABLE maintenance_requests 
    ADD COLUMN assigned_council_member_id uuid REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_requests' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE maintenance_requests 
    ADD COLUMN payment_method text CHECK (payment_method IN ('strata_pays', 'owner_pays'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_requests' AND column_name = 'actual_cost'
  ) THEN
    ALTER TABLE maintenance_requests 
    ADD COLUMN actual_cost numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_requests' AND column_name = 'payment_confirmed_by'
  ) THEN
    ALTER TABLE maintenance_requests 
    ADD COLUMN payment_confirmed_by uuid REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_requests' AND column_name = 'payment_confirmed_at'
  ) THEN
    ALTER TABLE maintenance_requests 
    ADD COLUMN payment_confirmed_at timestamptz;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_maintenance_updates_request_id ON maintenance_updates(request_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_updates_user_id ON maintenance_updates(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_assigned_council ON maintenance_requests(assigned_council_member_id);




