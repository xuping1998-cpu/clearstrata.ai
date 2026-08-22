/**
 * E-02 RU-1.4 — evidence manifest JSON v1.0 (IR §19).
 * Harness may record testId result PASS — never EIR governance reclassification.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const EVIDENCE_MANIFEST_SCHEMA_VERSION = '1.0' as const;

export type EvidenceManifestResult =
  | 'PASS'
  | 'FAIL'
  | 'BLOCKED'
  | 'NOT_RUN'
  | 'N_A'
  | 'PENDING_EXTERNAL';

export type EvidenceManifestEntry = {
  schemaVersion: typeof EVIDENCE_MANIFEST_SCHEMA_VERSION;
  evidenceRunId: string;
  testId: string;
  requirementIds: string[];
  fixtureId: string;
  environmentClass: string;
  targetIdentifier: string;
  startedAt: string;
  finishedAt: string;
  command: string;
  expected: string;
  actual: string;
  result: EvidenceManifestResult;
  evidenceFiles: string[];
  notes: string;
};

export type EvidenceManifestDocument = {
  schemaVersion: typeof EVIDENCE_MANIFEST_SCHEMA_VERSION;
  evidenceRunId: string;
  entries: EvidenceManifestEntry[];
};

export function createManifestEntry(
  partial: Omit<EvidenceManifestEntry, 'schemaVersion'>,
): EvidenceManifestEntry {
  return {
    schemaVersion: EVIDENCE_MANIFEST_SCHEMA_VERSION,
    ...partial,
  };
}

export function evidenceDirectoryForRun(evidenceRunId: string): string {
  return path.join(process.cwd(), 'tests', 'e02', 'evidence', evidenceRunId);
}

export async function writeEvidenceManifest(
  evidenceRunId: string,
  entries: EvidenceManifestEntry[],
): Promise<string> {
  const dir = evidenceDirectoryForRun(evidenceRunId);
  await mkdir(dir, { recursive: true });
  const doc: EvidenceManifestDocument = {
    schemaVersion: EVIDENCE_MANIFEST_SCHEMA_VERSION,
    evidenceRunId,
    entries,
  };
  const filePath = path.join(dir, 'manifest.json');
  await writeFile(filePath, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
  return filePath;
}

export async function readEvidenceManifest(evidenceRunId: string): Promise<EvidenceManifestDocument> {
  const filePath = path.join(evidenceDirectoryForRun(evidenceRunId), 'manifest.json');
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw) as EvidenceManifestDocument;
}

/** Reject prohibited manifest result labels masquerading as runtime PASS. */
export function assertValidManifestResult(result: string): asserts result is EvidenceManifestResult {
  const allowed: EvidenceManifestResult[] = [
    'PASS',
    'FAIL',
    'BLOCKED',
    'NOT_RUN',
    'N_A',
    'PENDING_EXTERNAL',
  ];
  if (!allowed.includes(result as EvidenceManifestResult)) {
    throw new Error(
      `Invalid manifest result "${result}". Prohibited: ASSUMED_PASS, DESIGN_PASS, STATIC_PASS-as-runtime-PASS`,
    );
  }
}
