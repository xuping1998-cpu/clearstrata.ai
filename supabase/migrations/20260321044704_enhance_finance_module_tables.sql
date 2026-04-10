/*
  # Enhance Finance Module Tables

  1. Modified Tables
    - `invoices` - Add missing columns for the new finance module
      - `category` (text) - Expense category for grouping
      - `file_name` (text) - Original uploaded file name
      - `hst_number` (text) - HST registration number extracted by AI

  2. New Tables
    - `monthly_summaries` - Monthly financial summary reports
      - `id` (uuid, primary key)
      - `month` (date, unique) - First day of the month
      - `total_income` (numeric) - Total strata fee income collected
      - `total_expenses` (numeric) - Total approved invoice expenses
      - `net_balance` (numeric) - Income minus expenses
      - `summary_text_en` (text) - AI-generated plain-language English summary
      - `summary_text_zh` (text) - AI-generated plain-language Chinese summary
      - `published` (boolean) - Whether published for owners to see
      - `published_by` (uuid) - Council member who published
      - `published_at` (timestamptz)

    - `special_levies` - Special levy tracking
      - `id` (uuid, primary key)
      - `title_en`, `title_zh` (text) - Bilingual titles
      - `description_en`, `description_zh` (text) - Bilingual descriptions
      - `target_amount` (numeric) - Total amount to collect
      - `collected_amount` (numeric) - Amount collected so far
      - `due_date` (date) - Collection due date
      - `status` (text) - active / completed / cancelled

  3. Security
    - RLS enabled on all new tables
    - Published summaries visible to all authenticated users
    - Unpublished summaries visible only to council
    - Special levies visible to all authenticated users
    - Only council can create/update summaries and levies
*/

-- Add missing columns to invoices table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'category'
  ) THEN
    ALTER TABLE invoices ADD COLUMN category text DEFAULT 'general';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'file_name'
  ) THEN
    ALTER TABLE invoices ADD COLUMN file_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'hst_number'
  ) THEN
    ALTER TABLE invoices ADD COLUMN hst_number text;
  END IF;
END $$;

-- Monthly summaries table
CREATE TABLE IF NOT EXISTS monthly_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month date NOT NULL UNIQUE,
  total_income numeric(12,2) DEFAULT 0,
  total_expenses numeric(12,2) DEFAULT 0,
  net_balance numeric(12,2) DEFAULT 0,
  summary_text_en text,
  summary_text_zh text,
  generated_by text DEFAULT 'auto',
  published boolean DEFAULT false,
  published_by uuid REFERENCES profiles(id),
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE monthly_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published summaries visible to all authenticated users"
  ON monthly_summaries FOR SELECT
  TO authenticated
  USING (
    published = true OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );

CREATE POLICY "Council can create summaries"
  ON monthly_summaries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );

CREATE POLICY "Council can update summaries"
  ON monthly_summaries FOR UPDATE
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

CREATE INDEX IF NOT EXISTS idx_monthly_summaries_month ON monthly_summaries(month);

-- Special levies table
CREATE TABLE IF NOT EXISTS special_levies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en text NOT NULL,
  title_zh text,
  description_en text,
  description_zh text,
  target_amount numeric(12,2) NOT NULL,
  collected_amount numeric(12,2) DEFAULT 0,
  due_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE special_levies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view special levies"
  ON special_levies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
    )
  );

CREATE POLICY "Council can create special levies"
  ON special_levies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );

CREATE POLICY "Council can update special levies"
  ON special_levies FOR UPDATE
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

CREATE INDEX IF NOT EXISTS idx_special_levies_status ON special_levies(status);




