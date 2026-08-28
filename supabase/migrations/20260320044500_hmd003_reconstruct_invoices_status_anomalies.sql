-- PAD-051 AUTHORIZED HISTORICAL SCHEMA-ORIGIN RECONSTRUCTION
-- HMD-003 · E-02-HFSOR-IA
-- Exact historical DDL unavailable
-- Minimum evidence-supported reconstruction — not restored original SQL
-- Not source restoration
-- Not original historical migration
-- Not production schema backfill

-- invoice_status object kind = PostgreSQL ENUM / PROVEN
-- Exact initial label set = INFERRED WITH EVIDENCE /
-- AUTHORIZED BY E-02-HFSOR-IA UNDER PAD-051
-- Exact label set is NOT claimed PROVEN.
-- Later ALTER TYPE ADD VALUE migrations remain responsible for later labels.

CREATE TYPE invoice_status AS ENUM (
  'pending_review',
  'ai_processing',
  'approved',
  'paid',
  'rejected',
  'flagged'
);

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY,
  uploaded_by uuid,
  procurement_job_id uuid,
  status invoice_status,
  created_at timestamptz
);

-- procurement_job_id = PROVEN requirement
-- invoice_id = INFERRED WITH EVIDENCE / IA ACKNOWLEDGED

CREATE TABLE public.financial_anomalies (
  procurement_job_id uuid,
  invoice_id uuid
);
