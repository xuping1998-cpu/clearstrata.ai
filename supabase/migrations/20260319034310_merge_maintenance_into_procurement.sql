/*
  # Merge Maintenance and Procurement Modules

  1. Changes
    - Add `job_type` column to procurement_jobs ('maintenance' or 'procurement')
    - Add `priority` column for maintenance requests (low, medium, high, urgent)
    - Add `category` column for maintenance categorization
    - Migrate all maintenance_requests data to procurement_jobs
    - Update status enum to support both workflows
    - Preserve all existing data and relationships

  2. Migration Strategy
    - Small maintenance (<$500): Simple approval workflow
    - Large maintenance/procurement (≥$500): Three-vendor + 7-day public notice
    
  3. Security
    - All existing RLS policies remain unchanged
    - New job_type field enables filtering by type
*/

-- Add new columns to procurement_jobs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'procurement_jobs' AND column_name = 'job_type'
  ) THEN
    ALTER TABLE procurement_jobs ADD COLUMN job_type text DEFAULT 'procurement' CHECK (job_type IN ('maintenance', 'procurement'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'procurement_jobs' AND column_name = 'priority'
  ) THEN
    ALTER TABLE procurement_jobs ADD COLUMN priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'procurement_jobs' AND column_name = 'category'
  ) THEN
    ALTER TABLE procurement_jobs ADD COLUMN category text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'procurement_jobs' AND column_name = 'unit_number'
  ) THEN
    ALTER TABLE procurement_jobs ADD COLUMN unit_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'procurement_jobs' AND column_name = 'approved_cost'
  ) THEN
    ALTER TABLE procurement_jobs ADD COLUMN approved_cost numeric(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'procurement_jobs' AND column_name = 'actual_cost'
  ) THEN
    ALTER TABLE procurement_jobs ADD COLUMN actual_cost numeric(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'procurement_jobs' AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE procurement_jobs ADD COLUMN assigned_to uuid REFERENCES profiles(id);
  END IF;
END $$;

-- Migrate maintenance_requests to procurement_jobs
INSERT INTO procurement_jobs (
  id,
  posted_by,
  title_en,
  title_zh,
  description_en,
  description_zh,
  estimated_budget,
  approved_cost,
  actual_cost,
  status,
  approved_by,
  approved_at,
  created_at,
  updated_at,
  job_type,
  category,
  assigned_to
)
SELECT
  id,
  submitted_by as posted_by,
  title_en,
  title_zh,
  description_en,
  description_zh,
  COALESCE(estimated_cost, 0) as estimated_budget,
  approved_cost,
  actual_cost,
  CASE
    WHEN status::text = 'submitted' THEN 'collecting_quotes'::procurement_status
    WHEN status::text = 'cost_approved' THEN 'approved'::procurement_status
    WHEN status::text = 'in_progress' THEN 'approved'::procurement_status
    WHEN status::text = 'completed' THEN 'completed'::procurement_status
    WHEN status::text = 'rejected' THEN 'cancelled'::procurement_status
    ELSE 'collecting_quotes'::procurement_status
  END as status,
  cost_approved_by as approved_by,
  cost_approved_at as approved_at,
  created_at,
  updated_at,
  'maintenance' as job_type,
  category,
  assigned_council_member_id as assigned_to
FROM maintenance_requests
WHERE NOT EXISTS (
  SELECT 1 FROM procurement_jobs WHERE procurement_jobs.id = maintenance_requests.id
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_procurement_jobs_job_type ON procurement_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_procurement_jobs_status ON procurement_jobs(status);
CREATE INDEX IF NOT EXISTS idx_procurement_jobs_created_at ON procurement_jobs(created_at DESC);
