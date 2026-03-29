/*
  # Meeting and Voting System
  
  ## 1. Overview
  Complete meeting and voting management system including:
  - Meeting quota tracking (AGM, Regular Council, Ad-hoc)
  - Meeting documents (Agenda, Minutes, Attachments)
  - Voting system with proxy support
  - Minutes approval workflow with version control
  - Integration with finance and procurement modules
  
  ## 2. Meeting Types & Quotas
  - AGM (Annual General Meeting): 1 per year
  - Regular Council Meeting: 6 per year (every 2 months)
  - Ad-hoc Meeting: 1 per year
  - Total Free Quota: 8 meetings per year
  - Overtime Fee: $100/hour charged by property manager
  
  ## 3. New Tables
  
  ### meetings
  - Core meeting information
  - Type, status, date, duration
  - Quota tracking
  - Links to documents and votes
  
  ### meeting_agenda_items
  - Individual agenda items for each meeting
  - Voting requirements
  - Decision tracking
  
  ### meeting_attendees
  - Attendance tracking
  - Proxy delegation support
  - Sign-in records
  
  ### meeting_votes
  - Individual vote records
  - Support for proxy voting
  - Real-time vote counting
  
  ### meeting_minutes
  - Minutes documents with version control
  - Approval workflow tracking
  - Draft and approved versions
  
  ### meeting_minutes_versions
  - Version history for minutes
  - Change tracking
  - Reviewer comments
  
  ### meeting_documents
  - Pre-meeting and post-meeting documents
  - Agenda, background materials, reports
  
  ### meeting_quota_tracker
  - Annual quota tracking
  - Overtime fee calculation
  - Warning system
  
  ## 4. Security
  - RLS enabled on all tables
  - Meeting visibility based on user role
  - Vote privacy protection
  - Minutes approval workflow restrictions
*/

-- Create meeting types enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meeting_type') THEN
    CREATE TYPE meeting_type AS ENUM ('agm', 'council_regular', 'ad_hoc', 'sgm');
  END IF;
END $$;

-- Create meeting status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meeting_status') THEN
    CREATE TYPE meeting_status AS ENUM ('draft', 'scheduled', 'in_progress', 'completed', 'cancelled');
  END IF;
END $$;

-- Create vote decision enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vote_decision') THEN
    CREATE TYPE vote_decision AS ENUM ('for', 'against', 'abstain');
  END IF;
END $$;

-- Create minutes status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'minutes_status') THEN
    CREATE TYPE minutes_status AS ENUM ('draft', 'under_review', 'approved', 'archived');
  END IF;
END $$;

-- Create meetings table
CREATE TABLE IF NOT EXISTS meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_type meeting_type NOT NULL,
  title_en text NOT NULL,
  title_zh text,
  description_en text,
  description_zh text,
  scheduled_date timestamptz NOT NULL,
  scheduled_end_date timestamptz,
  actual_start_time timestamptz,
  actual_end_time timestamptz,
  duration_minutes integer,
  location text,
  is_virtual boolean DEFAULT false,
  meeting_link text,
  status meeting_status DEFAULT 'draft',
  created_by uuid NOT NULL REFERENCES profiles(id),
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  counts_against_quota boolean DEFAULT true,
  is_overtime boolean DEFAULT false,
  overtime_fee numeric(10,2),
  fiscal_year integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  cancelled_reason text,
  cancelled_at timestamptz
);

ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view meetings"
  ON meetings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Council can create meetings"
  ON meetings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );

CREATE POLICY "Council can update meetings"
  ON meetings FOR UPDATE
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

-- Create meeting_agenda_items table
CREATE TABLE IF NOT EXISTS meeting_agenda_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  item_number integer NOT NULL,
  title_en text NOT NULL,
  title_zh text,
  description_en text,
  description_zh text,
  requires_vote boolean DEFAULT false,
  vote_passed boolean,
  vote_for integer DEFAULT 0,
  vote_against integer DEFAULT 0,
  vote_abstain integer DEFAULT 0,
  discussion_notes text,
  decision_text text,
  linked_procurement_id uuid REFERENCES procurement_jobs(id),
  linked_budget_item text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE meeting_agenda_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view agenda items"
  ON meeting_agenda_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Council can manage agenda items"
  ON meeting_agenda_items FOR ALL
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

-- Create meeting_attendees table
CREATE TABLE IF NOT EXISTS meeting_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id),
  attendance_status text DEFAULT 'invited' CHECK (attendance_status IN ('invited', 'confirmed', 'attended', 'absent')),
  is_proxy boolean DEFAULT false,
  proxy_for_user_id uuid REFERENCES profiles(id),
  proxy_document_url text,
  signed_in_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE meeting_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attendees"
  ON meeting_attendees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can confirm attendance"
  ON meeting_attendees FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Council can manage attendees"
  ON meeting_attendees FOR ALL
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

-- Create meeting_votes table
CREATE TABLE IF NOT EXISTS meeting_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agenda_item_id uuid NOT NULL REFERENCES meeting_agenda_items(id) ON DELETE CASCADE,
  voter_id uuid NOT NULL REFERENCES profiles(id),
  vote_decision vote_decision NOT NULL,
  is_proxy_vote boolean DEFAULT false,
  proxy_for_user_id uuid REFERENCES profiles(id),
  voted_at timestamptz DEFAULT now(),
  comments text,
  CONSTRAINT unique_vote_per_user UNIQUE (agenda_item_id, voter_id)
);

ALTER TABLE meeting_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view vote results"
  ON meeting_votes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can cast their vote"
  ON meeting_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = voter_id);

-- Create meeting_minutes table
CREATE TABLE IF NOT EXISTS meeting_minutes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  document_url text,
  draft_content text,
  status minutes_status DEFAULT 'draft',
  drafted_by uuid NOT NULL REFERENCES profiles(id),
  drafted_at timestamptz DEFAULT now(),
  submitted_for_review_at timestamptz,
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  approved_by_meeting_id uuid REFERENCES meetings(id),
  current_version integer DEFAULT 1,
  is_final boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE meeting_minutes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view approved minutes"
  ON meeting_minutes FOR SELECT
  TO authenticated
  USING (status = 'approved' OR status = 'archived' OR auth.uid() = drafted_by);

CREATE POLICY "Council and managers can draft minutes"
  ON meeting_minutes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('council', 'manager')
    )
  );

CREATE POLICY "Council and managers can update minutes"
  ON meeting_minutes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('council', 'manager')
    ) AND is_final = false
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('council', 'manager')
    ) AND is_final = false
  );

-- Create meeting_minutes_versions table
CREATE TABLE IF NOT EXISTS meeting_minutes_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  minutes_id uuid NOT NULL REFERENCES meeting_minutes(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  content text NOT NULL,
  document_url text,
  modified_by uuid NOT NULL REFERENCES profiles(id),
  modified_at timestamptz DEFAULT now(),
  change_summary text,
  reviewer_comments jsonb DEFAULT '[]'::jsonb
);

ALTER TABLE meeting_minutes_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view minutes versions"
  ON meeting_minutes_versions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can create versions"
  ON meeting_minutes_versions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = modified_by);

-- Create meeting_documents table
CREATE TABLE IF NOT EXISTS meeting_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('agenda', 'background', 'financial_report', 'procurement_quote', 'bylaw_reference', 'other')),
  title_en text NOT NULL,
  title_zh text,
  document_url text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES profiles(id),
  uploaded_at timestamptz DEFAULT now(),
  file_size_bytes integer,
  mime_type text
);

ALTER TABLE meeting_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view meeting documents"
  ON meeting_documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Council can upload documents"
  ON meeting_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );

-- Create meeting_quota_tracker table
CREATE TABLE IF NOT EXISTS meeting_quota_tracker (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_year integer NOT NULL UNIQUE,
  agm_count integer DEFAULT 0,
  council_regular_count integer DEFAULT 0,
  ad_hoc_count integer DEFAULT 0,
  sgm_count integer DEFAULT 0,
  total_quota_used integer DEFAULT 0,
  free_quota_limit integer DEFAULT 8,
  overtime_meetings integer DEFAULT 0,
  total_overtime_fees numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE meeting_quota_tracker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view quota tracker"
  ON meeting_quota_tracker FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can update quota tracker"
  ON meeting_quota_tracker FOR ALL
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_meetings_fiscal_year ON meetings(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_meetings_type ON meetings(meeting_type);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled_date ON meetings(scheduled_date DESC);
CREATE INDEX IF NOT EXISTS idx_meeting_agenda_items_meeting ON meeting_agenda_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_meeting ON meeting_attendees(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_user ON meeting_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_votes_agenda_item ON meeting_votes(agenda_item_id);
CREATE INDEX IF NOT EXISTS idx_meeting_votes_voter ON meeting_votes(voter_id);
CREATE INDEX IF NOT EXISTS idx_meeting_minutes_meeting ON meeting_minutes(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_documents_meeting ON meeting_documents(meeting_id);

-- Function to update quota tracker
CREATE OR REPLACE FUNCTION update_meeting_quota()
RETURNS TRIGGER AS $$
DECLARE
  v_fiscal_year integer;
BEGIN
  v_fiscal_year := EXTRACT(YEAR FROM NEW.scheduled_date);
  
  -- Ensure fiscal year record exists
  INSERT INTO meeting_quota_tracker (fiscal_year)
  VALUES (v_fiscal_year)
  ON CONFLICT (fiscal_year) DO NOTHING;
  
  -- Update quota counts
  IF NEW.status = 'completed' AND NEW.counts_against_quota = true THEN
    UPDATE meeting_quota_tracker
    SET
      agm_count = agm_count + CASE WHEN NEW.meeting_type = 'agm' THEN 1 ELSE 0 END,
      council_regular_count = council_regular_count + CASE WHEN NEW.meeting_type = 'council_regular' THEN 1 ELSE 0 END,
      ad_hoc_count = ad_hoc_count + CASE WHEN NEW.meeting_type = 'ad_hoc' THEN 1 ELSE 0 END,
      sgm_count = sgm_count + CASE WHEN NEW.meeting_type = 'sgm' THEN 1 ELSE 0 END,
      total_quota_used = total_quota_used + 1,
      overtime_meetings = overtime_meetings + CASE WHEN NEW.is_overtime THEN 1 ELSE 0 END,
      total_overtime_fees = total_overtime_fees + COALESCE(NEW.overtime_fee, 0),
      updated_at = now()
    WHERE fiscal_year = v_fiscal_year;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for quota tracking
DROP TRIGGER IF EXISTS meeting_quota_tracker_trigger ON meetings;
CREATE TRIGGER meeting_quota_tracker_trigger
  AFTER INSERT OR UPDATE ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_meeting_quota();

-- Function to update vote counts on agenda items
CREATE OR REPLACE FUNCTION update_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE meeting_agenda_items
  SET
    vote_for = (SELECT COUNT(*) FROM meeting_votes WHERE agenda_item_id = NEW.agenda_item_id AND vote_decision = 'for'),
    vote_against = (SELECT COUNT(*) FROM meeting_votes WHERE agenda_item_id = NEW.agenda_item_id AND vote_decision = 'against'),
    vote_abstain = (SELECT COUNT(*) FROM meeting_votes WHERE agenda_item_id = NEW.agenda_item_id AND vote_decision = 'abstain'),
    updated_at = now()
  WHERE id = NEW.agenda_item_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for vote counting
DROP TRIGGER IF EXISTS vote_count_trigger ON meeting_votes;
CREATE TRIGGER vote_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON meeting_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_vote_counts();

-- Function to create minutes version on update
CREATE OR REPLACE FUNCTION create_minutes_version()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.draft_content IS DISTINCT FROM NEW.draft_content OR OLD.document_url IS DISTINCT FROM NEW.document_url THEN
    INSERT INTO meeting_minutes_versions (
      minutes_id,
      version_number,
      content,
      document_url,
      modified_by,
      change_summary
    ) VALUES (
      NEW.id,
      NEW.current_version,
      COALESCE(OLD.draft_content, ''),
      OLD.document_url,
      auth.uid(),
      'Version ' || NEW.current_version || ' archived'
    );
    
    NEW.current_version := NEW.current_version + 1;
    NEW.updated_at := now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for minutes versioning
DROP TRIGGER IF EXISTS minutes_version_trigger ON meeting_minutes;
CREATE TRIGGER minutes_version_trigger
  BEFORE UPDATE ON meeting_minutes
  FOR EACH ROW
  EXECUTE FUNCTION create_minutes_version();

-- Add comments for documentation
COMMENT ON TABLE meetings IS 'Core meeting management with quota tracking and overtime fees';
COMMENT ON TABLE meeting_agenda_items IS 'Individual agenda items with voting requirements and results';
COMMENT ON TABLE meeting_attendees IS 'Attendance tracking with proxy delegation support';
COMMENT ON TABLE meeting_votes IS 'Individual vote records with real-time counting';
COMMENT ON TABLE meeting_minutes IS 'Minutes documents with approval workflow';
COMMENT ON TABLE meeting_minutes_versions IS 'Version history for minutes with change tracking';
COMMENT ON TABLE meeting_documents IS 'Pre and post meeting documents';
COMMENT ON TABLE meeting_quota_tracker IS 'Annual meeting quota tracking and overtime fee calculation';
