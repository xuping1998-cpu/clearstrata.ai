/*
  # Add Phone and Unit Number Fields

  1. Changes to Tables
    - Add `phone` column to `owner_info` table (text, not null with default)
    - Add `unit_number` column to `profiles` table (text, not null with default)
  
  2. Security
    - No changes to RLS policies needed (existing policies cover new columns)
*/

-- Add phone to owner_info table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'owner_info' AND column_name = 'phone'
  ) THEN
    ALTER TABLE owner_info ADD COLUMN phone text DEFAULT '' NOT NULL;
  END IF;
END $$;

-- Add unit_number to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'unit_number'
  ) THEN
    ALTER TABLE profiles ADD COLUMN unit_number text DEFAULT '' NOT NULL;
  END IF;
END $$;



