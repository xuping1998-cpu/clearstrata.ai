/**
 * E-02 RU-1.4 — EIR-048-A manual advisory lock concurrency harness source.
 * Session A: BEGIN + pg_advisory_xact_lock(hashtextextended(...)) hold
 * Session B: authenticated RPC → RETRYABLE
 */

import {
  assertRuntimeExecutionAuthorized,
  validateEnvironmentGuard,
} from './environment-guard.js';
import {
  createManifestEntry,
  writeEvidenceManifest,
} from './evidence-manifest.js';

/** Exact lock namespace from RU-1.2 migration. */
export const E02_OWNER_VOTE_FREEZE_LOCK_PREFIX = 'e02_owner_vote_freeze:' as const;

export function advisoryLockSql(meetingId: string): string {
  return `SELECT pg_advisory_xact_lock(
    hashtextextended('${E02_OWNER_VOTE_FREEZE_LOCK_PREFIX}' || $1::text, 0)
  )`;
}

export type ConcurrencyHarnessPlan = {
  sessionA: {
    action: 'BEGIN';
    lock: 'pg_advisory_xact_lock';
    lockKey: string;
    hold: true;
  };
  sessionB: {
    action: 'execute_owner_vote_atomic_freeze_commit';
    expectedOutcome: 'RETRYABLE';
    retryClassification: 'active_in_flight_owner';
  };
  sessionARelease: 'COMMIT' | 'ROLLBACK';
};

export function buildConcurrencyHarnessPlan(meetingId: string): ConcurrencyHarnessPlan {
  return {
    sessionA: {
      action: 'BEGIN',
      lock: 'pg_advisory_xact_lock',
      lockKey: `${E02_OWNER_VOTE_FREEZE_LOCK_PREFIX}${meetingId}`,
      hold: true,
    },
    sessionB: {
      action: 'execute_owner_vote_atomic_freeze_commit',
      expectedOutcome: 'RETRYABLE',
      retryClassification: 'active_in_flight_owner',
    },
    sessionARelease: 'COMMIT',
  };
}

export async function runConcurrencyVerification(meetingId: string): Promise<void> {
  assertRuntimeExecutionAuthorized('verify:e02:concurrency');
  const guard = validateEnvironmentGuard({
    requireDatabaseUrl: true,
    requireSupabaseKeys: true,
  });

  const plan = buildConcurrencyHarnessPlan(meetingId);
  const startedAt = new Date().toISOString();

  // Full multi-session execution deferred until runtime authorization.
  void plan;

  const finishedAt = new Date().toISOString();
  await writeEvidenceManifest(guard.evidenceRunId, [
    createManifestEntry({
      evidenceRunId: guard.evidenceRunId,
      testId: 'EEP-EIR-048-001-A',
      requirementIds: ['EIR-048-A'],
      fixtureId: 'concurrencyManualLock',
      environmentClass: guard.environmentClass,
      targetIdentifier: guard.projectRef,
      startedAt,
      finishedAt,
      command: 'verify:e02:concurrency',
      expected: 'RETRYABLE during lock overlap',
      actual: 'NOT_RUN — execution gate closed',
      result: 'NOT_RUN',
      evidenceFiles: [],
      notes: 'EIR-048 decomposed composite layer A — source implemented',
    }),
  ]);
}

runConcurrencyVerification('00000000-0000-4000-8000-000000000001').catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
