-- HMD-005 governed historical clean-replay compatibility reconstruction.
-- E-02-HFSOR-IA-002 · PAD-053 Option B.
-- Establishes committed public.user_role.admin before immutable
-- 20260329103000_add_admin_user_role_and_policy.sql.
-- Not historical source. Not source restoration. Target unchanged.

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin';
