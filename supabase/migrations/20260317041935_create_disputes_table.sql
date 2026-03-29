/*
  # Create Disputes Resolution System

  1. New Tables
    - `disputes`
      - `id` (uuid, primary key) - Unique dispute identifier
      - `reporter_id` (uuid, foreign key) - User who reported the dispute
      - `mediator_id` (uuid, foreign key, nullable) - Council member handling the dispute
      - `category` (text) - Type of dispute (neighbor, noise, parking, renovation, pet, common_area, other)
      - `title_en` (text) - Brief title in English
      - `title_zh` (text, nullable) - Brief title in Chinese
      - `description_en` (text) - Detailed description in English
      - `description_zh` (text, nullable) - Detailed description in Chinese
      - `parties_en` (text) - Parties involved in English
      - `parties_zh` (text, nullable) - Parties involved in Chinese
      - `status` (text) - Current status (pending, investigating, mediating, resolved, closed)
      - `resolution_en` (text, nullable) - Resolution agreement in English
      - `resolution_zh` (text, nullable) - Resolution agreement in Chinese
      - `mediator_notes_en` (text, nullable) - Mediator's notes in English
      - `mediator_notes_zh` (text, nullable) - Mediator's notes in Chinese
      - `resolved_at` (timestamptz, nullable) - When dispute was resolved
      - `created_at` (timestamptz) - When dispute was reported
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `disputes` table
    - Policy for authenticated users to view all disputes (transparency)
    - Policy for authenticated users to report disputes
    - Policy for users to update their own unreported disputes
    - Policy for council members to update any dispute (for mediation)
*/

CREATE TABLE IF NOT EXISTS disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mediator_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN ('neighbor', 'noise', 'parking', 'renovation', 'pet', 'common_area', 'other')),
  title_en text NOT NULL,
  title_zh text,
  description_en text NOT NULL,
  description_zh text,
  parties_en text NOT NULL,
  parties_zh text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'mediating', 'resolved', 'closed')),
  resolution_en text,
  resolution_zh text,
  mediator_notes_en text,
  mediator_notes_zh text,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view all disputes for transparency"
  ON disputes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can report disputes"
  ON disputes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can update their own pending disputes"
  ON disputes
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = reporter_id 
    AND status = 'pending'
  )
  WITH CHECK (
    auth.uid() = reporter_id 
    AND status = 'pending'
  );

CREATE POLICY "Council members can update any dispute"
  ON disputes
  FOR UPDATE
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

CREATE INDEX IF NOT EXISTS idx_disputes_reporter ON disputes(reporter_id);
CREATE INDEX IF NOT EXISTS idx_disputes_mediator ON disputes(mediator_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_category ON disputes(category);
CREATE INDEX IF NOT EXISTS idx_disputes_created ON disputes(created_at DESC);

CREATE OR REPLACE FUNCTION update_disputes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_disputes_updated_at_trigger'
  ) THEN
    CREATE TRIGGER update_disputes_updated_at_trigger
      BEFORE UPDATE ON disputes
      FOR EACH ROW
      EXECUTE FUNCTION update_disputes_updated_at();
  END IF;
END $$;
