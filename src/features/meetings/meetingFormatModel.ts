import type { MeetingFormat, MeetingRow } from './api';
import {
  deriveCouncilElectionCanonFromScheduledAt,
  type DerivedCouncilElectionCanon,
} from './electionTimelineMath';
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
  /** New name; election public notice closes T0+7d. */
  public_notice_close_at?: string;
  /** Legacy key — treated as `public_notice_close_at` when present. */
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
      const pnc =
        typeof o.public_notice_close_at === 'string' ? o.public_notice_close_at.trim() : '';
      const dc = typeof o.discussion_closes_at === 'string' ? o.discussion_closes_at.trim() : '';
      const vo = typeof o.voting_open_at === 'string' ? o.voting_open_at.trim() : '';
      const vc = typeof o.voting_close_at === 'string' ? o.voting_close_at.trim() : '';
      const noticeClose = pnc || dc;
      if (noticeClose || vo || vc) {
        meta = {
          v: 1,
          ...(pnc ? { public_notice_close_at: pnc } : {}),
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

/** Auto triple-phase embed from meeting start (`scheduled_at` ISO). Prefer over manual fields. */
export function embedWrittenRemoteCanonFromMeetingStart(
  cleanDescriptionZh: string | null | undefined,
  scheduledIso: string,
): string | null {
  const canon = deriveCouncilElectionCanonFromScheduledAt(scheduledIso);
  if (!canon) return null;
  const base = (cleanDescriptionZh ?? '').replace(/\s+$/u, '');
  const payload: WrittenRemoteMetaV1 = {
    v: 1,
    public_notice_close_at: canon.publicNoticeCloseIso,
    voting_open_at: canon.votingOpenIso,
    voting_close_at: canon.votingCloseIso,
  };
  const block = `${META_START}${JSON.stringify(payload)}${META_END}`;
  return base ? `${base}\n\n${block}` : block;
}

/** @deprecated Prefer `embedWrittenRemoteCanonFromMeetingStart` — kept for tooling/tests. */
export function embedWrittenRemoteMeta(cleanDescriptionZh: string | null | undefined, discussionClosesIso: string): string {
  const base = (cleanDescriptionZh ?? '').replace(/\s+$/u, '');
  const payload: WrittenRemoteMetaV1 = { v: 1, public_notice_close_at: discussionClosesIso };
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

/** Public-notice window for written-remote meetings (election semantics: equals first 7 days from scheduled start). */
export function councilWrittenRemoteWindows(m: MeetingRow): {
  publicNoticeOpens: string | null;
  publicNoticeCloses: string | null;
  /** @deprecated Alias of `publicNoticeOpens` — “discussion period” wording removed from product. */
  discussionOpens: string | null;
  /** @deprecated Alias of `publicNoticeCloses`. */
  discussionCloses: string | null;
} {
  const ui = meetingFormatUiFromRow(m);
  const empty = (): ReturnType<typeof councilWrittenRemoteWindows> => ({
    publicNoticeOpens: null,
    publicNoticeCloses: null,
    discussionOpens: null,
    discussionCloses: null,
  });
  if (!isWrittenRemoteUi(ui)) return empty();

  const canon = deriveCouncilElectionCanonFromScheduledAt(m.scheduled_at);
  if (canon) {
    const o = canon.publicNoticeOpenIso;
    const c = canon.publicNoticeCloseIso;
    return {
      publicNoticeOpens: o,
      publicNoticeCloses: c,
      discussionOpens: o,
      discussionCloses: c,
    };
  }
  const { meta } = extractWrittenRemoteMeta(m.description_zh);
  const open = m.scheduled_at?.trim() ? m.scheduled_at : null;
  const pnc = meta?.public_notice_close_at?.trim();
  const dc = meta?.discussion_closes_at?.trim();
  const closeRaw = (pnc || dc || null)?.trim() || null;
  return {
    publicNoticeOpens: open,
    publicNoticeCloses: closeRaw,
    discussionOpens: open,
    discussionCloses: closeRaw,
  };
}

/** Fallback voting window from `meetings` row when `owner_vote_meetings` is absent. */
export function councilMeetingVotingWindowFallback(m: MeetingRow): {
  votingOpens: string | null;
  votingCloses: string | null;
} {
  const ui = meetingFormatUiFromRow(m);
  if (isWrittenRemoteUi(ui)) {
    const canon = deriveCouncilElectionCanonFromScheduledAt(m.scheduled_at);
    if (canon) {
      return {
        votingOpens: canon.votingOpenIso,
        votingCloses: canon.votingCloseIso,
      };
    }
  }
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
 * Insert-time voting window for `owner_vote_meetings`.
 * Written-remote: fixed third phase `[T0+14d, T0+21d)` from `meetings.scheduled_at` when parseable.
 * Otherwise falls back to row/meta fields.
 */
export function deriveOwnerVoteMeetingVotingTimes(m: MeetingRow): {
  voting_opens_at: string;
  voting_closes_at: string;
} {
  const ui = meetingFormatUiFromRow(m);
  if (isWrittenRemoteUi(ui)) {
    const canon = deriveCouncilElectionCanonFromScheduledAt(m.scheduled_at);
    if (canon) {
      return {
        voting_opens_at: canon.votingOpenIso,
        voting_closes_at: canon.votingCloseIso,
      };
    }
  }
  const rowOpen = m.voting_open_at?.trim() ?? '';
  const rowClose = m.voting_close_at?.trim() ?? '';
  const { meta } = extractWrittenRemoteMeta(m.description_zh);
  const metaOpen = meta?.voting_open_at?.trim() ?? '';
  const metaClose = meta?.voting_close_at?.trim() ?? '';
  const discClose = meta?.discussion_closes_at?.trim() ?? meta?.public_notice_close_at?.trim() ?? '';

  const voting_opens_at = rowOpen || metaOpen || discClose || new Date().toISOString();
  const voting_closes_at = rowClose || metaClose || addDaysIso(voting_opens_at, 7);

  return { voting_opens_at, voting_closes_at };
}

/** Persisted triple-phase timestamps for council `meetings` (written-remote from meeting start). */
export function persistedCouncilCanonVotingSlice(m: Partial<MeetingRow>): {
  canon: DerivedCouncilElectionCanon | null;
  votingOpenIso: string | null;
  votingCloseIso: string | null;
} {
  const canon = deriveCouncilElectionCanonFromScheduledAt(m.scheduled_at ?? null);
  if (!canon) return { canon: null, votingOpenIso: null, votingCloseIso: null };
  return { canon, votingOpenIso: canon.votingOpenIso, votingCloseIso: canon.votingCloseIso };
}
