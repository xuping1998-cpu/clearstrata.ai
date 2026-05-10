import type { MeetingFormat, MeetingRow } from './api';
import { addDaysIso } from './ownerVotingCouncil';

export type MeetingFormatUi = 'in_person' | 'live_remote' | 'hybrid' | 'written_remote';

const META_START = '<!--clearstrata-written-remote\n';
const META_END = '\n-->';
/** Fallback: strip malformed or alternate whitespace variants of the written-remote marker. */
const WRITTEN_REMOTE_HTML_COMMENT_RE = /<!--\s*clearstrata-written-remote\b[\s\S]*?-->/gi;

const GOV_META_START = '<!--clearstrata-meeting-governance\n';
const GOV_META_END = '\n-->';
const GOVERNANCE_HTML_COMMENT_RE = /<!--\s*clearstrata-meeting-governance\b[\s\S]*?-->/gi;

export type WrittenRemoteMetaV1 = {
  v: 1;
  discussion_closes_at?: string;
  voting_open_at?: string;
  voting_close_at?: string;
};

export type MeetingInitiationType = 'council_initiated' | 'owner_requisitioned' | 'annual_required';

export type MeetingGovernanceMetaV1 = {
  v: 1;
  initiation_type: MeetingInitiationType;
  total_voting_units?: number;
  required_percent?: number;
  required_units?: number;
  signed_units?: number;
};

export const MEETING_SGM_REQUISITION_PERCENT_DEFAULT = 20;

/** Owners’ requisition to convene an SGM: required signed units (20% default). */
export function meetingSgmRequisitionRequiredUnits(
  totalVotingUnits: number,
  percent: number = MEETING_SGM_REQUISITION_PERCENT_DEFAULT,
): number {
  const n = Math.max(0, Math.floor(totalVotingUnits));
  if (n <= 0) return 0;
  return Math.ceil((n * percent) / 100);
}

function isValidInitiationType(x: unknown): x is MeetingInitiationType {
  return x === 'council_initiated' || x === 'owner_requisitioned' || x === 'annual_required';
}

/**
 * Removes embedded meeting-internal HTML comment blocks from `description_zh` for display only
 * (written-remote scheduling + meeting-governance / SGM requisition).
 */
export function stripWrittenRemoteMeta(text?: string | null): string {
  let s = text ?? '';
  s = s.replace(WRITTEN_REMOTE_HTML_COMMENT_RE, '');
  s = s.replace(GOVERNANCE_HTML_COMMENT_RE, '');
  s = extractGovernanceMeta(s).cleanDescriptionZh;
  s = extractWrittenRemoteMeta(s).cleanDescriptionZh;
  return s.replace(/\s+$/u, '').trim();
}

export function extractGovernanceMeta(descriptionZh: string | null | undefined): {
  cleanDescriptionZh: string;
  meta: MeetingGovernanceMetaV1 | null;
} {
  const s = descriptionZh ?? '';
  const i = s.lastIndexOf(GOV_META_START);
  if (i < 0) return { cleanDescriptionZh: s, meta: null };
  const end = s.indexOf(GOV_META_END, i + GOV_META_START.length);
  if (end < 0) return { cleanDescriptionZh: s, meta: null };
  const raw = s.slice(i + GOV_META_START.length, end).trim();
  let meta: MeetingGovernanceMetaV1 | null = null;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (o && o.v === 1 && isValidInitiationType(o.initiation_type)) {
      meta = {
        v: 1,
        initiation_type: o.initiation_type,
      };
      const tu = o.total_voting_units;
      const su = o.signed_units;
      const rp = o.required_percent;
      const ru = o.required_units;
      if (typeof tu === 'number' && Number.isFinite(tu)) meta.total_voting_units = Math.floor(tu);
      if (typeof su === 'number' && Number.isFinite(su)) meta.signed_units = Math.floor(su);
      if (typeof rp === 'number' && Number.isFinite(rp)) meta.required_percent = rp;
      if (typeof ru === 'number' && Number.isFinite(ru)) meta.required_units = Math.floor(ru);
    }
  } catch {
    /* ignore */
  }
  const clean = `${s.slice(0, i)}${s.slice(end + GOV_META_END.length)}`.replace(/\s+$/u, '');
  return { cleanDescriptionZh: clean, meta };
}

export function embedGovernanceMeta(base: string | null | undefined, payload: MeetingGovernanceMetaV1): string {
  const without = extractGovernanceMeta(base ?? '').cleanDescriptionZh.replace(/\s+$/u, '');
  const block = `${GOV_META_START}${JSON.stringify(payload)}${GOV_META_END}`;
  return without ? `${without}\n\n${block}` : block;
}

/** Parse `description_zh` into user-visible text plus embedded metas (governance outermost when both present). */
export function peelMeetingDescriptionZhForEditor(full: string | null | undefined): {
  userText: string;
  writtenRemoteMeta: WrittenRemoteMetaV1 | null;
  governanceMeta: MeetingGovernanceMetaV1 | null;
} {
  const gov = extractGovernanceMeta(full);
  const wr = extractWrittenRemoteMeta(gov.cleanDescriptionZh);
  return {
    userText: wr.cleanDescriptionZh,
    writtenRemoteMeta: wr.meta,
    governanceMeta: gov.meta,
  };
}

export function extractWrittenRemoteMeta(descriptionZh: string | null | undefined): {
  cleanDescriptionZh: string;
  meta: WrittenRemoteMetaV1 | null;
} {
  const s = descriptionZh ?? '';
  const i = s.lastIndexOf(META_START);
  if (i < 0) return { cleanDescriptionZh: s, meta: null };
  const end = s.indexOf(META_END, i + META_START.length);
  if (end < 0) return { cleanDescriptionZh: s, meta: null };
  const raw = s.slice(i + META_START.length, end).trim();
  let meta: WrittenRemoteMetaV1 | null = null;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (o && o.v === 1) {
      const dc = typeof o.discussion_closes_at === 'string' ? o.discussion_closes_at.trim() : '';
      const vo = typeof o.voting_open_at === 'string' ? o.voting_open_at.trim() : '';
      const vc = typeof o.voting_close_at === 'string' ? o.voting_close_at.trim() : '';
      if (dc || vo || vc) {
        meta = {
          v: 1,
          ...(dc ? { discussion_closes_at: dc } : {}),
          ...(vo ? { voting_open_at: vo } : {}),
          ...(vc ? { voting_close_at: vc } : {}),
        };
      }
    }
  } catch {
    /* ignore */
  }
  const clean = `${s.slice(0, i)}${s.slice(end + META_END.length)}`.replace(/\s+$/u, '');
  return { cleanDescriptionZh: clean, meta };
}

export function embedWrittenRemoteMeta(cleanDescriptionZh: string | null | undefined, discussionClosesIso: string): string {
  const base = (cleanDescriptionZh ?? '').replace(/\s+$/u, '');
  const payload: WrittenRemoteMetaV1 = { v: 1, discussion_closes_at: discussionClosesIso };
  const block = `${META_START}${JSON.stringify(payload)}${META_END}`;
  return base ? `${base}\n\n${block}` : block;
}

export function meetingFormatUiFromRow(m: Pick<MeetingRow, 'meeting_format' | 'description_zh'>): MeetingFormatUi {
  const fmt = m.meeting_format;
  if (fmt === 'in_person') return 'in_person';
  if (fmt === 'electronic') return 'live_remote';
  if (fmt === 'hybrid') {
    const { meta } = extractWrittenRemoteMeta(m.description_zh);
    if (meta) return 'written_remote';
    return 'hybrid';
  }
  return 'hybrid';
}

export function dbFormatFromUi(ui: MeetingFormatUi): MeetingFormat {
  if (ui === 'in_person') return 'in_person';
  if (ui === 'live_remote') return 'electronic';
  return 'hybrid';
}

export function isWrittenRemoteUi(ui: MeetingFormatUi): boolean {
  return ui === 'written_remote';
}

/** Discussion window for written-remote council meetings (Model Refactor). */
export function councilWrittenRemoteWindows(m: MeetingRow): {
  discussionOpens: string | null;
  discussionCloses: string | null;
} {
  const ui = meetingFormatUiFromRow(m);
  if (!isWrittenRemoteUi(ui)) {
    return { discussionOpens: null, discussionCloses: null };
  }
  const { meta } = extractWrittenRemoteMeta(m.description_zh);
  return {
    discussionOpens: m.scheduled_at?.trim() ? m.scheduled_at : null,
    discussionCloses: meta?.discussion_closes_at?.trim() ? meta.discussion_closes_at : null,
  };
}

/** Fallback voting window from `meetings` row when `owner_vote_meetings` is absent. */
export function councilMeetingVotingWindowFallback(m: MeetingRow): {
  votingOpens: string | null;
  votingCloses: string | null;
} {
  const vo = m.voting_open_at?.trim() ? m.voting_open_at : null;
  const vc = m.voting_close_at?.trim() ? m.voting_close_at : null;
  if (vo || vc) return { votingOpens: vo, votingCloses: vc };
  const { meta } = extractWrittenRemoteMeta(m.description_zh);
  const metaOpen = meta?.voting_open_at?.trim() ? meta.voting_open_at : null;
  const metaClose = meta?.voting_close_at?.trim() ? meta.voting_close_at : null;
  if (metaOpen || metaClose) return { votingOpens: metaOpen, votingCloses: metaClose };
  const w = councilWrittenRemoteWindows(m);
  if (w.discussionOpens || w.discussionCloses) {
    return {
      votingOpens: w.discussionOpens ?? w.discussionCloses,
      votingCloses: w.discussionCloses ?? w.discussionOpens,
    };
  }
  return { votingOpens: null, votingCloses: null };
}

/**
 * Insert-time voting window for `owner_vote_meetings` — never prefer “now” over scheduled council fields.
 * Open priority: `meetings.voting_open_at` → written-remote meta `voting_open_at` → meta `discussion_closes_at` → now.
 * Close priority: `meetings.voting_close_at` → meta `voting_close_at` → opens + 7 days.
 */
export function deriveOwnerVoteMeetingVotingTimes(m: MeetingRow): {
  voting_opens_at: string;
  voting_closes_at: string;
} {
  const rowOpen = m.voting_open_at?.trim() ?? '';
  const rowClose = m.voting_close_at?.trim() ?? '';
  const { meta } = extractWrittenRemoteMeta(m.description_zh);
  const metaOpen = meta?.voting_open_at?.trim() ?? '';
  const metaClose = meta?.voting_close_at?.trim() ?? '';
  const discClose = meta?.discussion_closes_at?.trim() ?? '';

  const voting_opens_at = rowOpen || metaOpen || discClose || new Date().toISOString();
  const voting_closes_at = rowClose || metaClose || addDaysIso(voting_opens_at, 7);

  return { voting_opens_at, voting_closes_at };
}
