/*
  # Create Meeting Records Table

  1. New Tables
    - `meeting_records`
      - `id` (uuid, primary key) - Unique identifier for each meeting record
      - `title` (text) - Meeting title
      - `meeting_date` (timestamptz) - Date and time when the meeting took place
      - `location` (text) - Meeting location (physical or virtual)
      - `attendees` (text[]) - Array of attendee names
      - `agenda` (text) - Meeting agenda
      - `minutes` (text) - Detailed meeting minutes
      - `decisions` (text) - Key decisions made during the meeting
      - `action_items` (text) - Action items and follow-ups
      - `document_url` (text, optional) - URL to uploaded meeting document
      - `related_vote_id` (uuid, optional) - Link to related vote if applicable
      - `created_by` (uuid) - User who created the record
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `meeting_records` table
    - Add policy for authenticated users to view all meeting records
    - Add policy for authenticated users to create meeting records
    - Add policy for record creators to update their own records
    - Add policy for record creators to delete their own records

  3. Indexes
    - Add index on `meeting_date` for chronological queries
    - Add index on `created_by` for user-specific queries
    - Add index on `related_vote_id` for linking meetings to votes
*/

CREATE TABLE IF NOT EXISTS meeting_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  meeting_date timestamptz NOT NULL,
  location text NOT NULL,
  attendees text[] DEFAULT '{}',
  agenda text DEFAULT '',
  minutes text DEFAULT '',
  decisions text DEFAULT '',
  action_items text DEFAULT '',
  document_url text,
  related_vote_id uuid REFERENCES votes(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE meeting_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all meeting records"
  ON meeting_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create meeting records"
  ON meeting_records FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own meeting records"
  ON meeting_records FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own meeting records"
  ON meeting_records FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE INDEX IF NOT EXISTS idx_meeting_records_date ON meeting_records(meeting_date DESC);
CREATE INDEX IF NOT EXISTS idx_meeting_records_created_by ON meeting_records(created_by);
CREATE INDEX IF NOT EXISTS idx_meeting_records_related_vote ON meeting_records(related_vote_id);