/*
  # Add floor plan support to procurement jobs

  1. Modified Tables
    - `procurement_jobs`
      - `floor_plan_text` (text) - Extracted text content from uploaded floor plan PDF
      - `floor_plan_url` (text) - Storage URL of the uploaded floor plan PDF
      - `ai_material_calc` (text) - AI-calculated material quantities and breakdown

  2. Notes
    - These columns support the enhanced AI pricing feature where users upload
      floor plan PDFs and the AI extracts area measurements to calculate
      material quantities and generate more accurate cost estimates.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'procurement_jobs' AND column_name = 'floor_plan_text'
  ) THEN
    ALTER TABLE procurement_jobs ADD COLUMN floor_plan_text text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'procurement_jobs' AND column_name = 'floor_plan_url'
  ) THEN
    ALTER TABLE procurement_jobs ADD COLUMN floor_plan_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'procurement_jobs' AND column_name = 'ai_material_calc'
  ) THEN
    ALTER TABLE procurement_jobs ADD COLUMN ai_material_calc text;
  END IF;
END $$;
