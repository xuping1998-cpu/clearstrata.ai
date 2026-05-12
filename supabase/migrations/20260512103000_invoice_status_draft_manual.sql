-- Manual single-file upload fallback: OCR could not confidently pre-fill (not in council review queue).
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'draft_manual';
