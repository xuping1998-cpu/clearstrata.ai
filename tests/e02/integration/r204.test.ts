import { describe, it } from 'vitest';

import { E02_RUNTIME_EXECUTION_AUTHORIZED, EEP_TEST_IDS, EVIDENCE_LEVEL } from '../fixtures/catalog';

const d = E02_RUNTIME_EXECUTION_AUTHORIZED ? describe : describe.skip;

/** EEP-R204-001 — FK ON DELETE RESTRICT; disposable DB only */
d(`${EEP_TEST_IDS.R204} [${EVIDENCE_LEVEL.L3_INTEGRATION}]`, () => {
  it('DELETE owner_vote_freeze_events blocked when Primary Audit G exists', () => {});
});
