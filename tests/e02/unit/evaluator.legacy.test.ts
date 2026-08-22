import { describe, expect, it } from 'vitest';

import { evaluateCommittedFreezeByOwnerVoteMeetingId } from '@/lib/ownerVote/committedAuthority/evaluator';

import {
  EEP_TEST_IDS,
  EVIDENCE_LEVEL,
  UNIT_TEST_EVIDENCE_RUN_ID,
  createLegacyBundle,
  createMockAuditRepository,
  createMockBundleRepository,
} from '../fixtures';

describe(`${EEP_TEST_IDS.LEGACY} [${EVIDENCE_LEVEL.L2_UNIT}]`, () => {
  it('returns LEGACY_NOT_AUTHORITATIVE for legacy_meeting read mode', async () => {
    const propertyId = crypto.randomUUID();
    const bundle = createLegacyBundle(UNIT_TEST_EVIDENCE_RUN_ID, propertyId);
    const result = await evaluateCommittedFreezeByOwnerVoteMeetingId(bundle.meeting.id, {
      bundleRepository: createMockBundleRepository(bundle),
      auditRepository: createMockAuditRepository(null),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.status).toBe('LEGACY_NOT_AUTHORITATIVE');
    if (result.data.status === 'LEGACY_NOT_AUTHORITATIVE') {
      expect(result.data.reason.code).toBe('LEGACY_MEETING');
    }
  });
});
