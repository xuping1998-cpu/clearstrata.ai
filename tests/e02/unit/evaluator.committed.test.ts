import { describe, expect, it } from 'vitest';

import { evaluateCommittedFreezeByOwnerVoteMeetingId } from '@/lib/ownerVote/committedAuthority/evaluator';

import {
  EEP_TEST_IDS,
  EVIDENCE_LEVEL,
  UNIT_TEST_EVIDENCE_RUN_ID,
  buildMultiMotionBundle,
  buildOneResolutionBundle,
  buildValidFreezeSourceBundle,
  buildZeroMotionBundle,
  buildZeroResolutionEvaluatorBundle,
  createMockAuditRepository,
  createMockBundleRepository,
} from '../fixtures';

/**
 * L2 unit tests — injectable repository mocks.
 * UNIT TEST DOES NOT PROVE C9 DURABLE VISIBILITY (EEP-C9-001 is L3 integration).
 */
describe(`${EEP_TEST_IDS.HAPPY} / COMMITTED branches [${EVIDENCE_LEVEL.L2_UNIT}]`, () => {
  it('returns COMMITTED for complete correlated evidence', async () => {
    const { bundle, audit } = buildValidFreezeSourceBundle(UNIT_TEST_EVIDENCE_RUN_ID);
    const result = await evaluateCommittedFreezeByOwnerVoteMeetingId(bundle.meeting.id, {
      bundleRepository: createMockBundleRepository(bundle),
      auditRepository: createMockAuditRepository(audit),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.status).toBe('COMMITTED');
    expect(result.data.authority).toBe(true);
    if (result.data.status === 'COMMITTED') {
      expect(result.data.freezeEventId).toBe(bundle.freezeEvent?.id);
      expect(result.data.primaryAuditId).toBe(audit.id);
    }
  });

  it(`${EEP_TEST_IDS.C3_ONE} — one resolution COMMITTED`, async () => {
    const { bundle, audit } = buildOneResolutionBundle(UNIT_TEST_EVIDENCE_RUN_ID);
    const result = await evaluateCommittedFreezeByOwnerVoteMeetingId(bundle.meeting.id, {
      bundleRepository: createMockBundleRepository(bundle),
      auditRepository: createMockAuditRepository(audit),
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe('COMMITTED');
  });

  it(`${EEP_TEST_IDS.C4_ZERO} — zero motions COMMITTED`, async () => {
    const { bundle, audit } = buildZeroMotionBundle(UNIT_TEST_EVIDENCE_RUN_ID);
    const result = await evaluateCommittedFreezeByOwnerVoteMeetingId(bundle.meeting.id, {
      bundleRepository: createMockBundleRepository(bundle),
      auditRepository: createMockAuditRepository(audit),
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe('COMMITTED');
  });

  it(`${EEP_TEST_IDS.C4_N} — N motions COMMITTED`, async () => {
    const { bundle, audit } = buildMultiMotionBundle(UNIT_TEST_EVIDENCE_RUN_ID, 3);
    const result = await evaluateCommittedFreezeByOwnerVoteMeetingId(bundle.meeting.id, {
      bundleRepository: createMockBundleRepository(bundle),
      auditRepository: createMockAuditRepository(audit),
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe('COMMITTED');
  });

  it(`${EEP_TEST_IDS.C3_ZERO} — zero resolution evaluator logic (L2 mandatory; RPC path limited by RU-1.2 >=1 qualifying)`, async () => {
    const { bundle, audit } = buildZeroResolutionEvaluatorBundle(UNIT_TEST_EVIDENCE_RUN_ID);
    const result = await evaluateCommittedFreezeByOwnerVoteMeetingId(bundle.meeting.id, {
      bundleRepository: createMockBundleRepository(bundle),
      auditRepository: createMockAuditRepository(audit),
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe('COMMITTED');
  });
});
