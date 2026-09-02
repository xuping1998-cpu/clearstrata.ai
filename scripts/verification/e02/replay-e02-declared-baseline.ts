/**
 * E-02 — Governed Baseline-Compatibility Replay Artifact
 * ------------------------------------------------------
 * Implements: E02_DECLARED_BASELINE_REPLAY  (LOCAL_DISPOSABLE_SUPABASE only)
 * Clean-base model (CB-B): AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS — RETAINED
 *
 * Authority (consumed):
 *   - E-02-BCR-IA-003    docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Authorization-003.md
 *                        (BCR-CB-002 launcher · BCR-CB-003 lifecycle · BCR-CB-004 gate · runtime DBA ID)
 *   - Design amendment-002 docs/implementation/E-02-Baseline-Compatibility-Replay-Clean-Base-Design-Amendment-002.md
 *   - E-02-BCR-IA-002    (predecessor / historical / immutable — CB-B redesign)
 *   - E-02-BCR-IA        (predecessor / historical / immutable)
 *   - PAD-026..PAD-038   docs/implementation/E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md
 *
 * Class C baseline-compatibility artifact. This is NOT a migration, NOT a seed,
 * NOT an RU-1.4 evidence test, NOT a production tool, and NOT a generic migration skipper.
 *
 * BCR-CB-002: portable Supabase CLI launcher (Windows ComSpec /d /s /c + npx supabase; non-Windows direct npx).
 * BCR-CB-003: success apply writes manifest then PRESERVES the auxiliary environment for an external
 *             DBA baseline verifier; explicit --cleanup tears it down afterward. Failure = diagnostics
 *             + manifest + best-effort cleanup. Unconditional success-path finally-cleanup is REMOVED.
 * BCR-CB-004: recorded here as status; the DBA baseline gate lives in verify-db-baseline.ts
 *             (E02_BASELINE_VERIFICATION_AUTHORIZED — distinct from RU-1.4).
 *
 * Runtime DBA execution authority is E02_DBA_AUTHORIZATION_ID, exact-pinned to E-02-DBA-LOCAL-004.
 * ARTIFACT_AUTHORIZATION_ID is static IA metadata and is NOT DBA execution authority.
 *
 * Truthful-history contract (unchanged):
 *   - Apply every NON-quarantined migration in deterministic order.
 *   - Record in supabase_migrations.schema_migrations EXACTLY and ONLY migrations actually applied.
 *   - OMIT the quarantined migration (never executed → never recorded). NEVER fabricate an applied row.
 *   - `supabase migration repair` and any fake applied-state manipulation are PROHIBITED.
 *   - Platform migration histories (auth.schema_migrations, storage.migrations) are NEVER touched.
 *
 * Repository-implementation authority ≠ execution authority. Running apply / preserve / cleanup is
 * governed by E-02-DBA-LOCAL-004 (not issued by IA-003) and additionally gated below.
 */

import { readFile, readdir, mkdir, writeFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// SECTION 1 — Authority-locked constants
// ---------------------------------------------------------------------------

// Static artifact metadata — which Implementation Authorization implemented this artifact.
// This is NOT DBA execution authority.
export const ARTIFACT_AUTHORIZATION_ID = 'E-02-BCR-IA-019' as const;

// Runtime DBA execution authority (IA-003 §10/§11/§24/§25). Apply / preserve / cleanup require
// process.env.E02_DBA_AUTHORIZATION_ID to equal EXACTLY this value — no prefix match, no regex,
// no arbitrary DBA id, no per-run source edit.
export const EXPECTED_DBA_AUTHORIZATION_ID = 'E-02-DBA-LOCAL-019' as const;
export const DBA_AUTHORIZATION_ENV = 'E02_DBA_AUTHORIZATION_ID' as const;

export const BASELINE_MODE = 'E02_DECLARED_BASELINE_REPLAY' as const;
export const ENVIRONMENT_CLASS = 'LOCAL_DISPOSABLE_SUPABASE' as const;
export const CLEAN_BASE_MODE = 'AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS' as const;
export const BCR_CB_001_STATUS = 'IMPLEMENTED_RUNTIME_PENDING' as const;
export const BCR_CB_002_STATUS = 'IMPLEMENTED_RUNTIME_PENDING' as const;
export const BCR_CB_003_STATUS = 'IMPLEMENTED_RUNTIME_PENDING' as const;
export const BCR_CB_004_STATUS = 'IMPLEMENTED_RUNTIME_PENDING' as const;

const CLI_MAX_BUFFER = 32 * 1024 * 1024;
const CLI_TIMEOUT_MS = 15 * 60 * 1000;
/** IA-006: conservative diagnostic excerpts (head + tail). Not unlimited process dumps. */
const CLI_DIAGNOSTIC_HEAD_BYTES = 8 * 1024;
const CLI_DIAGNOSTIC_TAIL_BYTES = 8 * 1024;

/** Hard-coded Supabase subcommand allowlist (BCR-CB-002). No generic CLI proxy. */
export type SupabaseSubcommand = 'init' | 'start' | 'status' | 'stop';
const SUPABASE_SUBCOMMAND_ALLOWLIST: readonly SupabaseSubcommand[] = Object.freeze([
  'init',
  'start',
  'status',
  'stop',
]);

export type CliLauncherMode = 'WINDOWS_COMSPEC_NPX' | 'DIRECT_NPX';
export type AuxiliaryEnvironmentDisposition =
  | 'RUNNING_FOR_BASELINE_VERIFY'
  | 'CLEANED_AFTER_FAILURE'
  | 'CLEANED_AFTER_VERIFY';

/** Single authority-locked quarantine. No env override. No CLI override. No wildcard. No regex. */
export const QUARANTINED_MIGRATION = '20260314195641_add_demo_data.sql' as const;
export const QUARANTINE_ALLOWLIST: readonly string[] = Object.freeze([QUARANTINED_MIGRATION]);
export const QUARANTINE_REASON = 'HISTORICAL_DEMO_EXTERNAL_STATE_DEPENDENCY' as const;
export const HISTORICAL_DEFECT = 'HMD-001' as const;
export const QUARANTINE_AUTHORITY =
  'E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision (PAD-026-PAD-038)' as const;

export const RU_1_1_MIGRATION = '20261729120000_create_owner_vote_primary_freeze_audits.sql' as const;
export const RU_1_2_MIGRATION = '20261821120000_create_execute_owner_vote_atomic_freeze_commit.sql' as const;

/**
 * Known legacy demo identities. Presence in any migration NEWER than the quarantine
 * would indicate a downstream dependency and must STOP → governance.
 * Deterministic, obvious-reference scan — NOT a complete SQL dependency proof.
 */
const LEGACY_DEMO_IDENTIFIERS: readonly string[] = Object.freeze([
  'a35ef381-2e80-425d-be09-ad1a9e829b3c',
]);

/** Schema-changing lexemes rejected for the quarantined DATA_ONLY migration. Lexical only. */
const SCHEMA_CHANGE_PATTERNS: readonly RegExp[] = Object.freeze([
  /\bCREATE\s+TABLE\b/i,
  /\bALTER\s+TABLE\b/i,
  /\bDROP\s+TABLE\b/i,
  /\bCREATE\s+(OR\s+REPLACE\s+)?FUNCTION\b/i,
  /\bALTER\s+FUNCTION\b/i,
  /\bDROP\s+FUNCTION\b/i,
  /\bCREATE\s+POLICY\b/i,
  /\bALTER\s+POLICY\b/i,
  /\bDROP\s+POLICY\b/i,
  /\bCREATE\s+TRIGGER\b/i,
  /\bDROP\s+TRIGGER\b/i,
  /\bCREATE\s+(UNIQUE\s+)?INDEX\b/i,
  /\bDROP\s+INDEX\b/i,
]);

/** Operator knobs that would broaden authority. Their presence is a hard STOP. */
const FORBIDDEN_ARG_PREFIXES: readonly string[] = Object.freeze([
  '--skip',
  '--migration',
  '--target-db',
  '--quarantine',
  '--db',
  '--exclude',
  '--workdir', // auxiliary workdir is artifact-managed; not operator-selectable
]);
const FORBIDDEN_ENV_PATTERNS: readonly RegExp[] = Object.freeze([
  /^E02_QUARANTINE/i,
  /^E02_BCR_SKIP/i,
  /^E02_SKIP_MIGRATION/i,
  /^E02_EXTRA_QUARANTINE/i,
  /^E02_AUX_WORKDIR/i, // auxiliary workdir must not be operator-supplied
]);

const ALLOWED_FLAGS: readonly string[] = Object.freeze([
  '--apply',
  '--plan',
  '--help',
  '--cleanup',
  '--preserve-environment',
]);

/** Authoritative application-migration source = the REAL repository migrations directory. */
const REAL_REPOSITORY_ROOT = path.resolve(process.cwd());
const REAL_REPOSITORY_MIGRATION_DIR = path.resolve(REAL_REPOSITORY_ROOT, 'supabase', 'migrations');
const REAL_REPOSITORY_MIGRATION_SOURCE_REL = 'supabase/migrations';
const MIGRATION_FILENAME_RE = /^(\d{14})_(.+)\.sql$/;
const SAFE_RUN_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/;
const AUX_DIR_NAME_RE = /^e02-bcr-aux-[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/;

/** Sanitized descriptor for the OS temp base (never leak absolute user paths into evidence). */
const OS_TMP_PLACEHOLDER = '<OS_TMP>';

// ---------------------------------------------------------------------------
// SECTION 2 — Types
// ---------------------------------------------------------------------------

export type ReplayMode = 'plan' | 'apply' | 'cleanup';

export type ParsedMigration = {
  filename: string;
  version: string;
  name: string;
  quarantined: boolean;
};

export type CommandTemplate = {
  purpose: string;
  command: string;
  args: string[];
  cwdRole: 'auxiliaryWorkdir';
};

export type ReplayManifest = {
  artifactAuthorizationId: typeof ARTIFACT_AUTHORIZATION_ID;
  expectedDbaAuthorizationId: typeof EXPECTED_DBA_AUTHORIZATION_ID;
  validatedDbaAuthorizationId: string | null; // set only after exact runtime validation
  authorizationId: string | null; // dual-authority-safe: equals validatedDbaAuthorizationId after validation, else null
  baselineMode: typeof BASELINE_MODE;
  environmentClass: typeof ENVIRONMENT_CLASS;
  cleanBaseMode: typeof CLEAN_BASE_MODE;
  mode: ReplayMode;
  preserveEnvironment: boolean;
  quarantinedMigrations: string[];
  quarantineCount: number;
  quarantineReason: typeof QUARANTINE_REASON;
  quarantineAuthority: typeof QUARANTINE_AUTHORITY;
  historicalDefect: typeof HISTORICAL_DEFECT;
  migrationFileModified: false;
  migrationCountDiscovered: number;
  migrationCountExecuted: number;
  migrationCountQuarantined: number;
  nonTimestampedSqlFiles: string[];
  ru11Migration: typeof RU_1_1_MIGRATION;
  ru12Migration: typeof RU_1_2_MIGRATION;
  ru11Reached: boolean;
  ru12Reached: boolean;
  auxiliaryWorkdir: string; // sanitized descriptor
  auxiliaryProjectRef: string | null;
  auxiliaryMigrationCountBeforeStart: number | null;
  platformBaselineReady: boolean;
  applicationMigrationHistoryInitiallyEmpty: boolean;
  realRepositoryMigrationSource: typeof REAL_REPOSITORY_MIGRATION_SOURCE_REL;
  freshAuxiliaryProject: boolean;
  platformHistoryPreserved: boolean;
  bcrCb001Status: typeof BCR_CB_001_STATUS;
  cliLauncherMode: CliLauncherMode;
  cliLauncherPlatform: string;
  bcrCb002Status: typeof BCR_CB_002_STATUS;
  auxiliaryEnvironmentDisposition: AuxiliaryEnvironmentDisposition | null;
  baselineVerificationPending: boolean;
  cleanupRequired: boolean;
  cleanupCompleted: boolean;
  bcrCb003Status: typeof BCR_CB_003_STATUS;
  bcrCb004Status: typeof BCR_CB_004_STATUS;
  commandTemplates: CommandTemplate[];
  cleanupWarnings: string[];
  result: 'PLAN_OK' | 'APPLIED' | 'BLOCKED' | 'APPLICATION_FAILED' | 'CLEANED' | 'CLEANUP_FAILED';
  failures: string[];
  environmentValidated: boolean;
  startedAt: string;
  finishedAt: string;
  repositoryRef: string | null;
  /** IA-006 diagnostic observability — populated only on CLI process failure; otherwise null. */
  cliFailureSubcommand: SupabaseSubcommand | null;
  cliFailureClass: 'PROCESS_DID_NOT_START' | 'PROCESS_EXITED_NONZERO' | null;
  cliExitCode: number | null;
  cliSignal: string | null;
  cliElapsedMs: number | null;
  cliStdoutExcerpt: string | null;
  cliStderrExcerpt: string | null;
  cliStdoutTruncated: boolean | null;
  cliStderrTruncated: boolean | null;
  cliDebugEnabled: boolean | null;
  cliTimedOut: boolean | null;
};

export type CliProcessDiagnostics = {
  cliFailureSubcommand: SupabaseSubcommand;
  cliFailureClass: 'PROCESS_DID_NOT_START' | 'PROCESS_EXITED_NONZERO';
  cliExitCode: number | null;
  cliSignal: string | null;
  cliElapsedMs: number;
  cliStdoutExcerpt: string;
  cliStderrExcerpt: string;
  cliStdoutTruncated: boolean;
  cliStderrTruncated: boolean;
  cliDebugEnabled: boolean;
  cliTimedOut: boolean;
};

export type ResolvedCli = {
  mode: ReplayMode;
  preserveEnvironment: boolean;
};

// ---------------------------------------------------------------------------
// SECTION 3 — Small helpers
// ---------------------------------------------------------------------------

class ReplayStop extends Error {
  readonly diagnostics: CliProcessDiagnostics | null;
  constructor(message: string, diagnostics: CliProcessDiagnostics | null = null) {
    super(message);
    this.name = 'ReplayStop';
    this.diagnostics = diagnostics;
  }
}

function stripSqlComments(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');
}

export function resolveCliLauncherMode(): CliLauncherMode {
  return process.platform === 'win32' ? 'WINDOWS_COMSPEC_NPX' : 'DIRECT_NPX';
}

export function resolveCliLauncherPlatform(): string {
  return process.platform;
}

/** Sanitize an absolute temp path into an evidence-safe descriptor (no user home leakage). */
function sanitizeTmpPath(absolute: string): string {
  const base = path.resolve(os.tmpdir());
  const resolved = path.resolve(absolute);
  if (resolved.startsWith(base)) {
    return `${OS_TMP_PLACEHOLDER}${resolved.slice(base.length).split(path.sep).join('/')}`;
  }
  return path.basename(resolved);
}

function sanitizeCliText(text: string): string {
  return text
    .replace(/postgres(?:ql)?:\/\/[^\s'"]+/gi, '<redacted-db-url>')
    .replace(/\b(?:DATABASE_URL|SUPABASE_URL)\s*[:=]\s*\S+/gi, (m) => `${m.split(/[:=]/)[0]}=<redacted>`)
    .replace(
      /\b(?:SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY|SUPABASE_ANON_KEY|ANON_KEY)\s*[:=]\s*\S+/gi,
      (m) => `${m.split(/[:=]/)[0]}=<redacted>`,
    )
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '<redacted-jwt>')
    .replace(/\bBearer\s+\S+/gi, 'Bearer <redacted>')
    .replace(
      /[?&](?:password|passwd|pwd|token|access_token|secret|apikey|api_key|service_role)=[^&\s'"]+/gi,
      (m) => `${m.slice(0, m.indexOf('=') + 1)}<redacted>`,
    )
    .replace(/(?:password|passwd|pwd|secret|credential)[=:]\s*\S+/gi, (m) => `${m.split(/[:=]/)[0]}=<redacted>`)
    .replace(/\b(?:sb_secret_|sb_publishable_)[A-Za-z0-9._-]+/g, '<redacted-token>');
}

/** Bounded sanitized excerpt: full text if small; otherwise UTF-8 head + tail with truncation flag. */
function boundedSanitizedExcerpt(raw: string): { excerpt: string; truncated: boolean } {
  const sanitized = sanitizeCliText(raw);
  const buf = Buffer.from(sanitized, 'utf8');
  const cap = CLI_DIAGNOSTIC_HEAD_BYTES + CLI_DIAGNOSTIC_TAIL_BYTES;
  if (buf.length <= cap) {
    return { excerpt: sanitized, truncated: false };
  }
  const head = buf.subarray(0, CLI_DIAGNOSTIC_HEAD_BYTES).toString('utf8');
  const tail = buf.subarray(buf.length - CLI_DIAGNOSTIC_TAIL_BYTES).toString('utf8');
  return { excerpt: `${head}\n…[truncated]…\n${tail}`, truncated: true };
}

function applyCliDiagnostics(manifest: ReplayManifest, diagnostics: CliProcessDiagnostics | null): void {
  if (!diagnostics) {
    return;
  }
  manifest.cliFailureSubcommand = diagnostics.cliFailureSubcommand;
  manifest.cliFailureClass = diagnostics.cliFailureClass;
  manifest.cliExitCode = diagnostics.cliExitCode;
  manifest.cliSignal = diagnostics.cliSignal;
  manifest.cliElapsedMs = diagnostics.cliElapsedMs;
  manifest.cliStdoutExcerpt = diagnostics.cliStdoutExcerpt;
  manifest.cliStderrExcerpt = diagnostics.cliStderrExcerpt;
  manifest.cliStdoutTruncated = diagnostics.cliStdoutTruncated;
  manifest.cliStderrTruncated = diagnostics.cliStderrTruncated;
  manifest.cliDebugEnabled = diagnostics.cliDebugEnabled;
  manifest.cliTimedOut = diagnostics.cliTimedOut;
}

function assertSafeRunId(runId: string): void {
  if (!SAFE_RUN_ID_RE.test(runId)) {
    throw new ReplayStop(
      'STOP: evidence runId is not a safe identifier (alphanumeric / . _ - only, max 81 chars).',
    );
  }
}

function resolveRunId(): string {
  const override = process.env.E02_EVIDENCE_RUN_ID?.trim();
  if (override) {
    assertSafeRunId(override);
    return override;
  }
  return `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

// ---------------------------------------------------------------------------
// SECTION 4 — Argument / environment safety (no operator-selected skips or workdir)
// ---------------------------------------------------------------------------

export function resolveMode(argv: readonly string[]): ResolvedCli {
  const flags = argv.filter((a) => a.startsWith('--'));
  for (const flag of flags) {
    if (FORBIDDEN_ARG_PREFIXES.some((p) => flag === p || flag.startsWith(`${p}=`))) {
      throw new ReplayStop(
        `STOP: forbidden CLI flag "${flag}". Operator-selected skips/workdir are not permitted.`,
      );
    }
  }
  const positionals = argv.filter((a) => !a.startsWith('--'));
  if (positionals.length > 0) {
    throw new ReplayStop(`STOP: unexpected positional argument(s): ${positionals.join(', ')}`);
  }

  const wantsApply = flags.includes('--apply');
  const wantsPlan = flags.includes('--plan');
  const wantsCleanup = flags.includes('--cleanup');
  const wantsPreserve = flags.includes('--preserve-environment');

  const primaryCount = [wantsApply, wantsPlan, wantsCleanup].filter(Boolean).length;
  if (primaryCount > 1) {
    throw new ReplayStop('STOP: choose exactly one primary mode: --plan, --apply, or --cleanup.');
  }
  if (wantsPreserve && !wantsApply) {
    throw new ReplayStop(
      'STOP: --preserve-environment is valid ONLY together with --apply under DBA execution authority.',
    );
  }

  const unknown = flags.filter((f) => !ALLOWED_FLAGS.includes(f));
  if (unknown.length > 0) {
    throw new ReplayStop(`STOP: unknown flag(s): ${unknown.join(', ')}`);
  }

  const mode: ReplayMode = wantsCleanup ? 'cleanup' : wantsApply ? 'apply' : 'plan';
  return { mode, preserveEnvironment: wantsPreserve };
}

function assertNoForbiddenEnv(): void {
  const offenders = Object.keys(process.env).filter((k) =>
    FORBIDDEN_ENV_PATTERNS.some((re) => re.test(k)),
  );
  if (offenders.length > 0) {
    throw new ReplayStop(
      `STOP: environment-provided quarantine/skip/workdir override(s) detected: ${offenders.join(', ')}`,
    );
  }
}

/** Exact-match DBA execution identity. Never persists an unvalidated operator value. */
function assertValidatedDbaAuthorizationId(): typeof EXPECTED_DBA_AUTHORIZATION_ID {
  const raw = process.env[DBA_AUTHORIZATION_ENV];
  if (raw === undefined || raw.trim() === '') {
    throw new ReplayStop(
      `STOP: ${DBA_AUTHORIZATION_ENV} is missing. DBA apply/preserve/cleanup requires the exact value ${EXPECTED_DBA_AUTHORIZATION_ID}.`,
    );
  }
  if (raw !== EXPECTED_DBA_AUTHORIZATION_ID) {
    throw new ReplayStop(
      `STOP: ${DBA_AUTHORIZATION_ENV} must equal exactly ${EXPECTED_DBA_AUTHORIZATION_ID}. Arbitrary / historical / prefixed DBA IDs are rejected.`,
    );
  }
  return EXPECTED_DBA_AUTHORIZATION_ID;
}

function assertApplyAuthorized(): void {
  if (process.env.E02_BCR_APPLY_AUTHORIZED !== 'true') {
    throw new ReplayStop(
      'STOP: --apply is not authorized in this context. Execution requires the successor DBA ' +
        `(${EXPECTED_DBA_AUTHORIZATION_ID}) and E02_BCR_APPLY_AUTHORIZED=true. Repository implementation ≠ execution authority.`,
    );
  }
}

function assertPreserveAuthorized(preserve: boolean): void {
  if (!preserve) {
    return;
  }
  assertApplyAuthorized();
  assertValidatedDbaAuthorizationId();
  if (ENVIRONMENT_CLASS !== 'LOCAL_DISPOSABLE_SUPABASE') {
    throw new ReplayStop('STOP: --preserve-environment is LOCAL_DISPOSABLE_SUPABASE only.');
  }
  if (CLEAN_BASE_MODE !== 'AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS') {
    throw new ReplayStop('STOP: --preserve-environment is CB-B (AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS) only.');
  }
}

function assertCleanupAuthorized(): void {
  assertValidatedDbaAuthorizationId();
}

// ---------------------------------------------------------------------------
// SECTION 5 — Deterministic migration enumeration (REAL repository source)
// ---------------------------------------------------------------------------

export function parseMigrationFilename(filename: string): ParsedMigration | null {
  const match = MIGRATION_FILENAME_RE.exec(filename);
  if (!match) {
    return null;
  }
  return {
    filename,
    version: match[1],
    name: match[2],
    quarantined: filename === QUARANTINED_MIGRATION,
  };
}

export function orderMigrations(migrations: ParsedMigration[]): ParsedMigration[] {
  return [...migrations].sort((a, b) => {
    if (a.version !== b.version) {
      return a.version < b.version ? -1 : 1;
    }
    return a.filename < b.filename ? -1 : a.filename > b.filename ? 1 : 0;
  });
}

/** Count timestamped migrations in an arbitrary migrations dir (used for the empty-auxiliary check). */
async function countTimestampedMigrations(dir: string): Promise<number> {
  let entries: Awaited<ReturnType<typeof readdir>>;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return -1; // dir missing
  }
  return entries.filter((e) => e.isFile() && MIGRATION_FILENAME_RE.test(e.name)).length;
}

export type EnumerationResult = {
  migrations: ParsedMigration[];
  nonTimestampedSqlFiles: string[];
};

export async function enumerateRealRepositoryMigrations(): Promise<EnumerationResult> {
  const entries = await readdir(REAL_REPOSITORY_MIGRATION_DIR, { withFileTypes: true });
  const migrations: ParsedMigration[] = [];
  const nonTimestampedSqlFiles: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.sql')) {
      continue;
    }
    const parsed = parseMigrationFilename(entry.name);
    if (parsed) {
      migrations.push(parsed);
    } else {
      nonTimestampedSqlFiles.push(entry.name);
    }
  }
  return {
    migrations: orderMigrations(migrations),
    nonTimestampedSqlFiles: nonTimestampedSqlFiles.sort(),
  };
}

// ---------------------------------------------------------------------------
// SECTION 6 — Quarantine + data-only + downstream validation (fail-closed)
// ---------------------------------------------------------------------------

export function validateQuarantineAllowlist(): void {
  if (QUARANTINE_ALLOWLIST.length !== 1) {
    throw new ReplayStop(`STOP: quarantine allowlist count must be 1, found ${QUARANTINE_ALLOWLIST.length}.`);
  }
  if (QUARANTINE_ALLOWLIST[0] !== QUARANTINED_MIGRATION) {
    throw new ReplayStop('STOP: quarantine allowlist does not match authority-locked target.');
  }
}

export function assertQuarantinePresent(migrations: ParsedMigration[]): ParsedMigration {
  const matches = migrations.filter((m) => m.filename === QUARANTINED_MIGRATION);
  if (matches.length === 0) {
    throw new ReplayStop(`STOP: quarantine target "${QUARANTINED_MIGRATION}" not found in migrations dir.`);
  }
  if (matches.length > 1) {
    throw new ReplayStop('STOP: quarantine target resolved to more than one file.');
  }
  const quarantinedCount = migrations.filter((m) => m.quarantined).length;
  if (quarantinedCount !== 1) {
    throw new ReplayStop(`STOP: exactly one migration may be quarantined, found ${quarantinedCount}.`);
  }
  return matches[0];
}

export async function assertQuarantineIsDataOnly(): Promise<void> {
  const raw = await readFile(path.join(REAL_REPOSITORY_MIGRATION_DIR, QUARANTINED_MIGRATION), 'utf8');
  const scannable = stripSqlComments(raw);
  const offenders = SCHEMA_CHANGE_PATTERNS.filter((re) => re.test(scannable)).map((re) => re.source);
  if (offenders.length > 0) {
    throw new ReplayStop(
      `STOP: quarantined migration is no longer DATA_ONLY. Detected schema-changing lexemes: ${offenders.join(', ')}. ` +
        'Classification NON_E02_LEGACY_DEMO_DATA can no longer be confirmed → return to governance.',
    );
  }
}

export async function assertNoDownstreamDependency(migrations: ParsedMigration[]): Promise<void> {
  const quarantine = migrations.find((m) => m.quarantined);
  if (!quarantine) {
    throw new ReplayStop('STOP: quarantine target missing during downstream scan.');
  }
  const later = migrations.filter((m) => m.version > quarantine.version);
  const hits: string[] = [];
  for (const migration of later) {
    const raw = await readFile(path.join(REAL_REPOSITORY_MIGRATION_DIR, migration.filename), 'utf8');
    for (const id of LEGACY_DEMO_IDENTIFIERS) {
      if (raw.includes(id)) {
        hits.push(`${migration.filename} references ${id}`);
      }
    }
  }
  if (hits.length > 0) {
    throw new ReplayStop(
      `STOP: obvious downstream dependency on quarantined demo identity detected → return to governance:\n  ${hits.join(
        '\n  ',
      )}`,
    );
  }
}

export function assertRuMigrationsPresent(migrations: ParsedMigration[]): {
  ru11Present: boolean;
  ru12Present: boolean;
} {
  const names = new Set(migrations.map((m) => m.filename));
  const ru11Present = names.has(RU_1_1_MIGRATION);
  const ru12Present = names.has(RU_1_2_MIGRATION);
  if (!ru11Present) {
    throw new ReplayStop(`STOP: RU-1.1 migration "${RU_1_1_MIGRATION}" not found.`);
  }
  if (!ru12Present) {
    throw new ReplayStop(`STOP: RU-1.2 migration "${RU_1_2_MIGRATION}" not found.`);
  }
  return { ru11Present, ru12Present };
}

// ---------------------------------------------------------------------------
// SECTION 7 — Replay plan construction (pure, read-only, real repository)
// ---------------------------------------------------------------------------

export type ReplayPlan = {
  ordered: ParsedMigration[];
  toExecute: ParsedMigration[];
  quarantined: ParsedMigration[];
  nonTimestampedSqlFiles: string[];
  ru11Present: boolean;
  ru12Present: boolean;
};

export async function buildReplayPlan(): Promise<ReplayPlan> {
  assertNoForbiddenEnv();
  validateQuarantineAllowlist();

  const { migrations, nonTimestampedSqlFiles } = await enumerateRealRepositoryMigrations();
  assertQuarantinePresent(migrations);
  await assertQuarantineIsDataOnly();
  await assertNoDownstreamDependency(migrations);
  const { ru11Present, ru12Present } = assertRuMigrationsPresent(migrations);

  const quarantined = migrations.filter((m) => m.quarantined);
  const toExecute = migrations.filter((m) => !m.quarantined);

  for (let i = 1; i < migrations.length; i += 1) {
    if (migrations[i].version < migrations[i - 1].version) {
      throw new ReplayStop('STOP: migration ordering could not be established deterministically.');
    }
  }

  return { ordered: migrations, toExecute, quarantined, nonTimestampedSqlFiles, ru11Present, ru12Present };
}

// ---------------------------------------------------------------------------
// SECTION 8 — CB-B auxiliary workdir planning + source separation (pure)
// ---------------------------------------------------------------------------

export type AuxiliaryPlan = {
  runId: string;
  auxiliaryWorkdirAbsolute: string;
  auxiliaryWorkdirSanitized: string;
  auxiliaryMigrationDir: string;
  realRepositoryRoot: string;
  realRepositoryMigrationDir: string;
};

/** Pure planning: computes a fresh, unique auxiliary workdir path. Does NOT create it. */
export function planAuxiliaryWorkdir(runId: string): AuxiliaryPlan {
  const auxiliaryWorkdirAbsolute = path.join(os.tmpdir(), `e02-bcr-aux-${runId}`);
  const auxiliaryMigrationDir = path.join(auxiliaryWorkdirAbsolute, 'supabase', 'migrations');
  return {
    runId,
    auxiliaryWorkdirAbsolute,
    auxiliaryWorkdirSanitized: sanitizeTmpPath(auxiliaryWorkdirAbsolute),
    auxiliaryMigrationDir,
    realRepositoryRoot: REAL_REPOSITORY_ROOT,
    realRepositoryMigrationDir: REAL_REPOSITORY_MIGRATION_DIR,
  };
}

/** Blocking: auxiliary workdir must never alias the real repository root. */
export function assertWorkdirsDistinct(plan: AuxiliaryPlan): void {
  if (path.resolve(plan.auxiliaryWorkdirAbsolute) === path.resolve(plan.realRepositoryRoot)) {
    throw new ReplayStop('STOP: auxiliaryWorkdir must not equal the real repository root.');
  }
  if (path.resolve(plan.auxiliaryMigrationDir) === path.resolve(plan.realRepositoryMigrationDir)) {
    throw new ReplayStop('STOP: auxiliary migration dir must not equal the real repository migration dir.');
  }
}

/** Cleanup may only target a proven local disposable auxiliary workdir (IA-003 §18/§21). */
export function assertCleanupTargetSafe(plan: AuxiliaryPlan): void {
  assertSafeRunId(plan.runId);
  assertWorkdirsDistinct(plan);
  const tmp = path.resolve(os.tmpdir());
  const aux = path.resolve(plan.auxiliaryWorkdirAbsolute);
  const tmpPrefix = tmp.endsWith(path.sep) ? tmp : `${tmp}${path.sep}`;
  if (aux !== tmp && !aux.startsWith(tmpPrefix)) {
    throw new ReplayStop('STOP: cleanup target is not under the expected OS temp prefix.');
  }
  if (!AUX_DIR_NAME_RE.test(path.basename(aux))) {
    throw new ReplayStop('STOP: cleanup target does not match the BCR auxiliary naming convention.');
  }
  if (aux === path.resolve(plan.realRepositoryRoot)) {
    throw new ReplayStop('STOP: refusing cleanup of the repository root.');
  }
}

/** Public-CLI command templates reflecting the portable launcher (argument arrays — no shell:true). */
export function buildCommandTemplates(plan: AuxiliaryPlan): CommandTemplate[] {
  const win = process.platform === 'win32';
  const command = win ? 'cmd.exe' : 'npx';
  const prefix = win ? (['/d', '/s', '/c', 'npx'] as const) : ([] as const);
  const wd = plan.auxiliaryWorkdirSanitized;
  return [
    {
      purpose: 'initialize auxiliary local Supabase project (public CLI)',
      command,
      args: [...prefix, 'supabase', 'init'],
      cwdRole: 'auxiliaryWorkdir',
    },
    {
      purpose: 'start auxiliary local Supabase (public --workdir; empty migrations → no app migration runs)',
      command,
      args: [...prefix, 'supabase', '--debug', 'start', '--workdir', wd],
      cwdRole: 'auxiliaryWorkdir',
    },
    {
      purpose: 'discover auxiliary local connection details (machine-readable)',
      command,
      args: [...prefix, 'supabase', 'status', '--workdir', wd, '--output', 'json'],
      cwdRole: 'auxiliaryWorkdir',
    },
    {
      purpose: 'cleanup: stop auxiliary local stack scoped to its workdir',
      command,
      args: [...prefix, 'supabase', 'stop', '--workdir', wd],
      cwdRole: 'auxiliaryWorkdir',
    },
  ];
}

// ---------------------------------------------------------------------------
// SECTION 9 — Manifest builder
// ---------------------------------------------------------------------------

function baseManifest(
  mode: ReplayMode,
  plan: ReplayPlan,
  auxPlan: AuxiliaryPlan,
  startedAt: string,
  preserveEnvironment: boolean,
): ReplayManifest {
  return {
    artifactAuthorizationId: ARTIFACT_AUTHORIZATION_ID,
    expectedDbaAuthorizationId: EXPECTED_DBA_AUTHORIZATION_ID,
    validatedDbaAuthorizationId: null,
    authorizationId: null,
    baselineMode: BASELINE_MODE,
    environmentClass: ENVIRONMENT_CLASS,
    cleanBaseMode: CLEAN_BASE_MODE,
    mode,
    preserveEnvironment,
    quarantinedMigrations: plan.quarantined.map((m) => m.filename),
    quarantineCount: plan.quarantined.length,
    quarantineReason: QUARANTINE_REASON,
    quarantineAuthority: QUARANTINE_AUTHORITY,
    historicalDefect: HISTORICAL_DEFECT,
    migrationFileModified: false,
    migrationCountDiscovered: plan.ordered.length,
    migrationCountExecuted: 0,
    migrationCountQuarantined: plan.quarantined.length,
    nonTimestampedSqlFiles: plan.nonTimestampedSqlFiles,
    ru11Migration: RU_1_1_MIGRATION,
    ru12Migration: RU_1_2_MIGRATION,
    ru11Reached: false,
    ru12Reached: false,
    auxiliaryWorkdir: auxPlan.auxiliaryWorkdirSanitized,
    auxiliaryProjectRef: null,
    auxiliaryMigrationCountBeforeStart: null,
    platformBaselineReady: false,
    applicationMigrationHistoryInitiallyEmpty: false,
    realRepositoryMigrationSource: REAL_REPOSITORY_MIGRATION_SOURCE_REL,
    freshAuxiliaryProject: true,
    platformHistoryPreserved: true,
    bcrCb001Status: BCR_CB_001_STATUS,
    cliLauncherMode: resolveCliLauncherMode(),
    cliLauncherPlatform: resolveCliLauncherPlatform(),
    bcrCb002Status: BCR_CB_002_STATUS,
    auxiliaryEnvironmentDisposition: null,
    baselineVerificationPending: false,
    cleanupRequired: false,
    cleanupCompleted: false,
    bcrCb003Status: BCR_CB_003_STATUS,
    bcrCb004Status: BCR_CB_004_STATUS,
    commandTemplates: buildCommandTemplates(auxPlan),
    cleanupWarnings: [],
    result: 'BLOCKED',
    failures: [],
    environmentValidated: false,
    startedAt,
    finishedAt: startedAt,
    repositoryRef: process.env.E02_REPOSITORY_REF?.trim() || null,
    cliFailureSubcommand: null,
    cliFailureClass: null,
    cliExitCode: null,
    cliSignal: null,
    cliElapsedMs: null,
    cliStdoutExcerpt: null,
    cliStderrExcerpt: null,
    cliStdoutTruncated: null,
    cliStderrTruncated: null,
    cliDebugEnabled: null,
    cliTimedOut: null,
  };
}

function applyValidatedDbaId(manifest: ReplayManifest, validated: typeof EXPECTED_DBA_AUTHORIZATION_ID): void {
  manifest.validatedDbaAuthorizationId = validated;
  manifest.authorizationId = validated;
}

async function writeManifestFile(runId: string, manifest: ReplayManifest): Promise<string> {
  const dir = path.join(REAL_REPOSITORY_ROOT, 'tests', 'e02', 'evidence', runId);
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, 'bcr-replay-manifest.json');
  await writeFile(filePath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return filePath;
}

async function loadExistingManifest(runId: string): Promise<ReplayManifest | null> {
  const filePath = path.join(REAL_REPOSITORY_ROOT, 'tests', 'e02', 'evidence', runId, 'bcr-replay-manifest.json');
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw) as ReplayManifest;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// SECTION 10 — PLAN mode (read-only; NO database, NO Supabase, NO Docker, NO temp creation)
// ---------------------------------------------------------------------------

export async function runPlan(): Promise<ReplayManifest> {
  const startedAt = new Date().toISOString();
  const plan = await buildReplayPlan();
  const auxPlan = planAuxiliaryWorkdir('<runId>'); // template only; nothing created
  assertWorkdirsDistinct(auxPlan);

  const manifest = baseManifest('plan', plan, auxPlan, startedAt, false);
  manifest.ru11Reached = plan.ru11Present;
  manifest.ru12Reached = plan.ru12Present;
  manifest.auxiliaryMigrationCountBeforeStart = 0;
  // Planned DBA preserve-success semantics (not an actual running environment).
  manifest.preserveEnvironment = true;
  manifest.auxiliaryEnvironmentDisposition = 'RUNNING_FOR_BASELINE_VERIFY';
  manifest.baselineVerificationPending = true;
  manifest.cleanupRequired = true;
  manifest.cleanupCompleted = false;
  manifest.result = 'PLAN_OK';
  manifest.finishedAt = new Date().toISOString();
  return manifest;
}

// ---------------------------------------------------------------------------
// SECTION 11 — Truthful migration-history adapter (execution only)
// ---------------------------------------------------------------------------
// Omit-not-fabricate. Records ONLY migrations actually applied. The quarantined migration is never
// inserted. `supabase migration repair` is never used. Platform histories are never touched.

type PgClientLike = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
};

async function ensureApplicationMigrationHistoryTable(client: PgClientLike): Promise<void> {
  await client.query('CREATE SCHEMA IF NOT EXISTS supabase_migrations;');
  await client.query(
    'CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations ' +
      '(version text NOT NULL PRIMARY KEY, statements text[], name text);',
  );
}

async function discoverHistoryColumns(client: PgClientLike): Promise<Set<string>> {
  const res = await client.query(
    "SELECT column_name FROM information_schema.columns " +
      "WHERE table_schema = 'supabase_migrations' AND table_name = 'schema_migrations';",
  );
  return new Set(res.rows.map((r) => String(r.column_name)));
}

/** Truthfully record ONE applied migration. Never called for the quarantined migration. */
async function recordApplied(
  client: PgClientLike,
  columns: Set<string>,
  migration: ParsedMigration,
  sql: string,
): Promise<void> {
  if (migration.quarantined) {
    throw new ReplayStop('STOP: refused to record applied-history for a quarantined migration.');
  }
  const cols: string[] = ['version'];
  const values: unknown[] = [migration.version];
  if (columns.has('name')) {
    cols.push('name');
    values.push(migration.name);
  }
  if (columns.has('statements')) {
    cols.push('statements');
    values.push([sql]);
  }
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
  await client.query(
    `INSERT INTO supabase_migrations.schema_migrations (${cols.join(', ')}) VALUES (${placeholders});`,
    values,
  );
}

/** Platform baseline validation (read-only). Never modifies auth/storage/platform histories. */
async function validatePlatformBaseline(client: PgClientLike): Promise<{
  authExists: boolean;
  storageExists: boolean;
  appHistoryEmpty: boolean;
  platformBaselineReady: boolean;
}> {
  const schemaRes = await client.query(
    "SELECT schema_name FROM information_schema.schemata WHERE schema_name IN ('auth','storage');",
  );
  const schemas = new Set(schemaRes.rows.map((r) => String(r.schema_name)));
  const authExists = schemas.has('auth');
  const storageExists = schemas.has('storage');

  const histRes = await client.query(
    "SELECT count(*)::int AS n FROM information_schema.tables " +
      "WHERE table_schema = 'supabase_migrations' AND table_name = 'schema_migrations';",
  );
  const histTableExists = Number((histRes.rows[0] as { n: number }).n) > 0;
  let appHistoryEmpty = true;
  if (histTableExists) {
    const cntRes = await client.query('SELECT count(*)::int AS n FROM supabase_migrations.schema_migrations;');
    appHistoryEmpty = Number((cntRes.rows[0] as { n: number }).n) === 0;
  }

  return {
    authExists,
    storageExists,
    appHistoryEmpty,
    platformBaselineReady: authExists && storageExists,
  };
}

/**
 * Application-layer reset for governed replay (execution only). Resets ONLY the application layer:
 * public schema + application migration bookkeeping. Never touches auth/storage/platform histories.
 */
async function resetApplicationLayerForReplay(client: PgClientLike): Promise<void> {
  await client.query('DROP SCHEMA IF EXISTS public CASCADE;');
  await client.query('CREATE SCHEMA public;');
  await client.query('GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;');
  await client.query('GRANT ALL ON SCHEMA public TO postgres, service_role;');
  await client.query('DROP SCHEMA IF EXISTS supabase_migrations CASCADE;');
  await ensureApplicationMigrationHistoryTable(client);
}

// ---------------------------------------------------------------------------
// SECTION 12 — BCR-CB-002 portable Supabase CLI launcher (all four commands)
// ---------------------------------------------------------------------------

export type CliLaunchOk = {
  stdout: string;
  stderr: string;
  status: number;
  classification: 'PROCESS_EXITED_ZERO';
};

function assertAllowlistedSubcommand(subcommand: string): asserts subcommand is SupabaseSubcommand {
  if (!(SUPABASE_SUBCOMMAND_ALLOWLIST as readonly string[]).includes(subcommand)) {
    throw new ReplayStop(
      `STOP: Supabase subcommand "${subcommand}" is not in the hard-coded allowlist (init|start|status|stop).`,
    );
  }
}

/**
 * Bounded cross-platform launcher. All Supabase CLI calls MUST route through this function.
 * Windows: ComSpec/cmd.exe /d /s /c npx supabase <sub> …  (shell:false)
 * Non-Windows: npx supabase <sub> …                        (shell:false)
 * shell:true is NOT used. npx.cmd is NOT spawned directly.
 */
async function runSupabaseCli(
  subcommand: SupabaseSubcommand,
  internalArgs: readonly string[],
  auxWorkdir: string,
): Promise<CliLaunchOk> {
  assertAllowlistedSubcommand(subcommand);
  const { spawnSync } = await import('node:child_process');

  const isWin = process.platform === 'win32';
  const debugEnabled = subcommand === 'start';
  const debugArgs = debugEnabled ? (['--debug'] as const) : ([] as const);
  const executable = isWin ? process.env.ComSpec?.trim() || 'cmd.exe' : 'npx';
  const args = isWin
    ? ['/d', '/s', '/c', 'npx', 'supabase', ...debugArgs, subcommand, ...internalArgs]
    : ['supabase', ...debugArgs, subcommand, ...internalArgs];

  const startedMs = Date.now();
  const res = spawnSync(executable, args, {
    cwd: auxWorkdir,
    shell: false,
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: CLI_MAX_BUFFER,
    timeout: CLI_TIMEOUT_MS,
    env: process.env,
  });
  const elapsedMs = Date.now() - startedMs;
  const stdout = res.stdout ?? '';
  const stderr = res.stderr ?? '';
  const timedOut = (res.error as NodeJS.ErrnoException | undefined)?.code === 'ETIMEDOUT';

  const diagnosticsFor = (
    failureClass: CliProcessDiagnostics['cliFailureClass'],
  ): CliProcessDiagnostics => {
    const out = boundedSanitizedExcerpt(stdout);
    const errText = boundedSanitizedExcerpt(stderr);
    return {
      cliFailureSubcommand: subcommand,
      cliFailureClass: failureClass,
      cliExitCode: typeof res.status === 'number' ? res.status : null,
      cliSignal: res.signal ?? null,
      cliElapsedMs: elapsedMs,
      cliStdoutExcerpt: out.excerpt,
      cliStderrExcerpt: errText.excerpt,
      cliStdoutTruncated: out.truncated,
      cliStderrTruncated: errText.truncated,
      cliDebugEnabled: debugEnabled,
      cliTimedOut: timedOut,
    };
  };

  if (res.error) {
    const err = res.error as NodeJS.ErrnoException;
    const diagnostics = diagnosticsFor('PROCESS_DID_NOT_START');
    throw new ReplayStop(
      `STOP: PROCESS_DID_NOT_START (supabase ${subcommand}): ` +
        `name=${err.name} code=${err.code ?? 'n/a'} message=${sanitizeCliText(err.message)} ` +
        `timedOut=${timedOut} elapsedMs=${elapsedMs}`,
      diagnostics,
    );
  }

  const status = res.status;
  if (typeof status !== 'number' || status !== 0) {
    const diagnostics = diagnosticsFor('PROCESS_EXITED_NONZERO');
    throw new ReplayStop(
      `STOP: PROCESS_EXITED_NONZERO (supabase ${subcommand}) status=${status ?? 'null'} ` +
        `signal=${res.signal ?? 'null'} elapsedMs=${elapsedMs} ` +
        `stdoutTruncated=${diagnostics.cliStdoutTruncated} stderrTruncated=${diagnostics.cliStderrTruncated}`,
      diagnostics,
    );
  }

  return { stdout, stderr, status, classification: 'PROCESS_EXITED_ZERO' };
}

type AuxiliaryConnection = { dbUrl: string; projectRef: string | null };

/** Parse machine-readable `supabase status --output json` for the DB URL. Never persisted. */
function parseAuxiliaryStatus(json: string): AuxiliaryConnection {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(json) as Record<string, unknown>;
  } catch {
    throw new ReplayStop('STOP: could not parse auxiliary `supabase status --output json`.');
  }
  const dbUrl =
    (parsed.DB_URL as string | undefined) ??
    (parsed.db_url as string | undefined) ??
    (parsed.DATABASE_URL as string | undefined);
  if (!dbUrl) {
    throw new ReplayStop('STOP: auxiliary status did not expose a machine-readable DB URL.');
  }
  const projectRef =
    (parsed.PROJECT_REF as string | undefined) ?? (parsed.project_id as string | undefined) ?? null;
  return { dbUrl, projectRef };
}

function assertLocalConnectionString(dbUrl: string): void {
  let host: string;
  try {
    host = new URL(dbUrl).hostname;
  } catch {
    throw new ReplayStop('STOP: auxiliary DATABASE_URL is not a valid URL.');
  }
  const localPatterns = [/^localhost$/i, /^127\.0\.0\.1$/, /^::1$/, /^.*\.local$/i];
  if (!localPatterns.some((p) => p.test(host))) {
    throw new ReplayStop(`STOP: auxiliary DB host "${host}" is not local; refusing remote/non-local target.`);
  }
}

// ---------------------------------------------------------------------------
// SECTION 13 — APPLY mode (execution only; gated) — BCR-CB-003 lifecycle
// ---------------------------------------------------------------------------

export async function runApply(preserveEnvironment: boolean): Promise<ReplayManifest> {
  const startedAt = new Date().toISOString();
  const runId = resolveRunId();

  assertNoForbiddenEnv();
  assertApplyAuthorized();
  const validatedId = assertValidatedDbaAuthorizationId();
  assertPreserveAuthorized(preserveEnvironment);

  const plan = await buildReplayPlan();
  const auxPlan = planAuxiliaryWorkdir(runId);
  assertWorkdirsDistinct(auxPlan);

  const manifest = baseManifest('apply', plan, auxPlan, startedAt, preserveEnvironment);
  applyValidatedDbaId(manifest, validatedId);

  await mkdir(auxPlan.auxiliaryWorkdirAbsolute, { recursive: true });

  try {
    await runSupabaseCli('init', [], auxPlan.auxiliaryWorkdirAbsolute);

    const auxCount = await countTimestampedMigrations(auxPlan.auxiliaryMigrationDir);
    if (auxCount === -1) {
      await mkdir(auxPlan.auxiliaryMigrationDir, { recursive: true });
      manifest.auxiliaryMigrationCountBeforeStart = 0;
    } else if (auxCount !== 0) {
      throw new ReplayStop(`STOP: auxiliary migrations directory is not empty (count ${auxCount}).`);
    } else {
      manifest.auxiliaryMigrationCountBeforeStart = 0;
    }

    await runSupabaseCli(
      'start',
      ['--workdir', auxPlan.auxiliaryWorkdirAbsolute],
      auxPlan.auxiliaryWorkdirAbsolute,
    );

    const status = await runSupabaseCli(
      'status',
      ['--workdir', auxPlan.auxiliaryWorkdirAbsolute, '--output', 'json'],
      auxPlan.auxiliaryWorkdirAbsolute,
    );
    const conn = parseAuxiliaryStatus(status.stdout);
    assertLocalConnectionString(conn.dbUrl);
    manifest.auxiliaryProjectRef = conn.projectRef;
    // DB URL is runtime-only — never written to the manifest.

    process.env.DATABASE_URL = conn.dbUrl;
    if (!process.env.SUPABASE_URL) {
      process.env.SUPABASE_URL = `http://${new URL(conn.dbUrl).hostname}:54321`;
    }
    const { validateEnvironmentGuard } = await import('./environment-guard.js');
    const guard = validateEnvironmentGuard({ requireDatabaseUrl: true });
    if (guard.environmentClass !== 'local') {
      throw new ReplayStop(
        `STOP: CB-B is LOCAL_DISPOSABLE only; refusing environment "${guard.environmentClass}".`,
      );
    }
    if (preserveEnvironment && guard.environmentClass !== 'local') {
      throw new ReplayStop('STOP: --preserve-environment refused for a non-local target.');
    }
    manifest.environmentValidated = true;

    const { default: pg } = await import('pg');
    const client = new pg.Client({ connectionString: conn.dbUrl });
    await client.connect();

    let replayFailed = false;
    try {
      const baseline = await validatePlatformBaseline(client);
      manifest.platformBaselineReady = baseline.platformBaselineReady;
      manifest.applicationMigrationHistoryInitiallyEmpty = baseline.appHistoryEmpty;
      if (!baseline.authExists || !baseline.storageExists) {
        throw new ReplayStop('STOP: auxiliary platform baseline missing auth/storage schema.');
      }
      if (!baseline.appHistoryEmpty) {
        throw new ReplayStop('STOP: auxiliary application migration history is not initially empty.');
      }

      await resetApplicationLayerForReplay(client);
      const columns = await discoverHistoryColumns(client);

      for (const migration of plan.ordered) {
        if (migration.quarantined) {
          continue; // declared quarantine: not executed, not recorded (truthful omission)
        }
        const sql = await readFile(path.join(REAL_REPOSITORY_MIGRATION_DIR, migration.filename), 'utf8');
        try {
          await client.query(sql);
        } catch (err) {
          manifest.failures.push(
            `${migration.filename}: ${err instanceof Error ? err.message : String(err)}`,
          );
          replayFailed = true;
          break;
        }
        await recordApplied(client, columns, migration, sql);
        manifest.migrationCountExecuted += 1;
        if (migration.filename === RU_1_1_MIGRATION) {
          manifest.ru11Reached = true;
        }
        if (migration.filename === RU_1_2_MIGRATION) {
          manifest.ru12Reached = true;
        }
      }
    } finally {
      await client.end();
    }

    if (replayFailed || !manifest.ru11Reached || !manifest.ru12Reached) {
      if (!replayFailed) {
        manifest.failures.push('RU-1.1/RU-1.2 not reached during replay.');
      }
      manifest.result = 'APPLICATION_FAILED';
      manifest.finishedAt = new Date().toISOString();
      await writeManifestFile(runId, manifest);
      await cleanupAuxiliary(auxPlan, manifest, 'failure');
      manifest.finishedAt = new Date().toISOString();
      await writeManifestFile(runId, manifest);
      return manifest;
    }

    manifest.result = 'APPLIED';
    if (preserveEnvironment) {
      manifest.auxiliaryEnvironmentDisposition = 'RUNNING_FOR_BASELINE_VERIFY';
      manifest.baselineVerificationPending = true;
      manifest.cleanupRequired = true;
      manifest.cleanupCompleted = false;
      manifest.finishedAt = new Date().toISOString();
      await writeManifestFile(runId, manifest);
      // SUCCESS + preserve: leave auxiliary DB running. No cleanup.
      return manifest;
    }

    // Default apply (no preserve): safe auto-cleanup. Not a DBA verify hand-off.
    manifest.baselineVerificationPending = false;
    manifest.cleanupRequired = true;
    manifest.cleanupCompleted = false;
    manifest.finishedAt = new Date().toISOString();
    await writeManifestFile(runId, manifest);
    await cleanupAuxiliary(auxPlan, manifest, 'default-success');
    manifest.finishedAt = new Date().toISOString();
    await writeManifestFile(runId, manifest);
    return manifest;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (err instanceof ReplayStop) {
      applyCliDiagnostics(manifest, err.diagnostics);
    }
    if (!manifest.failures.includes(message)) {
      manifest.failures.push(message);
    }
    if (manifest.result !== 'APPLICATION_FAILED' && manifest.result !== 'APPLIED') {
      manifest.result = 'APPLICATION_FAILED';
    }
    manifest.finishedAt = new Date().toISOString();
    try {
      await writeManifestFile(runId, manifest);
    } catch (writeErr) {
      manifest.cleanupWarnings.push(
        `failure-manifest write warning: ${writeErr instanceof Error ? writeErr.message : String(writeErr)}`,
      );
    }
    await cleanupAuxiliary(auxPlan, manifest, 'failure');
    manifest.finishedAt = new Date().toISOString();
    try {
      await writeManifestFile(runId, manifest);
    } catch (writeErr) {
      manifest.cleanupWarnings.push(
        `post-cleanup manifest write warning: ${writeErr instanceof Error ? writeErr.message : String(writeErr)}`,
      );
    }
    if (err instanceof ReplayStop) {
      throw err;
    }
    throw new ReplayStop(message);
  }
}

/**
 * Best-effort auxiliary teardown. Never fabricates a database/baseline result.
 * `kind`:
 *   - failure         → CLEANED_AFTER_FAILURE only if stop+rm actually succeed
 *   - default-success → cleanup without claiming CLEANED_AFTER_VERIFY (verify did not run)
 *   - after-verify    → CLEANED_AFTER_VERIFY only if stop+rm actually succeed
 */
async function cleanupAuxiliary(
  auxPlan: AuxiliaryPlan,
  manifest: ReplayManifest,
  kind: 'failure' | 'default-success' | 'after-verify',
): Promise<boolean> {
  let stopOk = false;
  let rmOk = false;
  try {
    await runSupabaseCli(
      'stop',
      ['--workdir', auxPlan.auxiliaryWorkdirAbsolute],
      auxPlan.auxiliaryWorkdirAbsolute,
    );
    stopOk = true;
  } catch (err) {
    manifest.cleanupWarnings.push(
      `auxiliary stop: ${err instanceof Error ? sanitizeCliText(err.message) : String(err)}`,
    );
  }
  try {
    await stat(auxPlan.auxiliaryWorkdirAbsolute);
    await rm(auxPlan.auxiliaryWorkdirAbsolute, { recursive: true, force: true });
    rmOk = true;
  } catch (err) {
    manifest.cleanupWarnings.push(
      `auxiliary temp removal warning: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const cleaned = stopOk && rmOk;
  if (cleaned) {
    manifest.cleanupCompleted = true;
    manifest.cleanupRequired = false;
    if (kind === 'failure') {
      manifest.auxiliaryEnvironmentDisposition = 'CLEANED_AFTER_FAILURE';
    } else if (kind === 'after-verify') {
      manifest.auxiliaryEnvironmentDisposition = 'CLEANED_AFTER_VERIFY';
      manifest.baselineVerificationPending = false;
    }
    // default-success: do not fabricate CLEANED_AFTER_VERIFY (baseline verifier did not run).
  } else {
    manifest.cleanupCompleted = false;
    manifest.cleanupRequired = true;
    // Do not fabricate CLEANED_* when teardown did not fully succeed.
  }
  return cleaned;
}

// ---------------------------------------------------------------------------
// SECTION 14 — Explicit --cleanup (deterministic; non-secret identifiers only)
// ---------------------------------------------------------------------------

export async function runCleanup(): Promise<ReplayManifest> {
  const startedAt = new Date().toISOString();
  assertNoForbiddenEnv();
  assertCleanupAuthorized();
  const validatedId = assertValidatedDbaAuthorizationId();

  const runId = process.env.E02_EVIDENCE_RUN_ID?.trim();
  if (!runId) {
    throw new ReplayStop(
      'STOP: --cleanup requires E02_EVIDENCE_RUN_ID matching the preserved auxiliary run (safe identifier).',
    );
  }
  assertSafeRunId(runId);

  const auxPlan = planAuxiliaryWorkdir(runId);
  assertCleanupTargetSafe(auxPlan);

  const existing = await loadExistingManifest(runId);
  const plan = existing
    ? {
        ordered: [] as ParsedMigration[],
        toExecute: [] as ParsedMigration[],
        quarantined: existing.quarantinedMigrations.map((filename) => ({
          filename,
          version: '',
          name: '',
          quarantined: true,
        })),
        nonTimestampedSqlFiles: existing.nonTimestampedSqlFiles,
        ru11Present: existing.ru11Reached,
        ru12Present: existing.ru12Reached,
      }
    : await buildReplayPlan();

  const manifest = existing
    ? { ...existing, mode: 'cleanup' as const, startedAt, cleanupWarnings: [...existing.cleanupWarnings] }
    : baseManifest('cleanup', plan, auxPlan, startedAt, false);

  applyValidatedDbaId(manifest, validatedId);
  manifest.mode = 'cleanup';
  manifest.cliLauncherMode = resolveCliLauncherMode();
  manifest.cliLauncherPlatform = resolveCliLauncherPlatform();
  manifest.auxiliaryWorkdir = auxPlan.auxiliaryWorkdirSanitized;

  const previousResult = existing?.result;
  const cleaned = await cleanupAuxiliary(auxPlan, manifest, 'after-verify');
  manifest.finishedAt = new Date().toISOString();
  if (cleaned) {
    manifest.result = 'CLEANED';
  } else {
    manifest.result = 'CLEANUP_FAILED';
    // Do not rewrite a truthful prior APPLIED result into APPLICATION_FAILED.
    if (previousResult === 'APPLIED') {
      manifest.failures = existing?.failures ?? manifest.failures;
    }
  }
  await writeManifestFile(runId, manifest);
  return manifest;
}

// ---------------------------------------------------------------------------
// SECTION 15 — CLI main
// ---------------------------------------------------------------------------

const HELP_TEXT = `E-02 Governed Baseline-Compatibility Replay Artifact (E02_DECLARED_BASELINE_REPLAY)
Clean-base model: AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS (CB-B) — RETAINED
Artifact IA: ${ARTIFACT_AUTHORIZATION_ID}
Expected DBA ID: ${EXPECTED_DBA_AUTHORIZATION_ID}

Usage:
  tsx scripts/verification/e02/replay-e02-declared-baseline.ts [--plan | --apply [--preserve-environment] | --cleanup]

Modes (exactly one primary):
  --plan                  Read-only deterministic inspection. NO database, NO Supabase, NO Docker, NO temp creation.
  --apply                 Acquire a fresh disposable auxiliary local Supabase project, replay REAL repo migrations.
                          Requires E02_BCR_APPLY_AUTHORIZED=true and ${DBA_AUTHORIZATION_ENV}=${EXPECTED_DBA_AUTHORIZATION_ID}.
  --apply --preserve-environment
                          DBA-only: after successful replay, write manifest and LEAVE the auxiliary DB running
                          for the separate DBA baseline verifier. No success-path cleanup.
  --cleanup               Deterministic teardown of the preserved auxiliary project keyed by E02_EVIDENCE_RUN_ID.
                          Requires ${DBA_AUTHORIZATION_ENV}=${EXPECTED_DBA_AUTHORIZATION_ID}. No operator --workdir.

Quarantine (authority-locked, exactly one): ${QUARANTINED_MIGRATION}
Real repository migration source: ${REAL_REPOSITORY_MIGRATION_SOURCE_REL}
Launcher: Windows ComSpec/cmd.exe /d /s /c npx supabase <init|start|status|stop>; non-Windows direct npx.
shell:true is not used. DB URLs are never persisted. Historical migration files are never modified.`;

export async function main(argv: readonly string[]): Promise<number> {
  if (argv.includes('--help')) {
    console.log(HELP_TEXT);
    return 0;
  }
  let resolved: ResolvedCli;
  try {
    resolved = resolveMode(argv);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    return 2;
  }

  try {
    const manifest =
      resolved.mode === 'apply'
        ? await runApply(resolved.preserveEnvironment)
        : resolved.mode === 'cleanup'
          ? await runCleanup()
          : await runPlan();

    if (resolved.mode === 'apply' || resolved.mode === 'cleanup') {
      const runId = process.env.E02_EVIDENCE_RUN_ID?.trim() || resolveRunId();
      // Apply/cleanup persist inside their runners; this write is a final echo only when a runId is known.
      if (process.env.E02_EVIDENCE_RUN_ID?.trim()) {
        const filePath = await writeManifestFile(runId, manifest);
        console.info(`[bcr-replay] manifest written: ${filePath}`);
      }
    }

    console.log(JSON.stringify(manifest, null, 2));

    const ok =
      manifest.result === 'PLAN_OK' ||
      manifest.result === 'APPLIED' ||
      manifest.result === 'CLEANED';
    return ok ? 0 : 1;
  } catch (err) {
    console.error(err instanceof Error ? `${err.name}: ${err.message}` : String(err));
    return 1;
  }
}

// Direct-invocation guard: run only when executed as a script (not when imported).
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
const selfPath = path.resolve(new URL(import.meta.url).pathname);
const isDirectRun =
  invokedPath === selfPath ||
  invokedPath.endsWith('replay-e02-declared-baseline.ts') ||
  invokedPath.endsWith('replay-e02-declared-baseline.js');

if (isDirectRun) {
  main(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((err: unknown) => {
      console.error(err);
      process.exitCode = 1;
    });
}
