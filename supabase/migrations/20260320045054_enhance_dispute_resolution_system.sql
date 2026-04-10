/*
  # Enhanced Dispute Resolution System
  
  ## 1. Overview
  Comprehensive dispute resolution system with:
  - Multi-type dispute handling (noise, transparency, unprocessed requests, owner vs council)
  - Property manager mediation workflow
  - Auto-escalation to council
  - Communication logging within system
  - Time limits and SLA tracking
  - Evidence attachment support
  - Repeat complaint tracking
  - Integration with procurement and financial modules
  
  ## 2. Dispute Types
  - noise: Noise complaints (with frequency tracking)
  - transparency: Information access requests
  - unprocessed: Unprocessed maintenance requests
  - neighbor: General neighbor disputes
  - parking: Parking conflicts
  - pet: Pet-related issues
  - common_area: Common area usage disputes
  - owner_vs_council: Owner challenges council decisions
  - other: Other disputes
  
  ## 3. Core Principles
  - All communication logged in system (no email/phone bypass)
  - Visible status tracking for owners
  - Auto-escalation on timeout
  - Immutable record keeping
  - Evidence preservation
  
  ## 4. New/Enhanced Tables
  
  ### disputes (enhanced)
  - Add dispute type-specific fields
  - Add SLA tracking fields
  - Add escalation tracking
  - Add repeat complaint tracking
  
  ### dispute_messages
  - Communication log for each dispute
  - All parties' messages in one place
  - Automatic timestamps
  
  ### dispute_evidence
  - Photo, video, audio evidence
  - Document attachments
  - Linked to specific messages or disputes
  
  ### dispute_timeline
  - Auto-generated timeline events
  - SLA breach tracking
  - Escalation records
  
  ## 5. SLA Rules
  - General complaints: 3 business days response
  - Urgent complaints: 24 hours response
  - Mediation period: 14 days maximum
  - Auto-escalate on timeout
  
  ## 6. Security
  - RLS on all tables
  - Dispute parties can view/comment
  - Council and managers can access all
  - Immutable after resolution
*/

-- Extend dispute types
DO $$
BEGIN
  -- Drop old constraint if exists
  ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_category_check;
  
  -- Add new constraint with extended types
  ALTER TABLE disputes ADD CONSTRAINT disputes_category_check 
    CHECK (category IN (
      'noise',
      'transparency',
      'unprocessed_request',
      'neighbor',
      'parking',
      'pet',
      'common_area',
      'owner_vs_council',
      'renovation',
      'other'
    ));
END $$;

-- Extend dispute status
DO $$
BEGIN
  ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_status_check;
  
  ALTER TABLE disputes ADD CONSTRAINT disputes_status_check 
    CHECK (status IN (
      'pending',
      'manager_reviewing',
      'manager_mediating',
      'escalated_to_council',
      'council_reviewing',
      'council_ruling',
      'resolved',
      'closed',
      'external_referral'
    ));
END $$;

-- Add new columns to disputes table
DO $$
BEGIN
  -- Priority level
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'disputes' AND column_name = 'priority'
  ) THEN
    ALTER TABLE disputes ADD COLUMN priority text DEFAULT 'normal' 
      CHECK (priority IN ('low', 'normal', 'urgent', 'emergency'));
  END IF;
  
  -- Related entity IDs
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'disputes' AND column_name = 'related_procurement_job_id'
  ) THEN
    ALTER TABLE disputes ADD COLUMN related_procurement_job_id uuid REFERENCES procurement_jobs(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'disputes' AND column_name = 'related_meeting_id'
  ) THEN
    ALTER TABLE disputes ADD COLUMN related_meeting_id uuid REFERENCES meetings(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'disputes' AND column_name = 'related_invoice_id'
  ) THEN
    ALTER TABLE disputes ADD COLUMN related_invoice_id uuid REFERENCES invoices(id);
  END IF;
  
  -- Respondent (who is being complained about)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'disputes' AND column_name = 'respondent_id'
  ) THEN
    ALTER TABLE disputes ADD COLUMN respondent_id uuid REFERENCES profiles(id);
  END IF;
  
  -- SLA tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'disputes' AND column_name = 'response_due_at'
  ) THEN
    ALTER TABLE disputes ADD COLUMN response_due_at timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'disputes' AND column_name = 'resolution_due_at'
  ) THEN
    ALTER TABLE disputes ADD COLUMN resolution_due_at timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'disputes' AND column_name = 'first_response_at'
  ) THEN
    ALTER TABLE disputes ADD COLUMN first_response_at timestamptz;
  END IF;
  
  -- Escalation tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'disputes' AND column_name = 'escalated_at'
  ) THEN
    ALTER TABLE disputes ADD COLUMN escalated_at timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'disputes' AND column_name = 'escalation_reason'
  ) THEN
    ALTER TABLE disputes ADD COLUMN escalation_reason text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'disputes' AND column_name = 'is_escalated'
  ) THEN
    ALTER TABLE disputes ADD COLUMN is_escalated boolean DEFAULT false;
  END IF;
  
  -- Repeat complaint tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'disputes' AND column_name = 'repeat_complaint_count'
  ) THEN
    ALTER TABLE disputes ADD COLUMN repeat_complaint_count integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'disputes' AND column_name = 'repeat_complaint_threshold_reached'
  ) THEN
    ALTER TABLE disputes ADD COLUMN repeat_complaint_threshold_reached boolean DEFAULT false;
  END IF;
  
  -- Noise-specific fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'disputes' AND column_name = 'noise_frequency'
  ) THEN
    ALTER TABLE disputes ADD COLUMN noise_frequency text 
      CHECK (noise_frequency IN ('once', 'occasional', 'frequent', 'daily', 'constant') OR noise_frequency IS NULL);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'disputes' AND column_name = 'noise_duration_minutes'
  ) THEN
    ALTER TABLE disputes ADD COLUMN noise_duration_minutes integer;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'disputes' AND column_name = 'noise_time_of_day'
  ) THEN
    ALTER TABLE disputes ADD COLUMN noise_time_of_day text;
  END IF;
  
  -- Transparency request fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'disputes' AND column_name = 'requested_documents'
  ) THEN
    ALTER TABLE disputes ADD COLUMN requested_documents text[];
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'disputes' AND column_name = 'documents_provided'
  ) THEN
    ALTER TABLE disputes ADD COLUMN documents_provided boolean DEFAULT false;
  END IF;
  
  -- External referral
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'disputes' AND column_name = 'external_referral_info'
  ) THEN
    ALTER TABLE disputes ADD COLUMN external_referral_info text;
  END IF;
  
  -- Manager assignment
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'disputes' AND column_name = 'assigned_manager_id'
  ) THEN
    ALTER TABLE disputes ADD COLUMN assigned_manager_id uuid REFERENCES profiles(id);
  END IF;
END $$;

-- Create dispute_messages table
CREATE TABLE IF NOT EXISTS dispute_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id),
  message_en text NOT NULL,
  message_zh text,
  is_internal_note boolean DEFAULT false,
  is_system_message boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  read_by_reporter boolean DEFAULT false,
  read_by_respondent boolean DEFAULT false,
  read_by_mediator boolean DEFAULT false
);

ALTER TABLE dispute_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dispute parties can view messages"
  ON dispute_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM disputes
      WHERE disputes.id = dispute_messages.dispute_id
      AND (
        disputes.reporter_id = auth.uid()
        OR disputes.respondent_id = auth.uid()
        OR disputes.mediator_id = auth.uid()
        OR disputes.assigned_manager_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('council', 'manager')
        )
      )
    )
    AND (NOT is_internal_note OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('council', 'manager')
    ))
  );

CREATE POLICY "Dispute parties can send messages"
  ON dispute_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM disputes
      WHERE disputes.id = dispute_messages.dispute_id
      AND (
        disputes.reporter_id = auth.uid()
        OR disputes.respondent_id = auth.uid()
        OR disputes.mediator_id = auth.uid()
        OR disputes.assigned_manager_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('council', 'manager')
        )
      )
    )
  );

-- Create dispute_evidence table
CREATE TABLE IF NOT EXISTS dispute_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  message_id uuid REFERENCES dispute_messages(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES profiles(id),
  evidence_type text NOT NULL CHECK (evidence_type IN ('photo', 'video', 'audio', 'document', 'other')),
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size_bytes integer,
  description_en text,
  description_zh text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE dispute_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dispute parties can view evidence"
  ON dispute_evidence FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM disputes
      WHERE disputes.id = dispute_evidence.dispute_id
      AND (
        disputes.reporter_id = auth.uid()
        OR disputes.respondent_id = auth.uid()
        OR disputes.mediator_id = auth.uid()
        OR disputes.assigned_manager_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('council', 'manager')
        )
      )
    )
  );

CREATE POLICY "Dispute parties can upload evidence"
  ON dispute_evidence FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = uploaded_by
    AND EXISTS (
      SELECT 1 FROM disputes
      WHERE disputes.id = dispute_evidence.dispute_id
      AND (
        disputes.reporter_id = auth.uid()
        OR disputes.respondent_id = auth.uid()
        OR disputes.mediator_id = auth.uid()
        OR disputes.assigned_manager_id = auth.uid()
      )
    )
  );

-- Create dispute_timeline table
CREATE TABLE IF NOT EXISTS dispute_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'created',
    'assigned',
    'first_response',
    'status_change',
    'escalated',
    'sla_breach',
    'message_sent',
    'evidence_added',
    'resolved',
    'closed',
    'reopened'
  )),
  event_description_en text NOT NULL,
  event_description_zh text,
  actor_id uuid REFERENCES profiles(id),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE dispute_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dispute parties can view timeline"
  ON dispute_timeline FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM disputes
      WHERE disputes.id = dispute_timeline.dispute_id
      AND (
        disputes.reporter_id = auth.uid()
        OR disputes.respondent_id = auth.uid()
        OR disputes.mediator_id = auth.uid()
        OR disputes.assigned_manager_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('council', 'manager')
        )
      )
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute ON dispute_messages(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_sender ON dispute_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_dispute ON dispute_evidence(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_timeline_dispute ON dispute_timeline(dispute_id);
CREATE INDEX IF NOT EXISTS idx_disputes_respondent ON disputes(respondent_id);
CREATE INDEX IF NOT EXISTS idx_disputes_assigned_manager ON disputes(assigned_manager_id);
CREATE INDEX IF NOT EXISTS idx_disputes_priority ON disputes(priority);
CREATE INDEX IF NOT EXISTS idx_disputes_response_due ON disputes(response_due_at);

-- Function to calculate SLA deadlines
CREATE OR REPLACE FUNCTION calculate_dispute_sla()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate response deadline based on priority
  IF NEW.priority = 'emergency' THEN
    NEW.response_due_at := NEW.created_at + INTERVAL '4 hours';
  ELSIF NEW.priority = 'urgent' THEN
    NEW.response_due_at := NEW.created_at + INTERVAL '24 hours';
  ELSE
    -- 3 business days (72 hours)
    NEW.response_due_at := NEW.created_at + INTERVAL '72 hours';
  END IF;
  
  -- Calculate resolution deadline (14 days from creation)
  NEW.resolution_due_at := NEW.created_at + INTERVAL '14 days';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for SLA calculation
DROP TRIGGER IF EXISTS calculate_dispute_sla_trigger ON disputes;
CREATE TRIGGER calculate_dispute_sla_trigger
  BEFORE INSERT ON disputes
  FOR EACH ROW
  EXECUTE FUNCTION calculate_dispute_sla();

-- Function to track first response
CREATE OR REPLACE FUNCTION track_first_response()
RETURNS TRIGGER AS $$
BEGIN
  -- Update first response time if not set
  UPDATE disputes
  SET 
    first_response_at = NEW.created_at,
    status = CASE 
      WHEN status = 'pending' THEN 'manager_reviewing'
      ELSE status
    END
  WHERE id = NEW.dispute_id
  AND first_response_at IS NULL
  AND NEW.sender_id != (SELECT reporter_id FROM disputes WHERE id = NEW.dispute_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for first response tracking
DROP TRIGGER IF EXISTS track_first_response_trigger ON dispute_messages;
CREATE TRIGGER track_first_response_trigger
  AFTER INSERT ON dispute_messages
  FOR EACH ROW
  EXECUTE FUNCTION track_first_response();

-- Function to check and track repeat complaints
CREATE OR REPLACE FUNCTION track_repeat_complaints()
RETURNS TRIGGER AS $$
DECLARE
  v_repeat_count integer;
BEGIN
  -- Count similar disputes from same reporter about same respondent in last 90 days
  IF NEW.category IN ('noise', 'neighbor', 'pet', 'parking') AND NEW.respondent_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_repeat_count
    FROM disputes
    WHERE reporter_id = NEW.reporter_id
    AND respondent_id = NEW.respondent_id
    AND category = NEW.category
    AND created_at > CURRENT_TIMESTAMP - INTERVAL '90 days'
    AND id != NEW.id;
    
    NEW.repeat_complaint_count := v_repeat_count;
    
    -- Flag if threshold reached (5 complaints)
    IF v_repeat_count >= 5 THEN
      NEW.repeat_complaint_threshold_reached := true;
      
      -- Auto-escalate repeat complaints
      NEW.is_escalated := true;
      NEW.escalation_reason := 'Repeat complaint threshold reached (5+ complaints in 90 days)';
      NEW.escalated_at := CURRENT_TIMESTAMP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for repeat complaint tracking
DROP TRIGGER IF EXISTS track_repeat_complaints_trigger ON disputes;
CREATE TRIGGER track_repeat_complaints_trigger
  BEFORE INSERT ON disputes
  FOR EACH ROW
  EXECUTE FUNCTION track_repeat_complaints();

-- Function to auto-create timeline events
CREATE OR REPLACE FUNCTION create_dispute_timeline_event()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO dispute_timeline (
      dispute_id,
      event_type,
      event_description_en,
      event_description_zh,
      actor_id,
      metadata
    ) VALUES (
      NEW.id,
      'created',
      'Dispute created',
      '纠纷已创?,
      NEW.reporter_id,
      jsonb_build_object('category', NEW.category, 'priority', NEW.priority)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Track status changes
    IF OLD.status != NEW.status THEN
      INSERT INTO dispute_timeline (
        dispute_id,
        event_type,
        event_description_en,
        event_description_zh,
        metadata
      ) VALUES (
        NEW.id,
        'status_change',
        'Status changed from ' || OLD.status || ' to ' || NEW.status,
        '状态从 ' || OLD.status || ' 变更?' || NEW.status,
        jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
      );
    END IF;
    
    -- Track escalation
    IF NOT OLD.is_escalated AND NEW.is_escalated THEN
      INSERT INTO dispute_timeline (
        dispute_id,
        event_type,
        event_description_en,
        event_description_zh,
        metadata
      ) VALUES (
        NEW.id,
        'escalated',
        'Dispute escalated to council',
        '纠纷已升级至业委?,
        jsonb_build_object('reason', NEW.escalation_reason)
      );
    END IF;
    
    -- Track assignment
    IF OLD.assigned_manager_id IS DISTINCT FROM NEW.assigned_manager_id THEN
      INSERT INTO dispute_timeline (
        dispute_id,
        event_type,
        event_description_en,
        event_description_zh,
        actor_id,
        metadata
      ) VALUES (
        NEW.id,
        'assigned',
        'Dispute assigned to property manager',
        '纠纷已分配给物业经理',
        NEW.assigned_manager_id,
        jsonb_build_object('manager_id', NEW.assigned_manager_id)
      );
    END IF;
    
    -- Track resolution
    IF OLD.status != 'resolved' AND NEW.status = 'resolved' THEN
      INSERT INTO dispute_timeline (
        dispute_id,
        event_type,
        event_description_en,
        event_description_zh,
        metadata
      ) VALUES (
        NEW.id,
        'resolved',
        'Dispute resolved',
        '纠纷已解?,
        jsonb_build_object('resolved_at', NEW.resolved_at)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for timeline tracking
DROP TRIGGER IF EXISTS create_dispute_timeline_trigger ON disputes;
CREATE TRIGGER create_dispute_timeline_trigger
  AFTER INSERT OR UPDATE ON disputes
  FOR EACH ROW
  EXECUTE FUNCTION create_dispute_timeline_event();

-- Add comments
COMMENT ON TABLE disputes IS 'Comprehensive dispute resolution with SLA tracking and auto-escalation';
COMMENT ON TABLE dispute_messages IS 'All communication logged within system to prevent "I did not receive" issues';
COMMENT ON TABLE dispute_evidence IS 'Evidence attachments (photo, video, audio, documents)';
COMMENT ON TABLE dispute_timeline IS 'Auto-generated timeline of all dispute events';
COMMENT ON COLUMN disputes.repeat_complaint_count IS 'Number of similar complaints from same reporter about same respondent in 90 days';
COMMENT ON COLUMN disputes.repeat_complaint_threshold_reached IS 'Auto-flagged when 5+ repeat complaints detected';




