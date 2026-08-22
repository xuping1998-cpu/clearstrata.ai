import { describe, expect, it } from 'vitest';

import {
  evaluateCommittedFreezeByFreezeEventId,
  evaluateCommittedFreezeByOwnerVoteMeetingId,
} from '@/lib/ownerVote/committedAuthority/evaluator';

import {
  EEP_TEST_IDS,
  EVIDENCE_LEVEL,
  UNIT_TEST_EVIDENCE_RUN_ID,
  buildNonPrimaryEventBundle,
  buildValidFreezeSourceBundle,
  createMockAuditRepository,
  createMockBundleRepository,
  createNoFreezeBundle,
} from '../fixtures';

describe(`${EEP_TEST_IDS.NON_PRIMARY} / ${EEP_TEST_IDS.NO_FREEZE} [${EVIDENCE_LEVEL.L2_UNIT}]`, () => {
  it(`${EEP_TEST_IDS.NON_PRIMARY} — explicit non-primary event NON_PRIMARY_EVENT`, async () => {
    const { bundle, audit } = buildNonPrimaryEventBundle(UNIT_TEST_EVIDENCE_RUN_ID);
    const result = await evaluateCommittedFreezeByOwnerVoteMeetingId(bundle.meeting.id, {
      bundleRepository: createMockBundleRepository(bundle),
      auditRepository: createMockAuditRepository(audit),
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe('NON_PRIMARY_EVENT');
  });

  it(`${EEP_TEST_IDS.NON_PRIMARY} — evaluateByFreezeEventId on non-primary explicit event`, async () => {
    const { bundle, audit } = buildNonPrimaryEventBundle(UNIT_TEST_EVIDENCE_RUN_ID);
    const eventId = bundle.freezeEvent?.id ?? '';
    const result = await evaluateCommittedFreezeByFreezeEventId(eventId, {
      bundleRepository: createMockBundleRepository(bundle),
      auditRepository: createMockAuditRepository(audit),
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe('NON_PRIMARY_EVENT');
  });

  it(`${EEP_TEST_IDS.NO_FREEZE} — clean meeting without footprint`, async () => {
    const propertyId = crypto.randomUUID();
    const bundle = createNoFreezeBundle(UNIT_TEST_EVIDENCE_RUN_ID, propertyId);
    const result = await evaluateCommittedFreezeByOwnerVoteMeetingId(bundle.meeting.id, {
      bundleRepository: createMockBundleRepository(bundle),
      auditRepository: createMockAuditRepository(null),
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe('NO_FREEZE');
  });

  it('primary meeting evaluator remains COMMITTED when event is primary', async () => {
    const { bundle, audit } = buildValidFreezeSourceBundle(UNIT_TEST_EVIDENCE_RUN_ID);
    const result = await evaluateCommittedFreezeByFreezeEventId(bundle.freezeEvent!.id, {
      bundleRepository: createMockBundleRepository(bundle),
      auditRepository: createMockAuditRepository(audit),
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe('COMMITTED');
  });
});
