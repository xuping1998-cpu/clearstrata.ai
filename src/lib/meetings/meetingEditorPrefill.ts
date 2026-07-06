import type { MeetingInitiationType } from '@/features/meetings/meetingFormatModel';
import type { MeetingType, VoteRule } from '@/features/meetings/api';

export type MeetingEditorPrefillAgendaRow = {
  title_zh: string;
  title_en: string;
  kind: 'resolution';
  vote_rule?: VoteRule;
  description_zh: string;
  description_en: string;
};

/** Navigate to `/meetings/new` with `location.state.meetingDraftPrefill`. */
export type MeetingEditorDraftPrefill = {
  source: 'procurement_sgm' | 'governance_resolution';
  meeting_type: MeetingType;
  initiation_type: MeetingInitiationType;
  title_en: string;
  title_zh: string;
  description_en: string;
  description_zh: string;
  procurement_job_id?: string;
  governance_matter_id?: string;
  community_resolution_id?: string;
  agenda_items?: MeetingEditorPrefillAgendaRow[];
};

export type MeetingEditorLocationState = {
  meetingDraftPrefill?: MeetingEditorDraftPrefill;
};

export function isMeetingEditorDraftPrefill(value: unknown): value is MeetingEditorDraftPrefill {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  const source = o.source;
  if (source !== 'procurement_sgm' && source !== 'governance_resolution') return false;
  return typeof o.title_en === 'string' && typeof o.title_zh === 'string';
}

export function mapPrefillAgendaRows(
  rows: MeetingEditorPrefillAgendaRow[] | undefined,
): {
  clientId: string;
  serverId: null;
  isNew: true;
  title_zh: string;
  title_en: string;
  kind: 'resolution';
  vote_rule: VoteRule;
  description_zh: string;
  description_en: string;
}[] {
  if (!rows?.length) return [];
  return rows.map((row) => ({
    clientId: `prefill_${crypto.randomUUID()}`,
    serverId: null,
    isNew: true,
    title_zh: row.title_zh,
    title_en: row.title_en,
    kind: 'resolution' as const,
    vote_rule: row.vote_rule ?? 'simple_majority',
    description_zh: row.description_zh,
    description_en: row.description_en,
  }));
}
