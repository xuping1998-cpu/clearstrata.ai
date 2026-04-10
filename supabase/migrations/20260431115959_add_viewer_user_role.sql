-- Standalone migration: enum value must commit before use in same DB session in some setups.
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'viewer';




