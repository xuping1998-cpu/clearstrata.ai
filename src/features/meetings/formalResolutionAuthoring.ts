import { supabase } from '@/lib/supabase';
import { withProperty } from '@/lib/supabaseTenant';
import type { VoteRule } from '@/features/meetings/api';
import {
  canEditFormalResolutionContent,
  formalResolutionAuditEventLabel,
  isFormalResolutionAgenda,
  nextFormalResolutionStateTransition,
  normalizeFormalResolutionState,
  type FormalResolutionAuditEventKind,
  type FormalResolutionAuditRow,
  type FormalResolutionState,
} from '@/lib/meetings/formalResolutionModel';
import type { MeetingAgendaRow } from '@/features/meetings/api';

export type { FormalResolutionAuditRow, FormalResolutionState };

function agendaSnapshot(row: Partial<MeetingAgendaRow> & { formal_resolution_version?: number; formal_resolution_state?: string }) {
  return {
    title_zh: row.title_zh ?? null,
    title_en: row.title_en ?? null,
    description_zh: row.description_zh ?? null,
    description_en: row.description_en ?? null,
    vote_rule: row.vote_rule ?? null,
    sort_order: row.sort_order ?? null,
    formal_resolution_version: row.formal_resolution_version ?? 1,
    formal_resolution_state: row.formal_resolution_state ?? 'draft',
  };
}

async function insertFormalResolutionAudit(input: {
  agendaItemId: string;
  propertyId: string;
  meetingId: string;
  eventKind: FormalResolutionAuditEventKind;
  version: number;
  resolutionState: FormalResolutionState | null;
  snapshot: Record<string, unknown>;
  actorId: string | null;
}) {
  const { error } = await supabase.from('meeting_formal_resolution_audit').insert({
    agenda_item_id: input.agendaItemId,
    property_id: input.propertyId,
    meeting_id: input.meetingId,
    event_kind: input.eventKind,
    version: input.version,
    resolution_state: input.resolutionState,
    snapshot: input.snapshot,
    actor_id: input.actorId,
  });
  if (error) {
    console.warn('[formalResolutionAuthoring] audit insert', error.message);
  }
}

export async function fetchFormalResolutionAuditLog(
  propertyId: string,
  agendaItemId: string,
): Promise<{ rows: FormalResolutionAuditRow[]; error: Error | null }> {
  const { data, error } = await withProperty(
    supabase
      .from('meeting_formal_resolution_audit')
      .select(
        'id, agenda_item_id, property_id, meeting_id, event_kind, version, resolution_state, snapshot, actor_id, created_at',
      ) as any,
    propertyId,
  )
    .eq('agenda_item_id', agendaItemId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return { rows: [], error: new Error(error.message) };
  return { rows: (data ?? []) as FormalResolutionAuditRow[], error: null };
}

export async function createFormalResolution(input: {
  propertyId: string;
  meetingId: string;
  sortOrder: number;
  titleZh?: string | null;
  titleEn?: string | null;
  descriptionZh?: string | null;
  descriptionEn?: string | null;
  voteRule: VoteRule;
  actorId: string;
}) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('meeting_agenda_items')
    .insert({
      meeting_id: input.meetingId,
      property_id: input.propertyId,
      item_number: input.sortOrder,
      sort_order: input.sortOrder,
      title_en: input.titleEn ?? null,
      title_zh: input.titleZh ?? null,
      description_en: input.descriptionEn ?? null,
      description_zh: input.descriptionZh ?? null,
      requires_vote: true,
      vote_rule: input.voteRule,
      formal_resolution_version: 1,
      formal_resolution_state: 'draft',
      formal_resolution_modified_by: input.actorId,
      formal_resolution_modified_at: now,
    })
    .select('id, formal_resolution_version, formal_resolution_state')
    .maybeSingle();

  if (error || !data?.id) return { id: undefined, error };

  await insertFormalResolutionAudit({
    agendaItemId: data.id as string,
    propertyId: input.propertyId,
    meetingId: input.meetingId,
    eventKind: 'create',
    version: 1,
    resolutionState: 'draft',
    snapshot: agendaSnapshot({
      title_zh: input.titleZh,
      title_en: input.titleEn,
      description_zh: input.descriptionZh,
      description_en: input.descriptionEn,
      vote_rule: input.voteRule,
      sort_order: input.sortOrder,
      formal_resolution_version: 1,
      formal_resolution_state: 'draft',
    }),
    actorId: input.actorId,
  });

  return { id: data.id as string, error: null };
}

export async function updateFormalResolution(input: {
  propertyId: string;
  meetingId: string;
  agendaItemId: string;
  currentVersion: number;
  currentState: FormalResolutionState;
  titleZh?: string | null;
  titleEn?: string | null;
  descriptionZh?: string | null;
  descriptionEn?: string | null;
  voteRule: VoteRule;
  sortOrder: number;
  actorId: string;
}) {
  if (!canEditFormalResolutionContent(input.currentState)) {
    return { error: new Error('FINAL_LOCKED') };
  }

  const nextVersion = Math.max(1, input.currentVersion) + 1;
  const now = new Date().toISOString();

  const { data, error } = await withProperty(
    supabase
      .from('meeting_agenda_items')
      .update({
        title_en: input.titleEn ?? null,
        title_zh: input.titleZh ?? null,
        description_en: input.descriptionEn ?? null,
        description_zh: input.descriptionZh ?? null,
        vote_rule: input.voteRule,
        requires_vote: true,
        formal_resolution_version: nextVersion,
        formal_resolution_modified_by: input.actorId,
        formal_resolution_modified_at: now,
      } as Record<string, unknown>) as any,
    input.propertyId,
  )
    .eq('id', input.agendaItemId)
    .eq('meeting_id', input.meetingId)
    .select('id')
    .maybeSingle();

  if (error) return { error: new Error(error.message) };

  await insertFormalResolutionAudit({
    agendaItemId: input.agendaItemId,
    propertyId: input.propertyId,
    meetingId: input.meetingId,
    eventKind: 'edit',
    version: nextVersion,
    resolutionState: input.currentState,
    snapshot: agendaSnapshot({
      title_zh: input.titleZh,
      title_en: input.titleEn,
      description_zh: input.descriptionZh,
      description_en: input.descriptionEn,
      vote_rule: input.voteRule,
      sort_order: input.sortOrder,
      formal_resolution_version: nextVersion,
      formal_resolution_state: input.currentState,
    }),
    actorId: input.actorId,
  });

  return { id: data?.id as string | undefined, error: null };
}

export async function logFormalResolutionDelete(input: {
  propertyId: string;
  meetingId: string;
  agendaItemId: string;
  row: MeetingAgendaRow;
  actorId: string;
}) {
  const version = Number((input.row as { formal_resolution_version?: number }).formal_resolution_version ?? 1);
  const state = normalizeFormalResolutionState(
    (input.row as { formal_resolution_state?: string }).formal_resolution_state,
  );
  await insertFormalResolutionAudit({
    agendaItemId: input.agendaItemId,
    propertyId: input.propertyId,
    meetingId: input.meetingId,
    eventKind: 'delete',
    version,
    resolutionState: state,
    snapshot: agendaSnapshot({ ...input.row, formal_resolution_version: version, formal_resolution_state: state }),
    actorId: input.actorId,
  });
}

export async function reorderFormalResolutions(input: {
  propertyId: string;
  meetingId: string;
  agendaItems: MeetingAgendaRow[];
  agendaItemId: string;
  direction: 'up' | 'down';
  actorId: string;
}) {
  const formalRows = input.agendaItems.filter(isFormalResolutionAgenda).sort((a, b) => a.sort_order - b.sort_order);
  const idx = formalRows.findIndex((r) => r.id === input.agendaItemId);
  if (idx < 0) return { error: new Error('NOT_FOUND') };

  const swapIdx = input.direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= formalRows.length) return { error: null, swapped: false as const };

  const a = formalRows[idx];
  const b = formalRows[swapIdx];
  const orderA = a.sort_order;
  const orderB = b.sort_order;

  const { error: errA } = await withProperty(
    supabase
      .from('meeting_agenda_items')
      .update({ sort_order: orderB, item_number: orderB } as Record<string, unknown>) as any,
    input.propertyId,
  )
    .eq('id', a.id)
    .eq('meeting_id', input.meetingId);

  if (errA) return { error: new Error(errA.message) };

  const { error: errB } = await withProperty(
    supabase
      .from('meeting_agenda_items')
      .update({ sort_order: orderA, item_number: orderA } as Record<string, unknown>) as any,
    input.propertyId,
  )
    .eq('id', b.id)
    .eq('meeting_id', input.meetingId);

  if (errB) return { error: new Error(errB.message) };

  const versionA = Number((a as { formal_resolution_version?: number }).formal_resolution_version ?? 1);
  const versionB = Number((b as { formal_resolution_version?: number }).formal_resolution_version ?? 1);
  const stateA = normalizeFormalResolutionState((a as { formal_resolution_state?: string }).formal_resolution_state);
  const stateB = normalizeFormalResolutionState((b as { formal_resolution_state?: string }).formal_resolution_state);

  await insertFormalResolutionAudit({
    agendaItemId: a.id,
    propertyId: input.propertyId,
    meetingId: input.meetingId,
    eventKind: 'reorder',
    version: versionA,
    resolutionState: stateA,
    snapshot: {
      direction: input.direction,
      from_sort_order: orderA,
      to_sort_order: orderB,
      peer_agenda_item_id: b.id,
    },
    actorId: input.actorId,
  });

  await insertFormalResolutionAudit({
    agendaItemId: b.id,
    propertyId: input.propertyId,
    meetingId: input.meetingId,
    eventKind: 'reorder',
    version: versionB,
    resolutionState: stateB,
    snapshot: {
      direction: input.direction === 'up' ? 'down' : 'up',
      from_sort_order: orderB,
      to_sort_order: orderA,
      peer_agenda_item_id: a.id,
    },
    actorId: input.actorId,
  });

  return { error: null, swapped: true as const, rows: [a, b] as const };
}

export async function transitionFormalResolutionState(input: {
  propertyId: string;
  meetingId: string;
  agendaItemId: string;
  currentState: FormalResolutionState;
  targetState: FormalResolutionState;
  currentVersion: number;
  row: MeetingAgendaRow;
  actorId: string;
}) {
  const next = nextFormalResolutionStateTransition(input.currentState, input.targetState);
  if (!next) return { error: new Error('INVALID_TRANSITION') };

  const now = new Date().toISOString();
  const eventKind: FormalResolutionAuditEventKind = next === 'final' ? 'finalize' : 'state_change';

  const { error } = await withProperty(
    supabase
      .from('meeting_agenda_items')
      .update({
        formal_resolution_state: next,
        formal_resolution_modified_by: input.actorId,
        formal_resolution_modified_at: now,
      } as Record<string, unknown>) as any,
    input.propertyId,
  )
    .eq('id', input.agendaItemId)
    .eq('meeting_id', input.meetingId);

  if (error) return { error: new Error(error.message) };

  await insertFormalResolutionAudit({
    agendaItemId: input.agendaItemId,
    propertyId: input.propertyId,
    meetingId: input.meetingId,
    eventKind,
    version: input.currentVersion,
    resolutionState: next,
    snapshot: {
      from_state: input.currentState,
      to_state: next,
      agenda: agendaSnapshot({
        ...input.row,
        formal_resolution_version: input.currentVersion,
        formal_resolution_state: next,
      }),
    },
    actorId: input.actorId,
  });

  return { state: next, error: null };
}

export { formalResolutionAuditEventLabel, isFormalResolutionAgenda };
