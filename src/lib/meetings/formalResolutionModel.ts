import type { MeetingAgendaRow } from '@/features/meetings/api';
import { extractElectionAgendaMeta, isRemoveCouncilGovernanceAgenda } from '@/features/meetings/electionAgendaModel';

/** RC010 / M2 — Meeting-owned formal resolution lifecycle (freeze is a separate boundary). */
export type FormalResolutionState = 'draft' | 'under_review' | 'final';

export type FormalResolutionAuditEventKind =
  | 'create'
  | 'edit'
  | 'delete'
  | 'reorder'
  | 'finalize'
  | 'state_change';

export interface FormalResolutionAuditRow {
  id: string;
  agenda_item_id: string;
  property_id: string;
  meeting_id: string;
  event_kind: FormalResolutionAuditEventKind;
  version: number;
  resolution_state: FormalResolutionState | null;
  snapshot: Record<string, unknown>;
  actor_id: string | null;
  created_at: string;
}

export interface FormalResolutionAgendaRow extends MeetingAgendaRow {
  formal_resolution_version: number;
  formal_resolution_state: FormalResolutionState;
  formal_resolution_modified_by: string | null;
  formal_resolution_modified_at: string | null;
}

export function isFormalResolutionAgenda(row: MeetingAgendaRow): boolean {
  if (isRemoveCouncilGovernanceAgenda(row)) return false;
  const meta = extractElectionAgendaMeta(row.description_zh ?? '').meta;
  if (meta?.agenda_type === 'council_election') return false;
  return row.requires_vote;
}

export function normalizeFormalResolutionState(raw: unknown): FormalResolutionState {
  if (raw === 'under_review' || raw === 'final') return raw;
  return 'draft';
}

export function formalResolutionStateLabel(state: FormalResolutionState, en: boolean): string {
  if (state === 'under_review') return en ? 'Under review' : '审议中';
  if (state === 'final') return en ? 'Final' : '定稿';
  return en ? 'Draft' : '草稿';
}

export function formalResolutionAuditEventLabel(kind: FormalResolutionAuditEventKind, en: boolean): string {
  const map: Record<FormalResolutionAuditEventKind, [string, string]> = {
    create: ['Created', '创建'],
    edit: ['Edited', '编辑'],
    delete: ['Deleted', '删除'],
    reorder: ['Reordered', '排序'],
    finalize: ['Finalized', '定稿'],
    state_change: ['State changed', '状态变更'],
  };
  const pair = map[kind];
  return en ? pair[0] : pair[1];
}

export function canEditFormalResolutionContent(state: FormalResolutionState): boolean {
  return state === 'draft' || state === 'under_review';
}

export function nextFormalResolutionStateTransition(
  current: FormalResolutionState,
  target: FormalResolutionState,
): FormalResolutionState | null {
  if (current === target) return target;
  if (current === 'draft' && target === 'under_review') return 'under_review';
  if (current === 'under_review' && target === 'draft') return 'draft';
  if (current === 'under_review' && target === 'final') return 'final';
  return null;
}
