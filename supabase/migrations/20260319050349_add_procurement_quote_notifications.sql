/*
  # Add Procurement Quote Notifications to Property Managers

  1. New Table
    - `procurement_quote_notifications` - Track quotes sent to property managers
      - `id` (uuid, primary key)
      - `quote_id` (uuid, foreign key to procurement_quotes)
      - `job_id` (uuid, foreign key to procurement_jobs)
      - `sent_to_manager_id` (uuid, foreign key to property_managers)
      - `sent_by` (uuid, foreign key to profiles)
      - `sent_at` (timestamp)
      - `message_en` (text, optional message in English)
      - `message_zh` (text, optional message in Chinese)
      - `read` (boolean, tracking if manager has read)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `procurement_quote_notifications` table
    - Council members can send notifications
    - Property managers can view notifications sent to them
    - Everyone can view notification history for transparency

  3. Purpose
    - Track which quotes have been shared with property managers
    - Maintain audit trail of communication
    - Allow property managers to stay informed about procurement activities
*/

CREATE TABLE IF NOT EXISTS procurement_quote_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES procurement_quotes(id) ON DELETE CASCADE,
  job_id uuid REFERENCES procurement_jobs(id) ON DELETE CASCADE NOT NULL,
  sent_to_manager_id uuid REFERENCES property_managers(id) ON DELETE CASCADE,
  sent_by uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  message_en text DEFAULT '',
  message_zh text DEFAULT '',
  read boolean DEFAULT false,
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE procurement_quote_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Council can send quote notifications"
  ON procurement_quote_notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );

CREATE POLICY "Everyone can view quote notifications"
  ON procurement_quote_notifications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Property managers can mark their notifications as read"
  ON procurement_quote_notifications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM property_managers
      WHERE property_managers.user_id = auth.uid()
      AND property_managers.id = procurement_quote_notifications.sent_to_manager_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM property_managers
      WHERE property_managers.user_id = auth.uid()
      AND property_managers.id = procurement_quote_notifications.sent_to_manager_id
    )
  );

CREATE INDEX IF NOT EXISTS idx_procurement_quote_notifications_job_id ON procurement_quote_notifications(job_id);
CREATE INDEX IF NOT EXISTS idx_procurement_quote_notifications_quote_id ON procurement_quote_notifications(quote_id);
CREATE INDEX IF NOT EXISTS idx_procurement_quote_notifications_manager_id ON procurement_quote_notifications(sent_to_manager_id);
CREATE INDEX IF NOT EXISTS idx_procurement_quote_notifications_sent_by ON procurement_quote_notifications(sent_by);




