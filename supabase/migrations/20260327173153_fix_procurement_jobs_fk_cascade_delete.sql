/*
  # Fix foreign keys blocking procurement_jobs deletion

  1. Changes
    - Update foreign keys on `disputes`, `financial_anomalies`, `invoices`,
      `meeting_agenda_items`, and `price_history` that reference `procurement_jobs`
    - Change delete rule from NO ACTION to SET NULL so deleting a job
      does not get blocked by child rows

  2. Affected Tables
    - `disputes.related_procurement_job_id` -> SET NULL on delete
    - `financial_anomalies.procurement_job_id` -> SET NULL on delete
    - `invoices.procurement_job_id` -> SET NULL on delete
    - `meeting_agenda_items.linked_procurement_id` -> SET NULL on delete
    - `price_history.job_id` -> SET NULL on delete
*/

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT rc.constraint_name FROM information_schema.referential_constraints rc
    JOIN information_schema.key_column_usage kcu ON rc.constraint_name = kcu.constraint_name
    WHERE kcu.table_name = 'disputes' AND kcu.column_name = 'related_procurement_job_id'
      AND rc.delete_rule = 'NO ACTION'
  LOOP
    EXECUTE format('ALTER TABLE disputes DROP CONSTRAINT %I', r.constraint_name);
  END LOOP;
  ALTER TABLE disputes
    ADD CONSTRAINT disputes_related_procurement_job_id_fkey
    FOREIGN KEY (related_procurement_job_id) REFERENCES procurement_jobs(id) ON DELETE SET NULL;

  FOR r IN
    SELECT rc.constraint_name FROM information_schema.referential_constraints rc
    JOIN information_schema.key_column_usage kcu ON rc.constraint_name = kcu.constraint_name
    WHERE kcu.table_name = 'financial_anomalies' AND kcu.column_name = 'procurement_job_id'
      AND rc.delete_rule = 'NO ACTION'
  LOOP
    EXECUTE format('ALTER TABLE financial_anomalies DROP CONSTRAINT %I', r.constraint_name);
  END LOOP;
  ALTER TABLE financial_anomalies
    ADD CONSTRAINT financial_anomalies_procurement_job_id_fkey
    FOREIGN KEY (procurement_job_id) REFERENCES procurement_jobs(id) ON DELETE SET NULL;

  FOR r IN
    SELECT rc.constraint_name FROM information_schema.referential_constraints rc
    JOIN information_schema.key_column_usage kcu ON rc.constraint_name = kcu.constraint_name
    WHERE kcu.table_name = 'invoices' AND kcu.column_name = 'procurement_job_id'
      AND rc.delete_rule = 'NO ACTION'
  LOOP
    EXECUTE format('ALTER TABLE invoices DROP CONSTRAINT %I', r.constraint_name);
  END LOOP;
  ALTER TABLE invoices
    ADD CONSTRAINT invoices_procurement_job_id_fkey
    FOREIGN KEY (procurement_job_id) REFERENCES procurement_jobs(id) ON DELETE SET NULL;

  FOR r IN
    SELECT rc.constraint_name FROM information_schema.referential_constraints rc
    JOIN information_schema.key_column_usage kcu ON rc.constraint_name = kcu.constraint_name
    WHERE kcu.table_name = 'meeting_agenda_items' AND kcu.column_name = 'linked_procurement_id'
      AND rc.delete_rule = 'NO ACTION'
  LOOP
    EXECUTE format('ALTER TABLE meeting_agenda_items DROP CONSTRAINT %I', r.constraint_name);
  END LOOP;
  ALTER TABLE meeting_agenda_items
    ADD CONSTRAINT meeting_agenda_items_linked_procurement_id_fkey
    FOREIGN KEY (linked_procurement_id) REFERENCES procurement_jobs(id) ON DELETE SET NULL;

  FOR r IN
    SELECT rc.constraint_name FROM information_schema.referential_constraints rc
    JOIN information_schema.key_column_usage kcu ON rc.constraint_name = kcu.constraint_name
    WHERE kcu.table_name = 'price_history' AND kcu.column_name = 'job_id'
      AND rc.delete_rule = 'NO ACTION'
  LOOP
    EXECUTE format('ALTER TABLE price_history DROP CONSTRAINT %I', r.constraint_name);
  END LOOP;
  ALTER TABLE price_history
    ADD CONSTRAINT price_history_job_id_fkey
    FOREIGN KEY (job_id) REFERENCES procurement_jobs(id) ON DELETE SET NULL;
END $$;
