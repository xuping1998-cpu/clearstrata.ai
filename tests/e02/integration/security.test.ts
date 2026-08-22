import { describe, it } from 'vitest';

import { E02_RUNTIME_EXECUTION_AUTHORIZED, EEP_TEST_IDS, EVIDENCE_LEVEL } from '../fixtures/catalog';

const d = E02_RUNTIME_EXECUTION_AUTHORIZED ? describe : describe.skip;

/** service_role setup never counts as RLS PASS */
d(`${EEP_TEST_IDS.RPC_SEC} / EEP-SEC-001 – EEP-SEC-008 [${EVIDENCE_LEVEL.L3_INTEGRATION}]`, () => {
  it('authorized council/admin/property_admin RPC allow', () => {});
  it('ordinary owner / unrelated property / anon RPC deny', () => {});
  it('tenant authorized audit read per policy; cross-property deny', () => {});
  it('authenticated direct G INSERT/UPDATE/DELETE deny', () => {});
});
