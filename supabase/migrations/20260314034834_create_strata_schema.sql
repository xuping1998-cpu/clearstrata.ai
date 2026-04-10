/*
  # 清涟 ClearStrata Database Schema

  ## Overview
  Complete database schema for a bilingual strata management system supporting
  100-unit self-managed strata corporation with three user roles.

  ## User Roles
  - owner: Regular property owner (业主)
  - caretaker: Building caretaker (管家)
  - council: Council member (业委会成?

  ## Tables Created

  ### 1. profiles
  Extended user profile with role and unit information
  - id (references auth.users)
  - role (owner/caretaker/council)
  - full_name_en, full_name_zh
  - email, phone
  - preferred_language (en/zh)
  - created_at, updated_at

  ### 2. owner_info
  Detailed owner information for each unit
  - id, user_id
  - unit_number, unit_size_sqft
  - occupancy_status (owner_occupied/rented/vacant)
  - emergency_contact_name, emergency_contact_phone
  - move_in_date
  - pending_approval (for update requests)
  - approved_by, approved_at

  ### 3. procurement_jobs
  Procurement/job posting system
  - id, posted_by
  - title_en, title_zh
  - description_en, description_zh
  - estimated_budget
  - status (draft/collecting_quotes/approved/public_notice/completed/cancelled)
  - approved_by, approved_at
  - public_notice_end_date

  ### 4. procurement_quotes
  Quotes submitted for procurement jobs
  - id, job_id
  - vendor_name, vendor_contact
  - quoted_amount
  - description_en, description_zh
  - submitted_by, submitted_at

  ### 5. votes
  Owner voting system
  - id, initiated_by
  - title_en, title_zh
  - description_en, description_zh
  - start_date, end_date
  - quorum_percentage (default 20)
  - status (active/passed/failed/cancelled)
  - yes_count, no_count, total_votes

  ### 6. vote_responses
  Individual vote records
  - id, vote_id, user_id
  - vote_choice (yes/no)
  - voted_at

  ### 7. maintenance_requests
  Maintenance request workflow
  - id, submitted_by
  - title_en, title_zh
  - description_en, description_zh
  - estimated_cost, approved_cost
  - status (submitted/cost_approved/in_progress/completed/rejected)
  - cost_approved_by, cost_approved_at
  - completed_confirmed_by, completed_at
  - advance_payment_added

  ### 8. finance_bills
  Monthly billing system
  - id, owner_id
  - billing_month
  - unit_size_sqft, rate_per_sqft
  - fixed_fee, repair_expense
  - total_amount
  - status (generated/sent/paid)
  - paid_at

  ### 9. hiring_jobs
  Caretaker hiring system
  - id, posted_by
  - title_en, title_zh
  - description_en, description_zh
  - probation_months (default 3)
  - status (open/in_review/hired/closed)

  ### 10. hiring_candidates
  Candidate information and scoring
  - id, job_id
  - candidate_name, candidate_contact
  - recommended_by
  - council_score, owner_score
  - total_score
  - status (pending/interview/hired/rejected)

  ### 11. communications
  Owner communication board
  - id, posted_by
  - category (complaint/suggestion/inquiry/urgent)
  - title_en, title_zh
  - content_en, content_zh
  - status (pending/replied/resolved)
  - reply_en, reply_zh
  - replied_by, replied_at
  - like_count
  - urgent_notification_sent

  ### 12. communication_likes
  Track which users liked which posts
  - id, communication_id, user_id

  ### 13. notifications
  System notification tracking
  - id, user_id
  - type, title_en, title_zh
  - message_en, message_zh
  - read, created_at

  ## Security
  - RLS enabled on all tables
  - Authenticated users can access based on role
  - Owners see only their own data
  - Council members have broader access
  - Caretakers have specific access rights
*/

-- Create enum types
CREATE TYPE user_role AS ENUM ('owner', 'caretaker', 'council');
CREATE TYPE occupancy_status AS ENUM ('owner_occupied', 'rented', 'vacant');
CREATE TYPE procurement_status AS ENUM ('draft', 'collecting_quotes', 'approved', 'public_notice', 'completed', 'cancelled');
CREATE TYPE vote_status AS ENUM ('active', 'passed', 'failed', 'cancelled');
CREATE TYPE maintenance_status AS ENUM ('submitted', 'cost_approved', 'in_progress', 'completed', 'rejected');
CREATE TYPE bill_status AS ENUM ('generated', 'sent', 'paid');
CREATE TYPE hiring_status AS ENUM ('open', 'in_review', 'hired', 'closed');
CREATE TYPE candidate_status AS ENUM ('pending', 'interview', 'hired', 'rejected');
CREATE TYPE communication_category AS ENUM ('complaint', 'suggestion', 'inquiry', 'urgent');
CREATE TYPE communication_status AS ENUM ('pending', 'replied', 'resolved');

-- 1. Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'owner',
  full_name_en text NOT NULL,
  full_name_zh text,
  email text NOT NULL,
  phone text,
  preferred_language text NOT NULL DEFAULT 'en',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 2. Owner info table
CREATE TABLE IF NOT EXISTS owner_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  unit_number text NOT NULL,
  unit_size_sqft numeric NOT NULL,
  occupancy_status occupancy_status DEFAULT 'owner_occupied',
  emergency_contact_name text,
  emergency_contact_phone text,
  move_in_date date,
  pending_approval boolean DEFAULT false,
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(unit_number)
);

ALTER TABLE owner_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Council can view all owner info"
  ON owner_info FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );

CREATE POLICY "Owners can view own info"
  ON owner_info FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Owners can update own info"
  ON owner_info FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Council can approve owner info updates"
  ON owner_info FOR UPDATE
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

-- 3. Procurement jobs table
CREATE TABLE IF NOT EXISTS procurement_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posted_by uuid REFERENCES profiles(id) NOT NULL,
  title_en text NOT NULL,
  title_zh text,
  description_en text NOT NULL,
  description_zh text,
  estimated_budget numeric,
  status procurement_status DEFAULT 'draft',
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  public_notice_end_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE procurement_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view procurement jobs"
  ON procurement_jobs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Council can create procurement jobs"
  ON procurement_jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );

CREATE POLICY "Council can update procurement jobs"
  ON procurement_jobs FOR UPDATE
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

-- 4. Procurement quotes table
CREATE TABLE IF NOT EXISTS procurement_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES procurement_jobs(id) ON DELETE CASCADE,
  vendor_name text NOT NULL,
  vendor_contact text,
  quoted_amount numeric NOT NULL,
  description_en text,
  description_zh text,
  submitted_by uuid REFERENCES profiles(id),
  submitted_at timestamptz DEFAULT now()
);

ALTER TABLE procurement_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view quotes"
  ON procurement_quotes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Council can submit quotes"
  ON procurement_quotes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );

-- 5. Votes table
CREATE TABLE IF NOT EXISTS votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiated_by uuid REFERENCES profiles(id) NOT NULL,
  title_en text NOT NULL,
  title_zh text,
  description_en text NOT NULL,
  description_zh text,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz NOT NULL,
  quorum_percentage numeric DEFAULT 20,
  status vote_status DEFAULT 'active',
  yes_count integer DEFAULT 0,
  no_count integer DEFAULT 0,
  total_votes integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view votes"
  ON votes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Any owner can create votes"
  ON votes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'council')
    )
  );

CREATE POLICY "Initiator can update votes"
  ON votes FOR UPDATE
  TO authenticated
  USING (initiated_by = auth.uid())
  WITH CHECK (initiated_by = auth.uid());

-- 6. Vote responses table
CREATE TABLE IF NOT EXISTS vote_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id uuid REFERENCES votes(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  vote_choice text NOT NULL CHECK (vote_choice IN ('yes', 'no')),
  voted_at timestamptz DEFAULT now(),
  UNIQUE(vote_id, user_id)
);

ALTER TABLE vote_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all vote responses"
  ON vote_responses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Owners can submit their vote"
  ON vote_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'council')
    )
  );

-- 7. Maintenance requests table
CREATE TABLE IF NOT EXISTS maintenance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by uuid REFERENCES profiles(id) NOT NULL,
  title_en text NOT NULL,
  title_zh text,
  description_en text NOT NULL,
  description_zh text,
  estimated_cost numeric,
  approved_cost numeric,
  status maintenance_status DEFAULT 'submitted',
  cost_approved_by uuid REFERENCES profiles(id),
  cost_approved_at timestamptz,
  completed_confirmed_by uuid REFERENCES profiles(id),
  completed_at timestamptz,
  advance_payment_added boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own maintenance requests"
  ON maintenance_requests FOR SELECT
  TO authenticated
  USING (
    submitted_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('council', 'caretaker')
    )
  );

CREATE POLICY "Owners can create maintenance requests"
  ON maintenance_requests FOR INSERT
  TO authenticated
  WITH CHECK (submitted_by = auth.uid());

CREATE POLICY "Council and caretaker can update maintenance requests"
  ON maintenance_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('council', 'caretaker')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('council', 'caretaker')
    )
  );

CREATE POLICY "Owners can confirm completion"
  ON maintenance_requests FOR UPDATE
  TO authenticated
  USING (submitted_by = auth.uid())
  WITH CHECK (submitted_by = auth.uid());

-- 8. Finance bills table
CREATE TABLE IF NOT EXISTS finance_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES profiles(id) NOT NULL,
  billing_month date NOT NULL,
  unit_size_sqft numeric NOT NULL,
  rate_per_sqft numeric NOT NULL DEFAULT 0.5,
  fixed_fee numeric NOT NULL DEFAULT 0,
  repair_expense numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL,
  status bill_status DEFAULT 'generated',
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(owner_id, billing_month)
);

ALTER TABLE finance_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own bills"
  ON finance_bills FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );

CREATE POLICY "Council can create and update bills"
  ON finance_bills FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );

CREATE POLICY "Council can update bills"
  ON finance_bills FOR UPDATE
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

-- 9. Hiring jobs table
CREATE TABLE IF NOT EXISTS hiring_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posted_by uuid REFERENCES profiles(id) NOT NULL,
  title_en text NOT NULL,
  title_zh text,
  description_en text NOT NULL,
  description_zh text,
  probation_months integer DEFAULT 3,
  status hiring_status DEFAULT 'open',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE hiring_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view hiring jobs"
  ON hiring_jobs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Council can create hiring jobs"
  ON hiring_jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );

CREATE POLICY "Council can update hiring jobs"
  ON hiring_jobs FOR UPDATE
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

-- 10. Hiring candidates table
CREATE TABLE IF NOT EXISTS hiring_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES hiring_jobs(id) ON DELETE CASCADE,
  candidate_name text NOT NULL,
  candidate_contact text,
  recommended_by uuid REFERENCES profiles(id),
  council_score numeric CHECK (council_score >= 0 AND council_score <= 100),
  owner_score numeric CHECK (owner_score >= 0 AND owner_score <= 100),
  total_score numeric,
  status candidate_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE hiring_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view candidates"
  ON hiring_candidates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Owners can recommend candidates"
  ON hiring_candidates FOR INSERT
  TO authenticated
  WITH CHECK (recommended_by = auth.uid());

CREATE POLICY "Council can update candidates"
  ON hiring_candidates FOR UPDATE
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

-- 11. Communications table
CREATE TABLE IF NOT EXISTS communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posted_by uuid REFERENCES profiles(id) NOT NULL,
  category communication_category NOT NULL,
  title_en text NOT NULL,
  title_zh text,
  content_en text NOT NULL,
  content_zh text,
  status communication_status DEFAULT 'pending',
  reply_en text,
  reply_zh text,
  replied_by uuid REFERENCES profiles(id),
  replied_at timestamptz,
  like_count integer DEFAULT 0,
  urgent_notification_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view communications"
  ON communications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Owners can create communications"
  ON communications FOR INSERT
  TO authenticated
  WITH CHECK (posted_by = auth.uid());

CREATE POLICY "Council can reply to communications"
  ON communications FOR UPDATE
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

-- 12. Communication likes table
CREATE TABLE IF NOT EXISTS communication_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  communication_id uuid REFERENCES communications(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(communication_id, user_id)
);

ALTER TABLE communication_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all likes"
  ON communication_likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can like communications"
  ON communication_likes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unlike communications"
  ON communication_likes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 13. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title_en text NOT NULL,
  title_zh text,
  message_en text NOT NULL,
  message_zh text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_owner_info_user_id ON owner_info(user_id);
CREATE INDEX IF NOT EXISTS idx_procurement_jobs_status ON procurement_jobs(status);
CREATE INDEX IF NOT EXISTS idx_procurement_quotes_job_id ON procurement_quotes(job_id);
CREATE INDEX IF NOT EXISTS idx_votes_status ON votes(status);
CREATE INDEX IF NOT EXISTS idx_vote_responses_vote_id ON vote_responses(vote_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status ON maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_finance_bills_owner_id ON finance_bills(owner_id);
CREATE INDEX IF NOT EXISTS idx_hiring_candidates_job_id ON hiring_candidates(job_id);
CREATE INDEX IF NOT EXISTS idx_communications_status ON communications(status);
CREATE INDEX IF NOT EXISTS idx_communications_category ON communications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);




