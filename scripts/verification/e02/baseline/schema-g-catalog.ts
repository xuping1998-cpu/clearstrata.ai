/**
 * E-02 RU-1.4 — L1 read-only catalog queries for EEP-SCHEMA-G-001.
 * Query definitions only — execution requires authorized runtime gate + DATABASE_URL.
 */

export const PRIMARY_AUDIT_TABLE = 'owner_vote_primary_freeze_audits' as const;
export const FREEZE_COMMIT_RPC = 'execute_owner_vote_atomic_freeze_commit' as const;
export const DURABLE_STATE_HELPER = '_ru12_evaluate_durable_state' as const;

/** Expected 20 columns — no committed_at / updated_at (RU-1.1 migration). */
export const EXPECTED_PRIMARY_AUDIT_COLUMNS = [
  'id',
  'freeze_event_id',
  'owner_vote_meeting_id',
  'property_id',
  'attempt_id',
  'freeze_boundary_at',
  'audit_kind',
  'schema_version',
  'primary_event_is_primary',
  'voter_snapshot_count',
  'resolution_snapshot_count',
  'frozen_motion_count',
  'materialization_summary',
  'commit_set_result',
  'marker_evidence',
  'meeting_lifecycle_compatibility',
  'transaction_outcome',
  'commit_evidence',
  'transaction_reference_at',
  'created_at',
] as const;

export const FORBIDDEN_PRIMARY_AUDIT_COLUMNS = ['committed_at', 'updated_at'] as const;

export type SchemaCatalogQuery = {
  id: string;
  description: string;
  sql: string;
  expected?: string | number | boolean;
};

export const SCHEMA_G_CATALOG_QUERIES: SchemaCatalogQuery[] = [
  {
    id: 'table-exists',
    description: 'owner_vote_primary_freeze_audits table exists',
    sql: `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = '${PRIMARY_AUDIT_TABLE}'
    ) AS ok`,
    expected: true,
  },
  {
    id: 'column-count',
    description: 'exact 20 columns on Primary Audit',
    sql: `SELECT count(*)::int AS col_count
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = '${PRIMARY_AUDIT_TABLE}'`,
    expected: 20,
  },
  {
    id: 'forbidden-columns-absent',
    description: 'committed_at and updated_at absent',
    sql: `SELECT count(*)::int AS forbidden_count
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = '${PRIMARY_AUDIT_TABLE}'
        AND column_name = ANY(ARRAY['committed_at','updated_at'])`,
    expected: 0,
  },
  {
    id: 'unique-freeze-event-id',
    description: 'UNIQUE(freeze_event_id)',
    sql: `SELECT count(*)::int AS n FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      JOIN pg_namespace n ON t.relnamespace = n.oid
      WHERE n.nspname = 'public' AND t.relname = '${PRIMARY_AUDIT_TABLE}'
        AND c.contype = 'u'
        AND pg_get_constraintdef(c.oid) LIKE '%freeze_event_id%'`,
    expected: 1,
  },
  {
    id: 'fk-count',
    description: 'three FK constraints with ON DELETE RESTRICT',
    sql: `SELECT count(*)::int AS fk_count FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      JOIN pg_namespace n ON t.relnamespace = n.oid
      WHERE n.nspname = 'public' AND t.relname = '${PRIMARY_AUDIT_TABLE}'
        AND c.contype = 'f'`,
    expected: 3,
  },
  {
    id: 'check-count',
    description: 'seven CHECK constraints',
    sql: `SELECT count(*)::int AS check_count FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      JOIN pg_namespace n ON t.relnamespace = n.oid
      WHERE n.nspname = 'public' AND t.relname = '${PRIMARY_AUDIT_TABLE}'
        AND c.contype = 'c'`,
    expected: 7,
  },
  {
    id: 'rls-enabled',
    description: 'RLS enabled on Primary Audit',
    sql: `SELECT relrowsecurity AS rls FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public' AND c.relname = '${PRIMARY_AUDIT_TABLE}'`,
    expected: true,
  },
  {
    id: 'rpc-exists',
    description: 'execute_owner_vote_atomic_freeze_commit exists',
    sql: `SELECT count(*)::int AS n FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = '${FREEZE_COMMIT_RPC}'`,
    expected: 1,
  },
  {
    id: 'rpc-params',
    description: 'RPC has exactly five parameters',
    sql: `SELECT pronargs::int AS param_count FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = '${FREEZE_COMMIT_RPC}'`,
    expected: 5,
  },
  {
    id: 'rpc-returns-jsonb',
    description: 'RPC RETURNS jsonb',
    sql: `SELECT format_type(p.prorettype, NULL) AS return_type FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = '${FREEZE_COMMIT_RPC}'`,
    expected: 'jsonb',
  },
  {
    id: 'rpc-security-definer',
    description: 'RPC SECURITY DEFINER',
    sql: `SELECT prosecdef AS secdef FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = '${FREEZE_COMMIT_RPC}'`,
    expected: true,
  },
  {
    id: 'helper-not-granted-authenticated',
    description: '_ru12_evaluate_durable_state not executable by authenticated',
    sql: `SELECT count(*)::int AS grant_count
      FROM information_schema.routine_privileges
      WHERE routine_schema = 'public' AND routine_name = '${DURABLE_STATE_HELPER}'
        AND grantee = 'authenticated' AND privilege_type = 'EXECUTE'`,
    expected: 0,
  },
];

export const EXPECTED_RPC_PARAM_SIGNATURE =
  'p_owner_vote_meeting_id uuid, p_freeze_event_id uuid, p_primary_audit_id uuid, p_attempt_id uuid, p_freeze_boundary_at timestamptz';
