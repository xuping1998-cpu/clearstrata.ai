/**
 * E-02 RU-1.4 — canonical evidence orchestrator (verify:e02).
 * Execution NOT AUTHORIZED until runtime gate + DB authority.
 */

import { assertRuntimeExecutionAuthorized } from './environment-guard.js';

export async function runE02EvidencePackage(): Promise<void> {
  assertRuntimeExecutionAuthorized('verify:e02');
  // Future authorized sequence:
  // 1. validateEnvironmentGuard({ requireDatabaseUrl: true, requireSupabaseKeys: true })
  // 2. optional runDbBaselineVerification()
  // 3. vitest integration suite
  // 4. writeEvidenceManifest
  throw new Error('Unreachable when execution gate closed');
}

runE02EvidencePackage().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
