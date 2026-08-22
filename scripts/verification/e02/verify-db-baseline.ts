/**
 * E-02 RU-1.4 — L1 DB baseline verifier (EEP-SCHEMA-G-001).
 * Read-only catalog queries — execution NOT AUTHORIZED until runtime gate opens.
 */

import {
  assertRuntimeExecutionAuthorized,
  validateEnvironmentGuard,
} from './environment-guard.js';
import {
  createManifestEntry,
  writeEvidenceManifest,
} from './evidence-manifest.js';
import { SCHEMA_G_CATALOG_QUERIES } from './baseline/schema-g-catalog.js';

export async function runDbBaselineVerification(): Promise<void> {
  assertRuntimeExecutionAuthorized('verify:e02:baseline');
  const guard = validateEnvironmentGuard({ requireDatabaseUrl: true });

  // Lazy import — pg connection only when execution authorized (future).
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const startedAt = new Date().toISOString();
  const failures: string[] = [];

  try {
    for (const query of SCHEMA_G_CATALOG_QUERIES) {
      const res = await client.query(query.sql);
      const row = res.rows[0] as Record<string, unknown>;
      const key = Object.keys(row)[0];
      const actual = row[key];
      if (query.expected !== undefined && actual !== query.expected) {
        failures.push(`${query.id}: expected ${String(query.expected)} got ${String(actual)}`);
      }
    }
  } finally {
    await client.end();
  }

  const finishedAt = new Date().toISOString();
  await writeEvidenceManifest(guard.evidenceRunId, [
    createManifestEntry({
      evidenceRunId: guard.evidenceRunId,
      testId: 'EEP-SCHEMA-G-001',
      requirementIds: ['EIR-001', 'CITM-12'],
      fixtureId: 'schemaCatalog',
      environmentClass: guard.environmentClass,
      targetIdentifier: guard.projectRef,
      startedAt,
      finishedAt,
      command: 'verify:e02:baseline',
      expected: 'L1 schema catalog PASS',
      actual: failures.length === 0 ? 'L1 schema catalog PASS' : failures.join('; '),
      result: failures.length === 0 ? 'PASS' : 'FAIL',
      evidenceFiles: [],
      notes: 'L1 static/schema — not behavioral PASS',
    }),
  ]);

  if (failures.length > 0) {
    throw new Error(`Baseline verification failed: ${failures.join('; ')}`);
  }
}

runDbBaselineVerification().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
