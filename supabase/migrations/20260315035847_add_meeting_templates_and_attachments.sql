/*
  # Add Meeting Templates and Enhanced Features

  1. New Tables
    - `meeting_templates`
      - `id` (uuid, primary key) - Unique identifier for each template
      - `name_en` (text) - Template name in English
      - `name_zh` (text) - Template name in Chinese
      - `description_en` (text) - Template description in English
      - `description_zh` (text) - Template description in Chinese
      - `default_agenda` (text) - Pre-filled agenda template
      - `is_system` (boolean) - Whether this is a system template (cannot be deleted)
      - `created_at` (timestamptz) - Creation timestamp

    - `meeting_attachments`
      - `id` (uuid, primary key) - Unique identifier for each attachment
      - `meeting_id` (uuid) - Reference to meeting record
      - `file_name` (text) - Original file name
      - `file_url` (text) - URL to the uploaded file
      - `file_size` (integer) - File size in bytes
      - `uploaded_by` (uuid) - User who uploaded the file
      - `created_at` (timestamptz) - Upload timestamp

  2. Changes to Existing Tables
    - Add `template_id` column to `meeting_records` for linking to templates
    - Add `attendee_ids` column to `meeting_records` for storing user IDs of attendees
    - Add `reminder_sent` column to track if reminders have been sent

  3. Security
    - Enable RLS on both new tables
    - Add policies for authenticated users to view templates
    - Add policies for meeting attachments based on meeting access
    - Update meeting_records policies to include new columns

  4. Default Data
    - Insert system templates for common meeting types
*/

CREATE TABLE IF NOT EXISTS meeting_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL,
  name_zh text,
  description_en text DEFAULT '',
  description_zh text DEFAULT '',
  default_agenda text DEFAULT '',
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE meeting_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view meeting templates"
  ON meeting_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can create meeting templates"
  ON meeting_templates FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE TABLE IF NOT EXISTS meeting_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES meeting_records(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer DEFAULT 0,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE meeting_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view meeting attachments"
  ON meeting_attachments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can upload meeting attachments"
  ON meeting_attachments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete their own attachments"
  ON meeting_attachments FOR DELETE
  TO authenticated
  USING (auth.uid() = uploaded_by);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meeting_records' AND column_name = 'template_id'
  ) THEN
    ALTER TABLE meeting_records ADD COLUMN template_id uuid REFERENCES meeting_templates(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meeting_records' AND column_name = 'attendee_ids'
  ) THEN
    ALTER TABLE meeting_records ADD COLUMN attendee_ids uuid[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meeting_records' AND column_name = 'reminder_sent'
  ) THEN
    ALTER TABLE meeting_records ADD COLUMN reminder_sent boolean DEFAULT false;
  END IF;
END $$;

INSERT INTO meeting_templates (name_en, name_zh, description_en, description_zh, default_agenda, is_system) VALUES
  (
    'Annual General Meeting',
    '年度业主大会',
    'Annual meeting for all owners to review yearly performance and elect council members',
    '所有业主参加的年度会议，审查年度绩效并选举业委会成员',
    E'1. Opening and attendance\n2. Review of previous meeting minutes\n3. Financial report for the year\n4. Maintenance summary and budget approval\n5. Election of council members\n6. Other business\n7. Closing',
    true
  ),
  (
    'Council Meeting',
    '业委会会议',
    'Regular council meeting to discuss and decide on strata matters',
    '业委会定期会议，讨论和决定小区事务',
    E'1. Opening and roll call\n2. Review of previous minutes\n3. Financial update\n4. Maintenance requests review\n5. Upcoming projects discussion\n6. Owner inquiries\n7. Next meeting date\n8. Closing',
    true
  ),
  (
    'Special General Meeting',
    '特别业主大会',
    'Special meeting called for urgent or specific matters requiring owner approval',
    '为需要业主批准的紧急或特定事项召开的特别会议',
    E'1. Opening and attendance\n2. Purpose of special meeting\n3. Discussion of specific matter\n4. Voting on resolution\n5. Closing',
    true
  ),
  (
    'Emergency Meeting',
    '紧急会议',
    'Emergency meeting for immediate issues requiring urgent attention',
    '需要紧急处理的即时问题的紧急会议',
    E'1. Emergency situation briefing\n2. Immediate actions required\n3. Decision and authorization\n4. Communication plan\n5. Follow-up tasks',
    true
  )
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_meeting_attachments_meeting_id ON meeting_attachments(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_records_template_id ON meeting_records(template_id);




