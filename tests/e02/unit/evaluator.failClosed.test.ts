import { describe, expect, it } from 'vitest';

import { evaluateCommittedFreezeByOwnerVoteMeetingId } from '@/lib/ownerVote/committedAuthority/evaluator';
import { CommittedFreezeAuthorityError } from '@/lib/ownerVote/committedAuthority/errors';

import {
  ABNORMAL_PRIVILEGED_FIXTURE,
  EEP_TEST_IDS,
  EVIDENCE_LEVEL,
  UNIT_TEST_EVIDENCE_RUN_ID,
  buildArtifactFInvalidScenario,
  buildBoundaryMismatchScenario,
  buildCrossPropertyScenario,
  buildMarkerMissingScenario,
  buildMotionCountMismatchScenario,
  buildPartialAuditMissingScenario,
  buildResolutionCountMismatchScenario,
  buildValidFreezeSourceBundle,
  buildVoterCountMismatchScenario,
  createMockAuditRepository,
  createMockBundleRepository,
} from '../fixtures';

describe(`FAIL_CLOSED / partial branches [${EVIDENCE_LEVEL.L2_UNIT}]`, () => {
  it(`${EEP_TEST_IDS.AUDIT_MISS} — ${ABNORMAL_PRIVILEGED_FIXTURE} PARTIAL_DURABLE_STATE`, async () => {
    const { bundle } = buildPartialAuditMissingScenario(UNIT_TEST_EVIDENCE_RUN_ID);
    const result = await evaluateCommittedFreezeByOwnerVoteMeetingId(bundle.meeting.id, {
      bundleRepository: createMockBundleRepository(bundle),
      auditRepository: createMockAuditRepository(null),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.status).toBe('FAIL_CLOSED');
    if (result.data.status === 'FAIL_CLOSED') {
      expect(result.data.reason.code).toBe('PARTIAL_DURABLE_STATE');
    }
  });

  it(`${EEP_TEST_IDS.MARKER_MISS} — MARKER_MISSING`, async () => {
    const { bundle, audit } = buildMarkerMissingScenario(UNIT_TEST_EVIDENCE_RUN_ID);
    const result = await evaluateCommittedFreezeByOwnerVoteMeetingId(bundle.meeting.id, {
      bundleRepository: createMockBundleRepository(bundle),
      auditRepository: createMockAuditRepository(audit),
    });
    expect(result.ok).toBe(true);
    if (result.ok && result.data.status === 'FAIL_CLOSED') {
      expect(result.data.reason.code).toBe('MARKER_MISSING');
    }
  });

  it(`${EEP_TEST_IDS.COUNT_VOTER} — VOTER_COUNT_MISMATCH`, async () => {
    const { bundle, audit } = buildVoterCountMismatchScenario(UNIT_TEST_EVIDENCE_RUN_ID);
    const result = await evaluateCommittedFreezeByOwnerVoteMeetingId(bundle.meeting.id, {
      bundleRepository: createMockBundleRepository(bundle),
      auditRepository: createMockAuditRepository(audit),
    });
    expect(result.ok).toBe(true);
    if (result.ok && result.data.status === 'FAIL_CLOSED') {
      expect(result.data.reason.code).toBe('VOTER_COUNT_MISMATCH');
    }
  });

  it(`${EEP_TEST_IDS.COUNT_RESOLUTION} — RESOLUTION_COUNT_MISMATCH`, async () => {
    const { bundle, audit } = buildResolutionCountMismatchScenario(UNIT_TEST_EVIDENCE_RUN_ID);
    const result = await evaluateCommittedFreezeByOwnerVoteMeetingId(bundle.meeting.id, {
      bundleRepository: createMockBundleRepository(bundle),
      auditRepository: createMockAuditRepository(audit),
    });
    expect(result.ok).toBe(true);
    if (result.ok && result.data.status === 'FAIL_CLOSED') {
      expect(result.data.reason.code).toBe('RESOLUTION_COUNT_MISMATCH');
    }
  });

  it(`${EEP_TEST_IDS.COUNT_MOTION} — MOTION_COUNT_MISMATCH`, async () => {
    const { bundle, audit } = buildMotionCountMismatchScenario(UNIT_TEST_EVIDENCE_RUN_ID);
    const result = await evaluateCommittedFreezeByOwnerVoteMeetingId(bundle.meeting.id, {
      bundleRepository: createMockBundleRepository(bundle),
      auditRepository: createMockAuditRepository(audit),
    });
    expect(result.ok).toBe(true);
    if (result.ok && result.data.status === 'FAIL_CLOSED') {
      expect(result.data.reason.code).toBe('MOTION_COUNT_MISMATCH');
    }
  });

  it(`${EEP_TEST_IDS.PROP_002} — READ GUARD CORRELATION_MISMATCH`, async () => {
    const { bundle, audit } = buildCrossPropertyScenario(UNIT_TEST_EVIDENCE_RUN_ID);
    const result = await evaluateCommittedFreezeByOwnerVoteMeetingId(bundle.meeting.id, {
      bundleRepository: createMockBundleRepository(bundle),
      auditRepository: createMockAuditRepository(audit),
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe('CORRELATION_MISMATCH');
  });

  it(`${EEP_TEST_IDS.ARTIFACT_F} — ARTIFACT_F_INVALID`, async () => {
    const { bundle, audit } = buildArtifactFInvalidScenario(UNIT_TEST_EVIDENCE_RUN_ID);
    const result = await evaluateCommittedFreezeByOwnerVoteMeetingId(bundle.meeting.id, {
      bundleRepository: createMockBundleRepository(bundle),
      auditRepository: createMockAuditRepository(audit),
    });
    expect(result.ok).toBe(true);
    if (result.ok && result.data.status === 'FAIL_CLOSED') {
      expect(result.data.reason.code).toBe('ARTIFACT_F_INVALID');
    }
  });

  it('boundary mismatch — BOUNDARY_MISMATCH', async () => {
    const { bundle, audit } = buildBoundaryMismatchScenario(UNIT_TEST_EVIDENCE_RUN_ID);
    const result = await evaluateCommittedFreezeByOwnerVoteMeetingId(bundle.meeting.id, {
      bundleRepository: createMockBundleRepository(bundle),
      auditRepository: createMockAuditRepository(audit),
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.status).toBe('CORRELATION_MISMATCH');
    if (result.ok && result.data.status === 'CORRELATION_MISMATCH') {
      expect(result.data.reason.code).toBe('BOUNDARY_MISMATCH');
    }
  });

  it('repository DATABASE_ERROR mapping', async () => {
    const { bundle, audit } = buildValidFreezeSourceBundle(UNIT_TEST_EVIDENCE_RUN_ID);
    const result = await evaluateCommittedFreezeByOwnerVoteMeetingId(bundle.meeting.id, {
      bundleRepository: createMockBundleRepository(bundle),
      auditRepository: {
        loadByFreezeEventId: async () => ({
          ok: false,
          error: new CommittedFreezeAuthorityError('DATABASE_ERROR', 'simulated db error'),
        }),
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('DATABASE_ERROR');
  });
});
