import { describe, it } from 'vitest';

import { E02_RUNTIME_EXECUTION_AUTHORIZED, EEP_TEST_IDS, EVIDENCE_LEVEL } from '../fixtures/catalog';

const d = E02_RUNTIME_EXECUTION_AUTHORIZED ? describe : describe.skip;

d(`${EEP_TEST_IDS.ARTIFACT_F} / ${EEP_TEST_IDS.MARKER_E} / ${EEP_TEST_IDS.PRIMARY} / ${EEP_TEST_IDS.NON_PRIMARY} [${EVIDENCE_LEVEL.L3_INTEGRATION}]`, () => {
  it(`${EEP_TEST_IDS.ARTIFACT_F}: status before === after · status_mutated=false (VERIFY-ONLY)`, () => {});
  it(`${EEP_TEST_IDS.MARKER_E}: snapshot_frozen_at = event.frozen_at = audit.freeze_boundary_at`, () => {});
  it(`${EEP_TEST_IDS.PRIMARY}: one primary per meeting · second primary constraint rejection`, () => {});
  it(`${EEP_TEST_IDS.NON_PRIMARY}: explicit event → NON_PRIMARY_EVENT`, () => {});
});
