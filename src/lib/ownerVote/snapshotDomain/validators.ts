import type {
  FreezeEventDbRow,
  FrozenMotionDbRow,
  OwnerVoteMeetingDbRow,
  ResolutionSnapshotDbRow,
  VoterSnapshotDbRow,
} from './dbRows';
import { SnapshotDomainReadError } from './errors';

function requireString(field: string, value: unknown, rowLabel: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new SnapshotDomainReadError(
      'INVALID_ROW',
      `${rowLabel}.${field} must be a non-empty string`,
    );
  }
  return value.trim();
}

function requireBoolean(field: string, value: unknown, rowLabel: string): boolean {
  if (typeof value !== 'boolean') {
    throw new SnapshotDomainReadError('INVALID_ROW', `${rowLabel}.${field} must be boolean`);
  }
  return value;
}

function requireNumber(field: string, value: unknown, rowLabel: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new SnapshotDomainReadError('INVALID_ROW', `${rowLabel}.${field} must be a finite number`);
  }
  return value;
}

function nullableString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== 'string') {
    throw new SnapshotDomainReadError('INVALID_ROW', 'Expected string or null');
  }
  return value.trim() ? value.trim() : null;
}

function nullableUuid(value: unknown): string | null {
  if (value == null) return null;
  return requireString('id', value, 'nullableUuid');
}

function nullableInt(value: unknown): number | null {
  if (value == null) return null;
  return requireNumber('version', value, 'nullableInt');
}

export function validateOwnerVoteMeetingRow(raw: unknown): OwnerVoteMeetingDbRow {
  const row = raw as Record<string, unknown>;
  const label = 'owner_vote_meetings';
  return {
    id: requireString('id', row.id, label),
    property_id: requireString('property_id', row.property_id, label),
    status: requireString('status', row.status, label),
    voting_opens_at: nullableString(row.voting_opens_at),
    voting_closes_at: nullableString(row.voting_closes_at),
    snapshot_freeze_at: nullableString(row.snapshot_freeze_at),
    snapshot_frozen_at: nullableString(row.snapshot_frozen_at),
    scheduled_at: nullableString(row.scheduled_at),
    meeting_type: nullableString(row.meeting_type),
    created_at: requireString('created_at', row.created_at, label),
  };
}

export function validateFreezeEventRow(raw: unknown): FreezeEventDbRow {
  const row = raw as Record<string, unknown>;
  const label = 'owner_vote_freeze_events';
  return {
    id: requireString('id', row.id, label),
    owner_vote_meeting_id: requireString('owner_vote_meeting_id', row.owner_vote_meeting_id, label),
    property_id: requireString('property_id', row.property_id, label),
    frozen_at: requireString('frozen_at', row.frozen_at, label),
    is_primary: requireBoolean('is_primary', row.is_primary, label),
    created_at: requireString('created_at', row.created_at, label),
  };
}

export function validateVoterSnapshotRow(raw: unknown): VoterSnapshotDbRow {
  const row = raw as Record<string, unknown>;
  const label = 'owner_vote_voter_snapshot';
  return {
    id: requireString('id', row.id, label),
    meeting_id: requireString('meeting_id', row.meeting_id, label),
    property_id: requireString('property_id', row.property_id, label),
    unit_no: requireString('unit_no', row.unit_no, label),
    user_id: requireString('user_id', row.user_id, label),
    role: requireString('role', row.role, label),
    is_eligible: requireBoolean('is_eligible', row.is_eligible, label),
    frozen_at: requireString('frozen_at', row.frozen_at, label),
    created_at: requireString('created_at', row.created_at, label),
    freeze_event_id: nullableUuid(row.freeze_event_id),
  };
}

export function validateResolutionSnapshotRow(raw: unknown): ResolutionSnapshotDbRow {
  const row = raw as Record<string, unknown>;
  const label = 'owner_vote_resolution_snapshot';
  return {
    id: requireString('id', row.id, label),
    freeze_event_id: requireString('freeze_event_id', row.freeze_event_id, label),
    owner_vote_meeting_id: requireString('owner_vote_meeting_id', row.owner_vote_meeting_id, label),
    property_id: requireString('property_id', row.property_id, label),
    frozen_at: requireString('frozen_at', row.frozen_at, label),
    created_at: requireString('created_at', row.created_at, label),
  };
}

export function validateFrozenMotionRow(raw: unknown): FrozenMotionDbRow {
  const row = raw as Record<string, unknown>;
  const label = 'owner_vote_frozen_motions';
  return {
    id: requireString('id', row.id, label),
    resolution_snapshot_id: requireString('resolution_snapshot_id', row.resolution_snapshot_id, label),
    freeze_event_id: requireString('freeze_event_id', row.freeze_event_id, label),
    owner_vote_meeting_id: requireString('owner_vote_meeting_id', row.owner_vote_meeting_id, label),
    property_id: requireString('property_id', row.property_id, label),
    display_order: requireNumber('display_order', row.display_order, label),
    title: requireString('title', row.title, label),
    description: nullableString(row.description),
    threshold: requireString('threshold', row.threshold, label),
    vote_method: nullableString(row.vote_method),
    source_agenda_item_id: nullableUuid(row.source_agenda_item_id),
    source_resolution_id: nullableUuid(row.source_resolution_id),
    source_formal_resolution_version: nullableInt(row.source_formal_resolution_version),
    frozen_at: requireString('frozen_at', row.frozen_at, label),
    created_at: requireString('created_at', row.created_at, label),
  };
}

/** Cross-entity correlation checks after load (fail closed on drift). */
export function assertBundleCorrelation(params: {
  meetingId: string;
  propertyId: string;
  freezeEvent: { id: string; ownerVoteMeetingId: string; propertyId: string } | null;
  voterEntries: { meetingId: string; propertyId: string; freezeEventId: string | null }[];
  resolutionSnapshot: { freezeEventId: string; ownerVoteMeetingId: string; propertyId: string } | null;
  frozenMotions: {
    freezeEventId: string;
    ownerVoteMeetingId: string;
    propertyId: string;
    resolutionSnapshotId: string;
  }[];
  readMode: 'legacy_meeting' | 'event_linked';
}): void {
  const { meetingId, propertyId, freezeEvent, voterEntries, resolutionSnapshot, frozenMotions, readMode } =
    params;

  if (freezeEvent) {
    if (freezeEvent.ownerVoteMeetingId !== meetingId) {
      throw new SnapshotDomainReadError(
        'CORRELATION_MISMATCH',
        'Freeze event owner_vote_meeting_id does not match meeting.id',
      );
    }
    if (freezeEvent.propertyId !== propertyId) {
      throw new SnapshotDomainReadError(
        'CORRELATION_MISMATCH',
        'Freeze event property_id does not match meeting.property_id',
      );
    }
  }

  for (const entry of voterEntries) {
    if (entry.meetingId !== meetingId) {
      throw new SnapshotDomainReadError(
        'CORRELATION_MISMATCH',
        'Voter snapshot meeting_id does not match bundle meeting',
      );
    }
    if (entry.propertyId !== propertyId) {
      throw new SnapshotDomainReadError(
        'CORRELATION_MISMATCH',
        'Voter snapshot property_id does not match bundle meeting',
      );
    }
    if (readMode === 'event_linked' && freezeEvent) {
      if (entry.freezeEventId !== freezeEvent.id) {
        throw new SnapshotDomainReadError(
          'CORRELATION_MISMATCH',
          'Event-linked voter row freeze_event_id mismatch',
        );
      }
    }
  }

  if (resolutionSnapshot && freezeEvent) {
    if (resolutionSnapshot.freezeEventId !== freezeEvent.id) {
      throw new SnapshotDomainReadError(
        'CORRELATION_MISMATCH',
        'Resolution snapshot freeze_event_id mismatch',
      );
    }
    if (resolutionSnapshot.ownerVoteMeetingId !== meetingId) {
      throw new SnapshotDomainReadError(
        'CORRELATION_MISMATCH',
        'Resolution snapshot owner_vote_meeting_id mismatch',
      );
    }
  }

  const resolutionId = resolutionSnapshot?.id ?? null;
  for (const motion of frozenMotions) {
    if (freezeEvent && motion.freezeEventId !== freezeEvent.id) {
      throw new SnapshotDomainReadError(
        'CORRELATION_MISMATCH',
        'Frozen motion freeze_event_id mismatch',
      );
    }
    if (motion.ownerVoteMeetingId !== meetingId) {
      throw new SnapshotDomainReadError(
        'CORRELATION_MISMATCH',
        'Frozen motion owner_vote_meeting_id mismatch',
      );
    }
    if (resolutionId && motion.resolutionSnapshotId !== resolutionId) {
      throw new SnapshotDomainReadError(
        'CORRELATION_MISMATCH',
        'Frozen motion resolution_snapshot_id mismatch',
      );
    }
  }
}
