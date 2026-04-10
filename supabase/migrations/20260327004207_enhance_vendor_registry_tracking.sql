/*
  # Enhance vendor registry with source tracking and job history

  1. Modified Tables
    - `vendor_registry`
      - `source` (text) - How the vendor was added: 'manual', 'ai_search', 'auto_completion'
      - `last_job_id` (uuid) - Reference to the most recent completed job with this vendor
      - `last_job_category` (text) - Category of the last completed job
      - `last_job_date` (timestamptz) - Date of the last completed job
      - `last_job_price` (numeric) - Final price of the last completed job
      - `total_jobs_completed` (integer) - Number of jobs completed with this vendor
      - `website` (text) - Vendor website URL
      - `address` (text) - Vendor physical address

  2. Notes
    - These columns enable tracking how vendors were discovered (AI search vs manual entry)
    - Auto-completion tracking allows showing "previously worked with" badges
    - total_jobs_completed helps rank vendors by experience with this strata
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_registry' AND column_name = 'source'
  ) THEN
    ALTER TABLE vendor_registry ADD COLUMN source text NOT NULL DEFAULT 'manual';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_registry' AND column_name = 'last_job_id'
  ) THEN
    ALTER TABLE vendor_registry ADD COLUMN last_job_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_registry' AND column_name = 'last_job_category'
  ) THEN
    ALTER TABLE vendor_registry ADD COLUMN last_job_category text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_registry' AND column_name = 'last_job_date'
  ) THEN
    ALTER TABLE vendor_registry ADD COLUMN last_job_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_registry' AND column_name = 'last_job_price'
  ) THEN
    ALTER TABLE vendor_registry ADD COLUMN last_job_price numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_registry' AND column_name = 'total_jobs_completed'
  ) THEN
    ALTER TABLE vendor_registry ADD COLUMN total_jobs_completed integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_registry' AND column_name = 'website'
  ) THEN
    ALTER TABLE vendor_registry ADD COLUMN website text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_registry' AND column_name = 'address'
  ) THEN
    ALTER TABLE vendor_registry ADD COLUMN address text NOT NULL DEFAULT '';
  END IF;
END $$;

-- Also allow service_role to insert (for edge function auto-adding vendors)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vendor_registry' AND policyname = 'Service role can manage vendors'
  ) THEN
    CREATE POLICY "Service role can manage vendors"
      ON vendor_registry FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;




