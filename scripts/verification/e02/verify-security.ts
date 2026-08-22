/**
 * E-02 RU-1.4 — security / RLS matrix orchestration helper.
 * Execution NOT AUTHORIZED — defines future EEP-SEC-* matrix only.
 */

import {
  assertRuntimeExecutionAuthorized,
  validateEnvironmentGuard,
} from './environment-guard.js';

export type SecurityMatrixCase = {
  testId: string;
  identityKey: string;
  operation: 'rpc_freeze_commit' | 'audit_select' | 'audit_insert' | 'audit_update' | 'audit_delete';
  expected: 'allow' | 'deny';
  usesServiceRole: boolean;
};

/** service_role setup never counts as RLS PASS on authenticated paths. */
export const SECURITY_MATRIX: SecurityMatrixCase[] = [
  { testId: 'EEP-RPC-SEC-001', identityKey: 'authorizedCouncil', operation: 'rpc_freeze_commit', expected: 'allow', usesServiceRole: false },
  { testId: 'EEP-SEC-001', identityKey: 'authorizedAdmin', operation: 'rpc_freeze_commit', expected: 'allow', usesServiceRole: false },
  { testId: 'EEP-SEC-002', identityKey: 'authorizedPropertyAdmin', operation: 'rpc_freeze_commit', expected: 'allow', usesServiceRole: false },
  { testId: 'EEP-SEC-003', identityKey: 'ordinaryOwner', operation: 'rpc_freeze_commit', expected: 'deny', usesServiceRole: false },
  { testId: 'EEP-SEC-004', identityKey: 'unrelatedPropertyUser', operation: 'rpc_freeze_commit', expected: 'deny', usesServiceRole: false },
  { testId: 'EEP-SEC-005', identityKey: 'anon', operation: 'rpc_freeze_commit', expected: 'deny', usesServiceRole: false },
  { testId: 'EEP-SEC-006', identityKey: 'authorizedCouncil', operation: 'audit_select', expected: 'allow', usesServiceRole: false },
  { testId: 'EEP-SEC-007', identityKey: 'unrelatedPropertyUser', operation: 'audit_select', expected: 'deny', usesServiceRole: false },
  { testId: 'EEP-SEC-008', identityKey: 'authorizedCouncil', operation: 'audit_insert', expected: 'deny', usesServiceRole: false },
  { testId: 'EEP-IMM-G-002', identityKey: 'authorizedCouncil', operation: 'audit_update', expected: 'deny', usesServiceRole: false },
  { testId: 'EEP-IMM-G-003', identityKey: 'authorizedCouncil', operation: 'audit_delete', expected: 'deny', usesServiceRole: false },
];

export async function runSecurityVerification(): Promise<void> {
  assertRuntimeExecutionAuthorized('verify:e02:security');
  validateEnvironmentGuard({ requireDatabaseUrl: true, requireSupabaseKeys: true });
  // Future: iterate SECURITY_MATRIX with authenticated clients only for PASS side.
}

runSecurityVerification().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
