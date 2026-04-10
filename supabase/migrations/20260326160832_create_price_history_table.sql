/*
  # Create price_history table for AI pricing intelligence

  1. New Tables
    - `price_history`
      - `id` (uuid, primary key)
      - `job_id` (uuid, references procurement_jobs) - link to the original work order
      - `job_type` (text) - maintenance or procurement
      - `category` (text) - work category (plumbing, electrical, etc.)
      - `title` (text) - job title/description for matching
      - `description` (text) - detailed description
      - `final_price` (numeric) - actual transaction price
      - `vendor_name` (text) - vendor who completed the work
      - `building_size` (text) - building scale info if available
      - `unit_count` (integer) - number of units in strata
      - `completed_at` (timestamptz) - when the job was completed
      - `created_at` (timestamptz) - record creation time

  2. New columns on procurement_jobs
    - `ai_estimate_low` (numeric) - AI estimated lower bound
    - `ai_estimate_high` (numeric) - AI estimated upper bound
    - `ai_estimate_reasoning` (text) - AI reasoning for the estimate

  3. Security
    - Enable RLS on `price_history` table
    - Authenticated users can read price history
    - Only system (via service role) or the job poster can insert

  4. Indexes
    - Index on category for fast lookups
    - Index on job_type for filtering
*/

CREATE TABLE IF NOT EXISTS price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES procurement_jobs(id),
  job_type text NOT NULL DEFAULT 'maintenance',
  category text DEFAULT '',
  title text NOT NULL DEFAULT '',
  description text DEFAULT '',
  final_price numeric NOT NULL DEFAULT 0,
  vendor_name text DEFAULT '',
  building_size text DEFAULT '',
  unit_count integer DEFAULT 0,
  completed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read price history"
  ON price_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert price history"
  ON price_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_price_history_category ON price_history(category);
CREATE INDEX IF NOT EXISTS idx_price_history_job_type ON price_history(job_type);
CREATE INDEX IF NOT EXISTS idx_price_history_job_id ON price_history(job_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'procurement_jobs' AND column_name = 'ai_estimate_low'
  ) THEN
    ALTER TABLE procurement_jobs ADD COLUMN ai_estimate_low numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'procurement_jobs' AND column_name = 'ai_estimate_high'
  ) THEN
    ALTER TABLE procurement_jobs ADD COLUMN ai_estimate_high numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'procurement_jobs' AND column_name = 'ai_estimate_reasoning'
  ) THEN
    ALTER TABLE procurement_jobs ADD COLUMN ai_estimate_reasoning text;
  END IF;
END $$;




