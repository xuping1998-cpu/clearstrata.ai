-- HMD-009 governed historical clean-replay compatibility reconstruction.
-- E-02-HFSOR-IA-003 · PAD-057 Option B.
-- Recreates public.hiring_jobs and public.hiring_candidates after the
-- intentional 20260315010915 DROP, immediately before immutable
-- 20260405120000_multi_tenant_properties.sql.
-- CREATE TABLE contracts copied from 20260314034834_create_strata_schema.sql.
-- ENABLE RLS only. No policies. No indexes. No property_id. No data.
-- Enums hiring_status / candidate_status are referenced, not recreated.
-- Not historical source. Not source restoration. Target unchanged. DROP unchanged.

CREATE TABLE IF NOT EXISTS hiring_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posted_by uuid REFERENCES profiles(id) NOT NULL,
  title_en text NOT NULL,
  title_zh text,
  description_en text NOT NULL,
  description_zh text,
  probation_months integer DEFAULT 3,
  status hiring_status DEFAULT 'open',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hiring_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES hiring_jobs(id) ON DELETE CASCADE,
  candidate_name text NOT NULL,
  candidate_contact text,
  recommended_by uuid REFERENCES profiles(id),
  council_score numeric CHECK (council_score >= 0 AND council_score <= 100),
  owner_score numeric CHECK (owner_score >= 0 AND owner_score <= 100),
  total_score numeric,
  status candidate_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE hiring_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE hiring_candidates ENABLE ROW LEVEL SECURITY;
