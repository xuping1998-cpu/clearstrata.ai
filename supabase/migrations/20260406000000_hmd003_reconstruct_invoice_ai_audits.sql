-- PAD-051 AUTHORIZED HISTORICAL SCHEMA-ORIGIN RECONSTRUCTION
-- HMD-003 · E-02-HFSOR-IA
-- Exact historical DDL unavailable
-- Minimum evidence-supported reconstruction — not restored original SQL
-- Not source restoration
-- Not original historical migration
-- Not production schema backfill
--
-- public.invoice_ai_audits = ORIGIN_AFTER_FIRST_HARD_DEPENDENCY
-- S1 chronology-preservation stub only.
-- Does not claim 20260711120000 CREATE TABLE executed in this window.
-- Later CREATE TABLE IF NOT EXISTS remains in the unedited July migration.

CREATE TABLE public.invoice_ai_audits (
  invoice_id uuid,
  property_id uuid,
  risk_score numeric,
  risk_level text,
  ai_reasons jsonb,
  ai_summary_zh text,
  ai_summary_en text,
  updated_at timestamptz,
  fiscal_year int,
  status text
);
