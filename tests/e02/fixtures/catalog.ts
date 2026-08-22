/**
 * E-02 RU-1.4 — canonical test IDs, TG register, CITM mapping, execution gate.
 */

/** Integration / verify scripts MUST remain skipped until runtime execution is separately authorized. */
export const E02_RUNTIME_EXECUTION_AUTHORIZED = false as const;

export const ABNORMAL_PRIVILEGED_FIXTURE = 'ABNORMAL_PRIVILEGED_FIXTURE' as const;

/** Canonical EEP test IDs — do not renumber (IR §56). */
export const EEP_TEST_IDS = {
  SCHEMA_G: 'EEP-SCHEMA-G-001',
  HAPPY: 'EEP-HAPPY-001',
  C9: 'EEP-C9-001',
  NORM: 'EEP-NORM-001',
  LOST_ACK: 'EEP-LOST-ACK-001',
  ROLLBACK: 'EEP-ROLLBACK-001',
  EIR_048: 'EEP-EIR-048-001',
  EIR_048_A: 'EEP-EIR-048-001-A',
  EIR_048_B: 'EEP-EIR-048-001-B',
  EIR_048_C: 'EEP-EIR-048-001-C',
  EIR_048_D: 'EEP-EIR-048-001-D',
  EIR_048_E: 'EEP-EIR-048-001-E',
  EIR_054: 'EEP-EIR-054-001',
  DC_001: 'EEP-DC-001',
  IDEM: 'EEP-IDEM-001',
  NEW_ATTEMPT: 'EEP-NEW-ATTEMPT-001',
  PARTIAL: 'EEP-PARTIAL-001',
  AUDIT_MISS: 'EEP-AUDIT-MISS-001',
  MARKER_MISS: 'EEP-MARKER-MISS-001',
  COUNT_VOTER: 'EEP-COUNT-001',
  COUNT_RESOLUTION: 'EEP-COUNT-002',
  COUNT_MOTION: 'EEP-COUNT-003',
  C3_ZERO: 'EEP-C3-ZERO-001',
  C3_ONE: 'EEP-C3-ONE-001',
  C4_ZERO: 'EEP-C4-ZERO-001',
  C4_N: 'EEP-C4-N-001',
  ARTIFACT_F: 'EEP-F-001',
  MARKER_E: 'EEP-E-001',
  PRIMARY: 'EEP-PRIMARY-001',
  NON_PRIMARY: 'EEP-NON-PRIMARY-001',
  LEGACY: 'EEP-LEGACY-001',
  NO_FREEZE: 'EEP-NO-FREEZE-001',
  R204: 'EEP-R204-001',
  R227: 'EEP-R227-001',
  PROP_001: 'EEP-PROP-001',
  PROP_002: 'EEP-PROP-002',
  PROP_003: 'EEP-PROP-003',
  RPC_SEC: 'EEP-RPC-SEC-001',
} as const;

export type TestabilityGapId = 'TG-1' | 'TG-2' | 'TG-3';

export type TestabilityGapDefinition = {
  id: TestabilityGapId;
  description: string;
  mandatoryTarget: string;
  limitation: string;
  approvedSubstitute: string;
  runtimeClaimAllowed: string;
  runtimeClaimProhibited: string;
};

export const TG_REGISTER: TestabilityGapDefinition[] = [
  {
    id: 'TG-1',
    description: 'Post-E (marker) rollback before G commit via public RPC interface',
    mandatoryTarget: 'Mid-envelope failure after partial write',
    limitation: 'No test hook in production RPC',
    approvedSubstitute: 'Marker race post-A–D + durable absence proof + PostgreSQL txn semantics',
    runtimeClaimAllowed: 'Post-A–D rollback via marker race; absence after failed txn',
    runtimeClaimProhibited: 'Full post-G partial rollback without privileged corruption',
  },
  {
    id: 'TG-2',
    description: 'Deterministic DC-001 post-lock double-check runtime proof',
    mandatoryTarget: 'STEP 4 vs STEP 2 double-check under overlap',
    limitation: 'Cannot pause production RPC between STEP 2 and STEP 3',
    approvedSubstitute: 'Static SQL path proof + probabilistic race attempt',
    runtimeClaimAllowed: 'Documented attempt; static path verification',
    runtimeClaimProhibited: 'Deterministic DC-001 PASS from sequential IDEMPOTENT_RETURN',
  },
  {
    id: 'TG-3',
    description: 'Deterministic simultaneous two-RPC overlap',
    mandatoryTarget: 'EIR-048-B supplement via exact timing race',
    limitation: 'Timing-dependent; non-deterministic',
    approvedSubstitute: 'Decomposed EIR-048 composite (manual lock + winner + idempotent + uniqueness)',
    runtimeClaimAllowed: 'Decomposed overlap evidence',
    runtimeClaimProhibited: 'Claim exact two-RPC race observed unless evidenced',
  },
];

/** CITM traceability — PCQ-011 OPEN; no acceptance scoring. */
export const CITM_EEP_MAPPING: Record<string, string[]> = {
  '1': [EEP_TEST_IDS.HAPPY, EEP_TEST_IDS.PROP_002, EEP_TEST_IDS.COUNT_VOTER],
  '2': [
    EEP_TEST_IDS.C3_ONE,
    EEP_TEST_IDS.C4_ZERO,
    EEP_TEST_IDS.C4_N,
    EEP_TEST_IDS.COUNT_RESOLUTION,
    EEP_TEST_IDS.COUNT_MOTION,
  ],
  '4': [EEP_TEST_IDS.HAPPY, EEP_TEST_IDS.ROLLBACK, EEP_TEST_IDS.EIR_048, EEP_TEST_IDS.C9],
  '5': ['EEP-IMM-G-001', 'EEP-IMM-G-002', 'EEP-IMM-G-003', 'EEP-IMM-G-004', EEP_TEST_IDS.ARTIFACT_F],
  '12': [EEP_TEST_IDS.SCHEMA_G, 'EEP-IMM-G-001', EEP_TEST_IDS.HAPPY],
};

export type FixtureClassId =
  | 'cleanMeeting'
  | 'validFreezeSourceMeeting'
  | 'zeroResolutionMeeting'
  | 'oneResolutionMeeting'
  | 'zeroMotionMeeting'
  | 'multiMotionMeeting'
  | 'legacyMeeting'
  | 'nonPrimaryEventScenario'
  | 'crossPropertyScenario'
  | 'partialAuditMissingScenario'
  | 'markerMissingScenario'
  | 'countMismatchScenario';

export const FIXTURE_CLASS_IDS: FixtureClassId[] = [
  'cleanMeeting',
  'validFreezeSourceMeeting',
  'zeroResolutionMeeting',
  'oneResolutionMeeting',
  'zeroMotionMeeting',
  'multiMotionMeeting',
  'legacyMeeting',
  'nonPrimaryEventScenario',
  'crossPropertyScenario',
  'partialAuditMissingScenario',
  'markerMissingScenario',
  'countMismatchScenario',
];

/** Evidence level model — lower levels cannot claim higher verification. */
export const EVIDENCE_LEVEL = {
  L1_STATIC: 'L1',
  L2_UNIT: 'L2',
  L3_INTEGRATION: 'L3',
  L4_MULTI_SESSION: 'L4',
  L5_E2E: 'L5',
} as const;
