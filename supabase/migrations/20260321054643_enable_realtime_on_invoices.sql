/*
  # Enable Realtime on invoices table

  1. Changes
    - Add `invoices` table to the `supabase_realtime` publication
    - This allows the frontend to subscribe to real-time changes
      (INSERT, UPDATE, DELETE) on the invoices table

  2. Purpose
    - After an invoice is uploaded and the AI OCR edge function
      finishes processing, the frontend can detect the status
      change from `ai_processing` to `pending_review` (or
      `ai_extraction_failed`) without requiring a manual page refresh
*/

ALTER PUBLICATION supabase_realtime ADD TABLE invoices;




