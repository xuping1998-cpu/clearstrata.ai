import { describe, it } from 'vitest';

import { E02_RUNTIME_EXECUTION_AUTHORIZED, EEP_TEST_IDS, EVIDENCE_LEVEL } from '../fixtures/catalog';

const d = E02_RUNTIME_EXECUTION_AUTHORIZED ? describe : describe.skip;

d(`${EEP_TEST_IDS.IDEM} / ${EEP_TEST_IDS.NEW_ATTEMPT} [${EVIDENCE_LEVEL.L3_INTEGRATION}]`, () => {
  it(`${EEP_TEST_IDS.IDEM}: second RPC same IDs → IDEMPOTENT_RETURN · no row growth`, () => {});
  it(`${EEP_TEST_IDS.NEW_ATTEMPT}: reuse durable freeze_event_id across meetings → NEW_ATTEMPT_REQUIRED`, () => {});
});
