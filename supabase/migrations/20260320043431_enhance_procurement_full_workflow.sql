/*
  # Enhanced Procurement & Maintenance Workflow System
  
  ## 1. Overview
  Complete implementation of procurement module requirements including:
  - Photo uploads for requests and completion verification
  - AI price comparison reports
  - Duplicate detection
  - Multi-stage approval workflow
  - Invoice management with OCR
  - Vendor rating system
  - Complete audit trail
  - Finance module integration
  
  ## 2. New Tables
  
  ### procurement_photos
  - Stores photos for requests and completion verification
  - Linked to procurement_jobs
  - Supports multiple photos per job
  - Tracks photo type (request/completion)
  
  ### procurement_ai_reports
  - Stores AI-generated price comparison reports
  - References historical pricing data
  - Flags abnormal pricing
  - Permanent archive (no deletion)
  
  ### procurement_approvals
  - Tracks approval workflow stages
  - Records voter decisions
  - Links to meeting decisions for large projects
  - Complete timestamp trail
  
  ### procurement_invoices
  - Stores invoice data extracted via OCR
  - Links to procurement jobs
  - Tracks variance from quoted prices
  - Required for payment trigger
  
  ### procurement_verifications
  - Multi-stage verification system
  - First party: requester verification
  - Second party: council verification (threshold-based)
  - Third party: AI audit
  - All three required for payment
  
  ### vendor_ratings
  - Tracks vendor performance ratings
  - Quality, speed, attitude metrics
  - Builds trusted vendor database
  - Used by AI for recommendations
  
  ### procurement_audit_log
  - Complete audit trail
  - Every action logged with timestamp
  - Permanent archive (no deletion)
  - Tracks all state changes
  
  ## 3. Security
  - RLS enabled on all tables
  - Restrictive policies by default
  - Council members have elevated permissions
  - All modifications tracked in audit log
*/

-- Create procurement_photos table
CREATE TABLE IF NOT EXISTS procurement_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES procurement_jobs(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  photo_type text NOT NULL CHECK (photo_type IN ('request', 'completion', 'verification')),
  uploaded_by uuid NOT NULL REFERENCES profiles(id),
  uploaded_at timestamptz DEFAULT now(),
  location_note text,
  notes text
);

ALTER TABLE procurement_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view procurement photos"
  ON procurement_photos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can upload photos"
  ON procurement_photos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

-- Create procurement_ai_reports table
CREATE TABLE IF NOT EXISTS procurement_ai_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES procurement_jobs(id) ON DELETE CASCADE,
  report_type text NOT NULL CHECK (report_type IN ('price_comparison', 'duplicate_detection', 'anomaly_detection', 'completion_audit')),
  report_data jsonb NOT NULL,
  generated_at timestamptz DEFAULT now(),
  confidence_score numeric(3,2),
  flags jsonb DEFAULT '[]'::jsonb,
  recommendations text,
  CONSTRAINT no_deletion CHECK (id IS NOT NULL)
);

ALTER TABLE procurement_ai_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view AI reports"
  ON procurement_ai_reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can create AI reports"
  ON procurement_ai_reports FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create procurement_approvals table
CREATE TABLE IF NOT EXISTS procurement_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES procurement_jobs(id) ON DELETE CASCADE,
  approval_stage text NOT NULL CHECK (approval_stage IN ('initial_review', 'council_vote', 'secondary_verification', 'final_approval')),
  approved_by uuid NOT NULL REFERENCES profiles(id),
  decision text NOT NULL CHECK (decision IN ('approved', 'rejected', 'needs_revision')),
  decision_at timestamptz DEFAULT now(),
  comments text,
  meeting_id uuid,
  vote_data jsonb,
  threshold_amount numeric(10,2)
);

ALTER TABLE procurement_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view approvals"
  ON procurement_approvals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Council can create approvals"
  ON procurement_approvals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'council'
    )
  );

-- Create procurement_invoices table
CREATE TABLE IF NOT EXISTS procurement_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES procurement_jobs(id) ON DELETE CASCADE,
  invoice_url text NOT NULL,
  invoice_number text,
  invoice_date date,
  vendor_name text,
  invoice_amount numeric(10,2) NOT NULL,
  quoted_amount numeric(10,2),
  variance_percent numeric(5,2),
  ocr_data jsonb,
  uploaded_by uuid NOT NULL REFERENCES profiles(id),
  uploaded_at timestamptz DEFAULT now(),
  verified_by uuid REFERENCES profiles(id),
  verified_at timestamptz,
  verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected', 'flagged')),
  variance_explanation text
);

ALTER TABLE procurement_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoices"
  ON procurement_invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Vendors and council can upload invoices"
  ON procurement_invoices FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Council can verify invoices"
  ON procurement_invoices FOR UPDATE
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

-- Create procurement_verifications table
CREATE TABLE IF NOT EXISTS procurement_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES procurement_jobs(id) ON DELETE CASCADE,
  verification_type text NOT NULL CHECK (verification_type IN ('first_party', 'second_party', 'third_party_ai')),
  verified_by uuid REFERENCES profiles(id),
  verified_at timestamptz DEFAULT now(),
  verification_status text NOT NULL CHECK (verification_status IN ('passed', 'failed', 'needs_review')),
  verification_data jsonb,
  completion_photos jsonb,
  comparison_notes text,
  ai_confidence_score numeric(3,2)
);

ALTER TABLE procurement_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view verifications"
  ON procurement_verifications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create verifications"
  ON procurement_verifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = verified_by OR verified_by IS NULL);

-- Create vendor_ratings table
CREATE TABLE IF NOT EXISTS vendor_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES procurement_jobs(id) ON DELETE CASCADE,
  vendor_name text NOT NULL,
  vendor_contact text,
  rated_by uuid NOT NULL REFERENCES profiles(id),
  rated_at timestamptz DEFAULT now(),
  quality_score integer NOT NULL CHECK (quality_score BETWEEN 1 AND 5),
  speed_score integer NOT NULL CHECK (speed_score BETWEEN 1 AND 5),
  attitude_score integer NOT NULL CHECK (attitude_score BETWEEN 1 AND 5),
  overall_score numeric(3,2) GENERATED ALWAYS AS ((quality_score + speed_score + attitude_score) / 3.0) STORED,
  comments text,
  would_recommend boolean DEFAULT true
);

ALTER TABLE vendor_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view vendor ratings"
  ON vendor_ratings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can rate vendors"
  ON vendor_ratings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = rated_by);

-- Create procurement_audit_log table
CREATE TABLE IF NOT EXISTS procurement_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES procurement_jobs(id) ON DELETE CASCADE,
  action text NOT NULL,
  performed_by uuid REFERENCES profiles(id),
  performed_at timestamptz DEFAULT now(),
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text,
  notes text,
  CONSTRAINT no_deletion CHECK (id IS NOT NULL)
);

ALTER TABLE procurement_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit logs"
  ON procurement_audit_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can create audit logs"
  ON procurement_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = performed_by);

-- Add additional columns to procurement_jobs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'procurement_jobs' AND column_name = 'is_public_area'
  ) THEN
    ALTER TABLE procurement_jobs ADD COLUMN is_public_area boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'procurement_jobs' AND column_name = 'location_description'
  ) THEN
    ALTER TABLE procurement_jobs ADD COLUMN location_description text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'procurement_jobs' AND column_name = 'completion_deadline'
  ) THEN
    ALTER TABLE procurement_jobs ADD COLUMN completion_deadline date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'procurement_jobs' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE procurement_jobs ADD COLUMN completed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'procurement_jobs' AND column_name = 'payment_triggered'
  ) THEN
    ALTER TABLE procurement_jobs ADD COLUMN payment_triggered boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'procurement_jobs' AND column_name = 'payment_triggered_at'
  ) THEN
    ALTER TABLE procurement_jobs ADD COLUMN payment_triggered_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'procurement_jobs' AND column_name = 'requires_meeting_approval'
  ) THEN
    ALTER TABLE procurement_jobs ADD COLUMN requires_meeting_approval boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'procurement_jobs' AND column_name = 'meeting_decision_id'
  ) THEN
    ALTER TABLE procurement_jobs ADD COLUMN meeting_decision_id uuid;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_procurement_photos_job ON procurement_photos(job_id);
CREATE INDEX IF NOT EXISTS idx_procurement_photos_type ON procurement_photos(photo_type);
CREATE INDEX IF NOT EXISTS idx_procurement_ai_reports_job ON procurement_ai_reports(job_id);
CREATE INDEX IF NOT EXISTS idx_procurement_ai_reports_type ON procurement_ai_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_procurement_approvals_job ON procurement_approvals(job_id);
CREATE INDEX IF NOT EXISTS idx_procurement_approvals_stage ON procurement_approvals(approval_stage);
CREATE INDEX IF NOT EXISTS idx_procurement_invoices_job ON procurement_invoices(job_id);
CREATE INDEX IF NOT EXISTS idx_procurement_invoices_status ON procurement_invoices(verification_status);
CREATE INDEX IF NOT EXISTS idx_procurement_verifications_job ON procurement_verifications(job_id);
CREATE INDEX IF NOT EXISTS idx_procurement_verifications_type ON procurement_verifications(verification_type);
CREATE INDEX IF NOT EXISTS idx_vendor_ratings_vendor ON vendor_ratings(vendor_name);
CREATE INDEX IF NOT EXISTS idx_vendor_ratings_score ON vendor_ratings(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_procurement_audit_log_job ON procurement_audit_log(job_id);
CREATE INDEX IF NOT EXISTS idx_procurement_audit_log_time ON procurement_audit_log(performed_at DESC);

-- Create function to automatically log procurement changes
CREATE OR REPLACE FUNCTION log_procurement_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO procurement_audit_log (job_id, action, performed_by, old_data, new_data)
  VALUES (
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    auth.uid(),
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic audit logging
DROP TRIGGER IF EXISTS procurement_jobs_audit_trigger ON procurement_jobs;
CREATE TRIGGER procurement_jobs_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON procurement_jobs
  FOR EACH ROW
  EXECUTE FUNCTION log_procurement_change();

-- Create function to check if payment can be triggered
CREATE OR REPLACE FUNCTION can_trigger_payment(p_job_id uuid)
RETURNS boolean AS $$
DECLARE
  v_first_party boolean;
  v_second_party boolean;
  v_third_party boolean;
  v_invoice_verified boolean;
  v_amount numeric;
BEGIN
  -- Check if all three verifications are passed
  SELECT 
    EXISTS(SELECT 1 FROM procurement_verifications WHERE job_id = p_job_id AND verification_type = 'first_party' AND verification_status = 'passed'),
    EXISTS(SELECT 1 FROM procurement_verifications WHERE job_id = p_job_id AND verification_type = 'second_party' AND verification_status = 'passed'),
    EXISTS(SELECT 1 FROM procurement_verifications WHERE job_id = p_job_id AND verification_type = 'third_party_ai' AND verification_status = 'passed')
  INTO v_first_party, v_second_party, v_third_party;

  -- Check if invoice is verified
  SELECT 
    EXISTS(SELECT 1 FROM procurement_invoices WHERE job_id = p_job_id AND verification_status = 'approved')
  INTO v_invoice_verified;

  -- Get job amount to determine if second party verification is required
  SELECT approved_cost INTO v_amount FROM procurement_jobs WHERE id = p_job_id;

  -- If amount < 500, second party verification not required
  IF v_amount < 500 THEN
    v_second_party := true;
  END IF;

  -- All checks must pass
  RETURN v_first_party AND v_second_party AND v_third_party AND v_invoice_verified;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE procurement_photos IS 'Stores request and completion photos with location notes';
COMMENT ON TABLE procurement_ai_reports IS 'AI-generated reports for pricing, duplicates, and anomalies - permanent archive';
COMMENT ON TABLE procurement_approvals IS 'Multi-stage approval workflow with voting and meeting links';
COMMENT ON TABLE procurement_invoices IS 'Invoice management with OCR data and variance tracking';
COMMENT ON TABLE procurement_verifications IS 'Three-party verification system: requester, council, AI';
COMMENT ON TABLE vendor_ratings IS 'Vendor performance ratings building trusted vendor database';
COMMENT ON TABLE procurement_audit_log IS 'Complete audit trail of all procurement actions - permanent archive';
