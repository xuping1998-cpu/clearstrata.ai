import { describe, it } from 'vitest';

import { E02_RUNTIME_EXECUTION_AUTHORIZED, EEP_TEST_IDS, EVIDENCE_LEVEL, TG_REGISTER } from '../fixtures/catalog';

const d = E02_RUNTIME_EXECUTION_AUTHORIZED ? describe : describe.skip;

/** EEP-ROLLBACK-001 — marker race post-A–D; pre-write ≠ mid-envelope proof. TG-1 explicit. */
d(`${EEP_TEST_IDS.ROLLBACK} [${EVIDENCE_LEVEL.L3_INTEGRATION}]`, () => {
  it('future: privileged concurrent marker race → marker_write_failed → no durable A–G', () => {});
  it(`TG-1: ${TG_REGISTER[0].limitation}`, () => {});
});
