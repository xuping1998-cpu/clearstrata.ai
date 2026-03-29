/*
  # Property Manager System

  1. Overview
    - Transform hiring system into comprehensive property manager management system
    - Includes staff management, daily tasks, owner maintenance requests with photos, and inspections

  2. New Tables
    - `property_managers` - Staff information and profiles
    - `owner_maintenance_requests` - Owner-submitted requests with photos
    - `daily_tasks` - Scheduled tasks (cleaning, lawn care, inspections, etc.)
    - `task_assignments` - Assign tasks to property managers
    - `task_photos` - Photo evidence of completed tasks
    - `key_copies` - Key copy tracking
    - `owner_onboarding` - New owner onboarding tracking

  3. Modified Tables
    - Drop old hiring tables (hiring_jobs, hiring_candidates)
    - Keep existing maintenance_requests table (for council-managed maintenance)
    - Add 'manager' role to user_role enum

  4. Security
    - Enable RLS on all new tables
    - Council members can manage staff
    - Property managers can view/update their assigned tasks
    - Owners can submit maintenance requests

  5. Task Types
    - Maintenance/Repairs
    - Cleaning
    - Lawn care (robot scheduling)
    - Key copying
    - Reception/Guest management
    - New owner onboarding
    - Regular inspections
*/

-- Drop old hiring tables
DROP TABLE IF EXISTS hiring_candidates CASCADE;
DROP TABLE IF EXISTS hiring_jobs CASCADE;

-- Add manager role to enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_role' AND e.enumlabel = 'manager') THEN
    ALTER TYPE user_role ADD VALUE 'manager';
  END IF;
END $$;

-- Property Managers (Staff)
CREATE TABLE IF NOT EXISTS property_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name_en text NOT NULL,
  full_name_zh text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  hire_date date DEFAULT CURRENT_DATE,
  avatar_url text,
  specialties text[] DEFAULT '{}',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Owner Maintenance Requests (with photo upload capability)
CREATE TABLE IF NOT EXISTS owner_maintenance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by uuid REFERENCES profiles(id) ON DELETE CASCADE,
  unit_number text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'pending',
  assigned_to uuid REFERENCES property_managers(id) ON DELETE SET NULL,
  photos text[] DEFAULT '{}',
  scheduled_date timestamptz,
  completed_date timestamptz,
  completion_notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Daily Tasks
CREATE TABLE IF NOT EXISTS daily_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  task_type text NOT NULL,
  location text NOT NULL,
  scheduled_date date NOT NULL,
  scheduled_time time,
  status text NOT NULL DEFAULT 'pending',
  priority text NOT NULL DEFAULT 'medium',
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Task Assignments
CREATE TABLE IF NOT EXISTS task_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES daily_tasks(id) ON DELETE CASCADE,
  manager_id uuid REFERENCES property_managers(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'assigned',
  notes text DEFAULT '',
  UNIQUE(task_id, manager_id)
);

-- Task Photos (Evidence)
CREATE TABLE IF NOT EXISTS task_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid REFERENCES task_assignments(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  caption text DEFAULT '',
  uploaded_at timestamptz DEFAULT now()
);

-- Key Copy Tracking
CREATE TABLE IF NOT EXISTS key_copies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_number text NOT NULL,
  key_type text NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  requested_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  requested_date date DEFAULT CURRENT_DATE,
  completed_date date,
  status text NOT NULL DEFAULT 'pending',
  assigned_to uuid REFERENCES property_managers(id) ON DELETE SET NULL,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Owner Onboarding
CREATE TABLE IF NOT EXISTS owner_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  unit_number text NOT NULL,
  move_in_date date NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  assigned_to uuid REFERENCES property_managers(id) ON DELETE SET NULL,
  welcome_package_delivered boolean DEFAULT false,
  keys_delivered boolean DEFAULT false,
  tour_completed boolean DEFAULT false,
  documents_signed boolean DEFAULT false,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE property_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_copies ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_onboarding ENABLE ROW LEVEL SECURITY;

-- Property Managers Policies
CREATE POLICY "Council can manage property managers"
  ON property_managers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );

CREATE POLICY "Property managers can view their own profile"
  ON property_managers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Everyone can view active property managers"
  ON property_managers FOR SELECT
  TO authenticated
  USING (status = 'active');

-- Owner Maintenance Requests Policies
CREATE POLICY "Owners can create maintenance requests"
  ON owner_maintenance_requests FOR INSERT
  TO authenticated
  WITH CHECK (submitted_by = auth.uid());

CREATE POLICY "Owners can view their own requests"
  ON owner_maintenance_requests FOR SELECT
  TO authenticated
  USING (submitted_by = auth.uid());

CREATE POLICY "Owners can update their pending requests"
  ON owner_maintenance_requests FOR UPDATE
  TO authenticated
  USING (submitted_by = auth.uid() AND status = 'pending')
  WITH CHECK (submitted_by = auth.uid());

CREATE POLICY "Council can manage all maintenance requests"
  ON owner_maintenance_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );

CREATE POLICY "Assigned managers can view and update their requests"
  ON owner_maintenance_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM property_managers
      WHERE property_managers.user_id = auth.uid()
      AND property_managers.id = owner_maintenance_requests.assigned_to
    )
  );

-- Daily Tasks Policies
CREATE POLICY "Council can manage daily tasks"
  ON daily_tasks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );

CREATE POLICY "Everyone can view daily tasks"
  ON daily_tasks FOR SELECT
  TO authenticated
  USING (true);

-- Task Assignments Policies
CREATE POLICY "Council can manage task assignments"
  ON task_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );

CREATE POLICY "Managers can view their assignments"
  ON task_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM property_managers
      WHERE property_managers.user_id = auth.uid()
      AND property_managers.id = task_assignments.manager_id
    )
  );

CREATE POLICY "Managers can update their assignments"
  ON task_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM property_managers
      WHERE property_managers.user_id = auth.uid()
      AND property_managers.id = task_assignments.manager_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM property_managers
      WHERE property_managers.user_id = auth.uid()
      AND property_managers.id = task_assignments.manager_id
    )
  );

-- Task Photos Policies
CREATE POLICY "Managers can upload task photos"
  ON task_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM task_assignments
      JOIN property_managers ON property_managers.id = task_assignments.manager_id
      WHERE task_assignments.id = task_photos.assignment_id
      AND property_managers.user_id = auth.uid()
    )
  );

CREATE POLICY "Everyone can view task photos"
  ON task_photos FOR SELECT
  TO authenticated
  USING (true);

-- Key Copies Policies
CREATE POLICY "Owners can request key copies"
  ON key_copies FOR INSERT
  TO authenticated
  WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Owners can view their key requests"
  ON key_copies FOR SELECT
  TO authenticated
  USING (requested_by = auth.uid());

CREATE POLICY "Council can manage key copies"
  ON key_copies FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );

CREATE POLICY "Managers can view and update assigned key requests"
  ON key_copies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM property_managers
      WHERE property_managers.user_id = auth.uid()
      AND property_managers.id = key_copies.assigned_to
    )
  );

CREATE POLICY "Managers can update their assigned key requests"
  ON key_copies FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM property_managers
      WHERE property_managers.user_id = auth.uid()
      AND property_managers.id = key_copies.assigned_to
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM property_managers
      WHERE property_managers.user_id = auth.uid()
      AND property_managers.id = key_copies.assigned_to
    )
  );

-- Owner Onboarding Policies
CREATE POLICY "Council can manage owner onboarding"
  ON owner_onboarding FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );

CREATE POLICY "Owners can view their onboarding"
  ON owner_onboarding FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Assigned managers can view and update onboarding"
  ON owner_onboarding FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM property_managers
      WHERE property_managers.user_id = auth.uid()
      AND property_managers.id = owner_onboarding.assigned_to
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_property_managers_user_id ON property_managers(user_id);
CREATE INDEX IF NOT EXISTS idx_property_managers_status ON property_managers(status);
CREATE INDEX IF NOT EXISTS idx_owner_maintenance_requests_submitted_by ON owner_maintenance_requests(submitted_by);
CREATE INDEX IF NOT EXISTS idx_owner_maintenance_requests_assigned_to ON owner_maintenance_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_owner_maintenance_requests_status ON owner_maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_scheduled_date ON daily_tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_status ON daily_tasks(status);
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_manager_id ON task_assignments(manager_id);
CREATE INDEX IF NOT EXISTS idx_key_copies_requested_by ON key_copies(requested_by);
CREATE INDEX IF NOT EXISTS idx_owner_onboarding_user_id ON owner_onboarding(user_id);
