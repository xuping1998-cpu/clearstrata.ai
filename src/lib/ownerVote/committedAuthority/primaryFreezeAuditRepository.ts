import type { SupabaseClient } from '@supabase/supabase-js';

import { supabase as defaultClient } from '@/lib/supabaseClient';

import {
  authorityErr,
  authorityFromPostgrestError,
  authorityOk,
  type CommittedFreezeAuthorityResult,
} from './errors';
import type { MeetingLifecycleCompatibilityEvidence, PrimaryFreezeAuditRecord } from './types';

/** Raw PostgREST row for owner_vote_primary_freeze_audits (not yet in generated Database types). */
export type PrimaryFreezeAuditDbRow = {
  id: string;
  freeze_event_id: string;
  owner_vote_meeting_id: string;
  property_id: string;
  attempt_id: string;
  freeze_boundary_at: string;
  audit_kind: string;
  schema_version: number;
  primary_event_is_primary: boolean;
  voter_snapshot_count: number;
  resolution_snapshot_count: number;
  frozen_motion_count: number;
  materialization_summary: unknown;
  commit_set_result: string;
  marker_evidence: unknown;
  meeting_lifecycle_compatibility: unknown;
  transaction_outcome: string;
  commit_evidence: unknown;
  transaction_reference_at: string;
  created_at: string;
};

export const PRIMARY_FREEZE_AUDIT_SELECT =
  'id,freeze_event_id,owner_vote_meeting_id,property_id,attempt_id,freeze_boundary_at,audit_kind,schema_version,primary_event_is_primary,voter_snapshot_count,resolution_snapshot_count,frozen_motion_count,materialization_summary,commit_set_result,marker_evidence,meeting_lifecycle_compatibility,transaction_outcome,commit_evidence,transaction_reference_at,created_at';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseMeetingLifecycleCompatibility(value: unknown): MeetingLifecycleCompatibilityEvidence {
  if (!isRecord(value)) {
    return {};
  }
  return {
    status_mutated: typeof value.status_mutated === 'boolean' ? value.status_mutated : undefined,
    compatible: typeof value.compatible === 'boolean' ? value.compatible : undefined,
    checks_performed: value.checks_performed,
    lifecycle_observations: isRecord(value.lifecycle_observations) ? value.lifecycle_observations : undefined,
  };
}

function mapPrimaryFreezeAuditRecord(row: PrimaryFreezeAuditDbRow): PrimaryFreezeAuditRecord {
  return {
    id: row.id,
    freezeEventId: row.freeze_event_id,
    ownerVoteMeetingId: row.owner_vote_meeting_id,
    propertyId: row.property_id,
    attemptId: row.attempt_id,
    freezeBoundaryAt: row.freeze_boundary_at,
    auditKind: row.audit_kind as 'PRIMARY_FREEZE_AUDIT',
    schemaVersion: row.schema_version,
    primaryEventIsPrimary: row.primary_event_is_primary,
    voterSnapshotCount: row.voter_snapshot_count,
    resolutionSnapshotCount: row.resolution_snapshot_count,
    frozenMotionCount: row.frozen_motion_count,
    materializationSummary: isRecord(row.materialization_summary) ? row.materialization_summary : {},
    commitSetResult: row.commit_set_result as 'ATOMIC_SET_COMPLETE',
    markerEvidence: isRecord(row.marker_evidence) ? row.marker_evidence : {},
    meetingLifecycleCompatibility: parseMeetingLifecycleCompatibility(row.meeting_lifecycle_compatibility),
    transactionOutcome: row.transaction_outcome as 'ATOMIC_ENVELOPE_MEMBER',
    commitEvidence: isRecord(row.commit_evidence) ? row.commit_evidence : {},
    transactionReferenceAt: row.transaction_reference_at,
    createdAt: row.created_at,
  };
}

function validatePrimaryFreezeAuditRow(row: PrimaryFreezeAuditDbRow): PrimaryFreezeAuditRecord {
  if (!row.id || !row.freeze_event_id || !row.owner_vote_meeting_id || !row.property_id) {
    throw new Error('Primary freeze audit row missing required identity columns');
  }
  if (row.audit_kind !== 'PRIMARY_FREEZE_AUDIT') {
    throw new Error(`Invalid audit_kind: ${row.audit_kind}`);
  }
  if (row.commit_set_result !== 'ATOMIC_SET_COMPLETE') {
    throw new Error(`Invalid commit_set_result: ${row.commit_set_result}`);
  }
  if (row.transaction_outcome !== 'ATOMIC_ENVELOPE_MEMBER') {
    throw new Error(`Invalid transaction_outcome: ${row.transaction_outcome}`);
  }
  if (row.schema_version < 1) {
    throw new Error(`Invalid schema_version: ${row.schema_version}`);
  }
  if (row.resolution_snapshot_count < 0 || row.resolution_snapshot_count > 1) {
    throw new Error(`Invalid resolution_snapshot_count: ${row.resolution_snapshot_count}`);
  }
  return mapPrimaryFreezeAuditRecord(row);
}

/** Read-only contract for Primary Audit (Artifact G). */
export interface PrimaryFreezeAuditRepository {
  loadByFreezeEventId(freezeEventId: string): Promise<CommittedFreezeAuthorityResult<PrimaryFreezeAuditRecord | null>>;
}

export type CreatePrimaryFreezeAuditRepositoryOptions = {
  client?: SupabaseClient;
};

/**
 * Loads Primary Audit by freeze_event_id (authenticated client / RLS).
 * 0 rows → null · 1 row → typed record · >1 → FAIL_CLOSED.
 */
export async function loadPrimaryFreezeAuditByFreezeEventId(
  freezeEventId: string,
  client: SupabaseClient = defaultClient,
): Promise<CommittedFreezeAuthorityResult<PrimaryFreezeAuditRecord | null>> {
  const trimmed = freezeEventId.trim();
  if (!trimmed) {
    return authorityErr('INVALID_ROW', 'Freeze event id is required for Primary Audit lookup');
  }

  const { data, error } = await client
    .from('owner_vote_primary_freeze_audits')
    .select(PRIMARY_FREEZE_AUDIT_SELECT)
    .eq('freeze_event_id', trimmed)
    .maybeSingle();

  if (error) {
    const message = error.message ?? 'unknown database error';
    if (message.includes('multiple') || message.includes('2 rows') || error.code === 'PGRST116') {
      return authorityErr('FAIL_CLOSED', 'Multiple Primary Audit rows for freeze event (UNIQUE violation)', message);
    }
    return authorityErr(
      'DATABASE_ERROR',
      authorityFromPostgrestError('load primary freeze audit', message).message,
      message,
    );
  }

  if (!data) {
    return authorityOk(null);
  }

  try {
    return authorityOk(validatePrimaryFreezeAuditRow(data as PrimaryFreezeAuditDbRow));
  } catch (e) {
    return authorityErr(
      'INVALID_ROW',
      e instanceof Error ? e.message : 'Invalid owner_vote_primary_freeze_audits row',
    );
  }
}

/** Factory for injectable read-only Primary Audit repository. */
export function createPrimaryFreezeAuditRepository(
  options: CreatePrimaryFreezeAuditRepositoryOptions = {},
): PrimaryFreezeAuditRepository {
  const client = options.client ?? defaultClient;
  return {
    loadByFreezeEventId: (freezeEventId) => loadPrimaryFreezeAuditByFreezeEventId(freezeEventId, client),
  };
}

/** Default singleton read repository. */
export const primaryFreezeAuditRepository = createPrimaryFreezeAuditRepository();
