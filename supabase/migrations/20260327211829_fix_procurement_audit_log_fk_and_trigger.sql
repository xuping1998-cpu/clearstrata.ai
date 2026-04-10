/*
  # Fix procurement_audit_log foreign key and delete trigger

  1. Changes
    - Make `job_id` column nullable on `procurement_audit_log`
    - Change foreign key constraint from ON DELETE CASCADE to ON DELETE SET NULL
    - Update the audit trigger to skip logging DELETE operations
      (the frontend writes the audit log entry before deleting the job)

  2. Why
    - The AFTER DELETE trigger on procurement_jobs tries to INSERT into
      procurement_audit_log with the deleted job's ID, but the FK constraint
      causes a violation because the referenced row no longer exists.
    - By using SET NULL, existing audit logs are preserved with a null job_id
      when a job is deleted.
    - By skipping DELETE in the trigger, we avoid the circular dependency entirely.
*/

-- Step 1: Make job_id nullable
ALTER TABLE procurement_audit_log ALTER COLUMN job_id DROP NOT NULL;

-- Step 2: Change FK constraint to ON DELETE SET NULL
ALTER TABLE procurement_audit_log DROP CONSTRAINT IF EXISTS procurement_audit_log_job_id_fkey;

ALTER TABLE procurement_audit_log
  ADD CONSTRAINT procurement_audit_log_job_id_fkey
  FOREIGN KEY (job_id) REFERENCES procurement_jobs(id)
  ON DELETE SET NULL;

-- Step 3: Update the trigger function to skip DELETE operations
CREATE OR REPLACE FUNCTION log_procurement_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  INSERT INTO procurement_audit_log (job_id, action, performed_by, old_data, new_data)
  VALUES (
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    auth.uid(),
    CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
    row_to_json(NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



