/**
 * E-02 RU-1.4 — fail-closed environment guard.
 * Guard implementation ≠ permission to execute destructive or DB-backed tests.
 */

export type E02EvidenceEnvironmentClass = 'local' | 'isolated-nonprod';

export type E02GuardContext = {
  evidenceRunId: string;
  environmentClass: E02EvidenceEnvironmentClass;
  projectRef: string;
  supabaseHost: string;
  allowDestructive: true;
};

const LOCAL_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\.0\.0\.1$/,
  /^.*\.local$/i,
];

/** Runtime execution remains gated separately from harness repository implementation. */
export function isRuntimeExecutionAuthorized(): boolean {
  return process.env.E02_RUNTIME_EXECUTION_AUTHORIZED === 'true';
}

export function assertRuntimeExecutionAuthorized(operation: string): void {
  if (!isRuntimeExecutionAuthorized()) {
    throw new Error(
      `RU-1.4 runtime execution NOT AUTHORIZED — cannot run: ${operation}. ` +
        'Requires Database Application Authority + separate execution gate.',
    );
  }
}

export function generateEvidenceRunId(): string {
  const override = process.env.E02_EVIDENCE_RUN_ID?.trim();
  if (override) {
    return override;
  }
  return crypto.randomUUID();
}

function extractProjectRef(supabaseUrl: string): string {
  let host: string;
  try {
    host = new URL(supabaseUrl).hostname;
  } catch {
    throw new Error('E02 guard: SUPABASE_URL is not a valid URL');
  }
  const match = host.match(/^([a-z0-9-]+)\.supabase\.co$/i);
  if (match) {
    return match[1];
  }
  if (LOCAL_HOST_PATTERNS.some((p) => p.test(host))) {
    return host;
  }
  return host;
}

function parseProductionDenylist(): Set<string> {
  const raw = process.env.E02_KNOWN_PRODUCTION_REFS?.trim() ?? '';
  if (!raw) {
    return new Set();
  }
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

function resolveSupabaseUrl(): string {
  const url = process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim();
  if (!url) {
    throw new Error('E02 guard: SUPABASE_URL (or VITE_SUPABASE_URL fallback) is required');
  }
  return url;
}

function assertLocalHostMatchesEnv(supabaseUrl: string, envClass: E02EvidenceEnvironmentClass): void {
  if (envClass !== 'local') {
    return;
  }
  let host: string;
  try {
    host = new URL(supabaseUrl).hostname;
  } catch {
    throw new Error('E02 guard: invalid SUPABASE_URL for local environment check');
  }
  if (!LOCAL_HOST_PATTERNS.some((p) => p.test(host))) {
    throw new Error(
      `E02 guard: E02_EVIDENCE_ENV=local but SUPABASE_URL host "${host}" is not a recognized local pattern`,
    );
  }
}

/**
 * Fail-closed pre-flight. Never logs secret values.
 * Does not connect to any database.
 */
export function validateEnvironmentGuard(options?: {
  requireDatabaseUrl?: boolean;
  requireSupabaseKeys?: boolean;
}): E02GuardContext {
  if (process.env.E02_ALLOW_DESTRUCTIVE_TESTS !== 'true') {
    throw new Error(
      'E02 guard: E02_ALLOW_DESTRUCTIVE_TESTS must equal "true" for destructive or DB-backed evidence paths',
    );
  }

  const envRaw = process.env.E02_EVIDENCE_ENV?.trim();
  if (!envRaw) {
    throw new Error('E02 guard: E02_EVIDENCE_ENV is required (local | isolated-nonprod)');
  }
  if (envRaw !== 'local' && envRaw !== 'isolated-nonprod') {
    throw new Error(`E02 guard: invalid E02_EVIDENCE_ENV "${envRaw}"`);
  }
  const environmentClass = envRaw as E02EvidenceEnvironmentClass;

  const supabaseUrl = resolveSupabaseUrl();
  assertLocalHostMatchesEnv(supabaseUrl, environmentClass);

  const projectRef = extractProjectRef(supabaseUrl);
  const explicitRef = process.env.E02_EVIDENCE_PROJECT_REF?.trim();
  if (explicitRef && explicitRef !== projectRef) {
    throw new Error(
      `E02 guard: E02_EVIDENCE_PROJECT_REF "${explicitRef}" does not match URL project ref "${projectRef}"`,
    );
  }

  const denylist = parseProductionDenylist();
  if (denylist.has(projectRef)) {
    throw new Error(`E02 guard: project ref "${projectRef}" is in E02_KNOWN_PRODUCTION_REFS denylist`);
  }

  if (options?.requireDatabaseUrl && !process.env.DATABASE_URL?.trim()) {
    throw new Error('E02 guard: DATABASE_URL is required for pg-backed evidence paths');
  }

  if (options?.requireSupabaseKeys) {
    if (!process.env.SUPABASE_ANON_KEY?.trim()) {
      throw new Error('E02 guard: SUPABASE_ANON_KEY is required for authenticated evidence paths');
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
      throw new Error('E02 guard: SUPABASE_SERVICE_ROLE_KEY is required for fixture setup paths');
    }
  }

  const evidenceRunId = generateEvidenceRunId();
  const supabaseHost = new URL(supabaseUrl).host;

  console.info(
    `[e02-guard] evidenceRunId=${evidenceRunId} env=${environmentClass} projectRef=${projectRef} host=${supabaseHost}`,
  );

  return {
    evidenceRunId,
    environmentClass,
    projectRef,
    supabaseHost,
    allowDestructive: true,
  };
}
