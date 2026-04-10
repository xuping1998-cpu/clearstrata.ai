/*
  # Add Demo Data to All Modules

  1. Demo Data Added
    - **Owner Info**: 4 demo units with different occupancy statuses
    - **Finance Bills**: Sample billing records for 2026
    - **Votes**: 3 active voting proposals with various participation levels
    - **Maintenance Requests**: Maintenance issues in different stages
    - **Communications**: Community posts and inquiries
    - **Procurement Jobs**: Procurement contracts at different stages
    - **Hiring Jobs**: Job openings with candidates

  2. Notes
    - All demo data references the existing user profile
    - Data demonstrates all possible statuses and workflows
    - Designed to immediately show functionality without empty states
    - Uses correct enum values for all status fields
*/

-- Insert demo owner info records
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM owner_info WHERE unit_number = '505') THEN
    INSERT INTO owner_info (user_id, unit_number, unit_size_sqft, occupancy_status, emergency_contact_name, emergency_contact_phone, move_in_date, pending_approval)
    VALUES ('a35ef381-2e80-425d-be09-ad1a9e829b3c', '505', 950, 'rented', 'Emergency Contact A', '+1-555-0101', '2023-06-01', false);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM owner_info WHERE unit_number = '1205') THEN
    INSERT INTO owner_info (user_id, unit_number, unit_size_sqft, occupancy_status, emergency_contact_name, emergency_contact_phone, move_in_date, pending_approval)
    VALUES ('a35ef381-2e80-425d-be09-ad1a9e829b3c', '1205', 1450, 'owner_occupied', 'Emergency Contact B', '+1-555-0202', '2022-09-15', false);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM owner_info WHERE unit_number = '302') THEN
    INSERT INTO owner_info (user_id, unit_number, unit_size_sqft, occupancy_status, emergency_contact_name, emergency_contact_phone, move_in_date, pending_approval)
    VALUES ('a35ef381-2e80-425d-be09-ad1a9e829b3c', '302', 850, 'owner_occupied', 'Emergency Contact C', '+1-555-0303', '2025-03-01', true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM owner_info WHERE unit_number = '1108') THEN
    INSERT INTO owner_info (user_id, unit_number, unit_size_sqft, occupancy_status, emergency_contact_name, emergency_contact_phone, move_in_date, pending_approval)
    VALUES ('a35ef381-2e80-425d-be09-ad1a9e829b3c', '1108', 1100, 'vacant', 'Emergency Contact D', '+1-555-0404', '2021-11-20', false);
  END IF;
END $$;

-- Insert demo finance bills
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM finance_bills WHERE billing_month = '2026-03-01' AND owner_id = 'a35ef381-2e80-425d-be09-ad1a9e829b3c') THEN
    INSERT INTO finance_bills (owner_id, billing_month, unit_size_sqft, rate_per_sqft, fixed_fee, repair_expense, total_amount, status)
    VALUES ('a35ef381-2e80-425d-be09-ad1a9e829b3c', '2026-03-01', 1200, 0.5, 50, 25, 675, 'sent');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM finance_bills WHERE billing_month = '2026-02-01' AND owner_id = 'a35ef381-2e80-425d-be09-ad1a9e829b3c') THEN
    INSERT INTO finance_bills (owner_id, billing_month, unit_size_sqft, rate_per_sqft, fixed_fee, repair_expense, total_amount, status)
    VALUES ('a35ef381-2e80-425d-be09-ad1a9e829b3c', '2026-02-01', 1200, 0.5, 50, 15, 665, 'paid');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM finance_bills WHERE billing_month = '2026-01-01' AND owner_id = 'a35ef381-2e80-425d-be09-ad1a9e829b3c') THEN
    INSERT INTO finance_bills (owner_id, billing_month, unit_size_sqft, rate_per_sqft, fixed_fee, repair_expense, total_amount, status)
    VALUES ('a35ef381-2e80-425d-be09-ad1a9e829b3c', '2026-01-01', 1200, 0.5, 50, 20, 670, 'paid');
  END IF;
END $$;

-- Insert demo votes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM votes WHERE title_en = 'Install Security Cameras in Parking Garage') THEN
    INSERT INTO votes (initiated_by, title_en, title_zh, description_en, description_zh, start_date, end_date, quorum_percentage, status, yes_count, no_count, total_votes)
    VALUES ('a35ef381-2e80-425d-be09-ad1a9e829b3c', 'Install Security Cameras in Parking Garage', '在停车库安装安全摄像?, 'Proposal to install 12 security cameras throughout the underground parking garage for enhanced security', '提议在地下停车库安装12个安全摄像头以加强安全?, NOW() - INTERVAL '2 days', NOW() + INTERVAL '5 days', 20, 'active', 28, 5, 33);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM votes WHERE title_en = 'Upgrade Gym Equipment') THEN
    INSERT INTO votes (initiated_by, title_en, title_zh, description_en, description_zh, start_date, end_date, quorum_percentage, status, yes_count, no_count, total_votes)
    VALUES ('a35ef381-2e80-425d-be09-ad1a9e829b3c', 'Upgrade Gym Equipment', '升级健身房设?, 'Replace old gym equipment with new cardio machines and free weights', '用新的有氧运动机和自由重量器材替换旧的健身设?, NOW() - INTERVAL '4 days', NOW() + INTERVAL '3 days', 20, 'active', 15, 8, 23);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM votes WHERE title_en = 'Allow Pets in Building') THEN
    INSERT INTO votes (initiated_by, title_en, title_zh, description_en, description_zh, start_date, end_date, quorum_percentage, status, yes_count, no_count, total_votes)
    VALUES ('a35ef381-2e80-425d-be09-ad1a9e829b3c', 'Allow Pets in Building', '允许在大楼内养宠?, 'Proposal to allow residents to keep small pets (under 10kg) in their units', '提议允许居民在单元内饲养小型宠物?0公斤以下?, NOW() - INTERVAL '8 days', NOW() - INTERVAL '1 day', 20, 'active', 52, 18, 70);
  END IF;
END $$;

-- Insert demo maintenance requests
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM maintenance_requests WHERE title_en = 'Leaking Pipe in Unit 808') THEN
    INSERT INTO maintenance_requests (submitted_by, title_en, title_zh, description_en, description_zh, estimated_cost, status)
    VALUES ('a35ef381-2e80-425d-be09-ad1a9e829b3c', 'Leaking Pipe in Unit 808', '808单元漏水管道', 'Kitchen sink pipe is leaking, causing water damage to the cabinet', '厨房水槽管道漏水，导致橱柜受?, 500, 'submitted');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM maintenance_requests WHERE title_en = 'Elevator #2 Making Noise') THEN
    INSERT INTO maintenance_requests (submitted_by, title_en, title_zh, description_en, description_zh, estimated_cost, approved_cost, status)
    VALUES ('a35ef381-2e80-425d-be09-ad1a9e829b3c', 'Elevator #2 Making Noise', '2号电梯发出噪?, 'Elevator making grinding noise when going up', '电梯上升时发出摩擦声', 2000, 1800, 'cost_approved');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM maintenance_requests WHERE title_en = 'Broken Light in Hallway') THEN
    INSERT INTO maintenance_requests (submitted_by, title_en, title_zh, description_en, description_zh, estimated_cost, approved_cost, status)
    VALUES ('a35ef381-2e80-425d-be09-ad1a9e829b3c', 'Broken Light in Hallway', '走廊灯损?, 'Light fixture in 8th floor hallway not working', '8楼走廊灯具不工作', 150, 120, 'completed');
  END IF;
END $$;

-- Insert demo communications
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM communications WHERE title_en = 'Add More Bike Racks') THEN
    INSERT INTO communications (posted_by, category, title_en, title_zh, content_en, content_zh, status, like_count)
    VALUES ('a35ef381-2e80-425d-be09-ad1a9e829b3c', 'suggestion', 'Add More Bike Racks', '增加更多自行车架', 'We should add more bike racks in the parking garage. The current ones are always full.', '我们应该在停车库增加更多自行车架。现有的总是满的?, 'pending', 23);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM communications WHERE title_en = 'Pool Opening Hours') THEN
    INSERT INTO communications (posted_by, category, title_en, title_zh, content_en, content_zh, status, like_count)
    VALUES ('a35ef381-2e80-425d-be09-ad1a9e829b3c', 'inquiry', 'Pool Opening Hours', '游泳池开放时?, 'What are the summer opening hours for the pool? Will it be open on weekends?', '游泳池夏季开放时间是什么？周末会开放吗?, 'pending', 8);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM communications WHERE title_en = 'Noise from Construction') THEN
    INSERT INTO communications (posted_by, category, title_en, title_zh, content_en, content_zh, status, like_count)
    VALUES ('a35ef381-2e80-425d-be09-ad1a9e829b3c', 'complaint', 'Noise from Construction', '施工噪音', 'Construction noise starts too early in the morning. Can we push start time to 9am?', '施工噪音开始得太早了。我们能把开始时间推迟到上午9点吗?, 'pending', 15);
  END IF;
END $$;

-- Insert demo procurement jobs
DO $$
DECLARE
  job1_id UUID;
  job2_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM procurement_jobs WHERE title_en = 'Elevator Maintenance Contract') THEN
    INSERT INTO procurement_jobs (posted_by, title_en, title_zh, description_en, description_zh, estimated_budget, status)
    VALUES ('a35ef381-2e80-425d-be09-ad1a9e829b3c', 'Elevator Maintenance Contract', '电梯维护合同', 'Annual maintenance contract for all 4 elevators in the building', '楼内全部4部电梯的年度维护合同', 50000, 'collecting_quotes');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM procurement_jobs WHERE title_en = 'Lobby Renovation') THEN
    INSERT INTO procurement_jobs (posted_by, title_en, title_zh, description_en, description_zh, estimated_budget, status)
    VALUES ('a35ef381-2e80-425d-be09-ad1a9e829b3c', 'Lobby Renovation', '大堂翻新', 'Complete renovation of main lobby including flooring and lighting', '主大堂全面翻新，包括地板和照?, 120000, 'collecting_quotes');
  END IF;

  -- Add quotes for procurement jobs
  SELECT id INTO job1_id FROM procurement_jobs WHERE title_en = 'Elevator Maintenance Contract' LIMIT 1;
  SELECT id INTO job2_id FROM procurement_jobs WHERE title_en = 'Lobby Renovation' LIMIT 1;

  IF job1_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM procurement_quotes WHERE job_id = job1_id AND vendor_name = 'ElevatorPro Services') THEN
      INSERT INTO procurement_quotes (job_id, vendor_name, vendor_contact, quoted_amount, description_en, description_zh, submitted_by)
      VALUES (job1_id, 'ElevatorPro Services', 'contact@elevatorpro.com', 48000, 'Quarterly maintenance with 24/7 emergency support', '季度维护，含24/7紧急支?, 'a35ef381-2e80-425d-be09-ad1a9e829b3c');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM procurement_quotes WHERE job_id = job1_id AND vendor_name = 'LiftTech Solutions') THEN
      INSERT INTO procurement_quotes (job_id, vendor_name, vendor_contact, quoted_amount, description_en, description_zh, submitted_by)
      VALUES (job1_id, 'LiftTech Solutions', 'info@lifttech.com', 52000, 'Monthly maintenance with parts replacement included', '月度维护，含零件更换', 'a35ef381-2e80-425d-be09-ad1a9e829b3c');
    END IF;
  END IF;

  IF job2_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM procurement_quotes WHERE job_id = job2_id AND vendor_name = 'Premium Renovations') THEN
      INSERT INTO procurement_quotes (job_id, vendor_name, vendor_contact, quoted_amount, description_en, description_zh, submitted_by)
      VALUES (job2_id, 'Premium Renovations', 'sales@premiumreno.com', 115000, 'High-end materials with 2-year warranty', '高端材料，含2年保?, 'a35ef381-2e80-425d-be09-ad1a9e829b3c');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM procurement_quotes WHERE job_id = job2_id AND vendor_name = 'Modern Interiors') THEN
      INSERT INTO procurement_quotes (job_id, vendor_name, vendor_contact, quoted_amount, description_en, description_zh, submitted_by)
      VALUES (job2_id, 'Modern Interiors', 'hello@moderninteriors.com', 118000, 'Designer finishes with 3-year warranty', '设计师级装修，含3年保?, 'a35ef381-2e80-425d-be09-ad1a9e829b3c');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM procurement_quotes WHERE job_id = job2_id AND vendor_name = 'BuildRight Co') THEN
      INSERT INTO procurement_quotes (job_id, vendor_name, vendor_contact, quoted_amount, description_en, description_zh, submitted_by)
      VALUES (job2_id, 'BuildRight Co', 'info@buildright.com', 122000, 'Premium materials with 5-year warranty', '优质材料，含5年保?, 'a35ef381-2e80-425d-be09-ad1a9e829b3c');
    END IF;
  END IF;
END $$;

-- Insert demo hiring jobs
DO $$
DECLARE
  job1_id UUID;
  job2_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM hiring_jobs WHERE title_en = 'Property Manager') THEN
    INSERT INTO hiring_jobs (posted_by, title_en, title_zh, description_en, description_zh, probation_months, status)
    VALUES ('a35ef381-2e80-425d-be09-ad1a9e829b3c', 'Property Manager', '物业经理', 'Experienced property manager to oversee daily operations and maintenance', '有经验的物业经理，负责日常运营和维护', 3, 'in_review');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM hiring_jobs WHERE title_en = 'Security Guard') THEN
    INSERT INTO hiring_jobs (posted_by, title_en, title_zh, description_en, description_zh, probation_months, status)
    VALUES ('a35ef381-2e80-425d-be09-ad1a9e829b3c', 'Security Guard', '保安人员', 'Night shift security guard for building entrance and parking', '夜班保安，负责大楼入口和停车?, 2, 'open');
  END IF;

  -- Add candidates for hiring jobs
  SELECT id INTO job1_id FROM hiring_jobs WHERE title_en = 'Property Manager' LIMIT 1;
  SELECT id INTO job2_id FROM hiring_jobs WHERE title_en = 'Security Guard' LIMIT 1;

  IF job1_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM hiring_candidates WHERE job_id = job1_id AND candidate_name = 'David Lee') THEN
      INSERT INTO hiring_candidates (job_id, candidate_name, candidate_contact, council_score, owner_score, total_score, status, recommended_by)
      VALUES (job1_id, 'David Lee', 'david.lee@email.com', 85, 90, 87.5, 'interview', 'a35ef381-2e80-425d-be09-ad1a9e829b3c');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM hiring_candidates WHERE job_id = job1_id AND candidate_name = 'Emma Zhang') THEN
      INSERT INTO hiring_candidates (job_id, candidate_name, candidate_contact, council_score, owner_score, total_score, status, recommended_by)
      VALUES (job1_id, 'Emma Zhang', 'emma.z@email.com', 92, 88, 90, 'interview', 'a35ef381-2e80-425d-be09-ad1a9e829b3c');
    END IF;
  END IF;

  IF job2_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM hiring_candidates WHERE job_id = job2_id AND candidate_name = 'James Wilson') THEN
      INSERT INTO hiring_candidates (job_id, candidate_name, candidate_contact, status, recommended_by)
      VALUES (job2_id, 'James Wilson', 'james.w@email.com', 'pending', 'a35ef381-2e80-425d-be09-ad1a9e829b3c');
    END IF;
  END IF;
END $$;



