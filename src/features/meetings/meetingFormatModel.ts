import type { MeetingFormat, MeetingRow } from './api';
import {
  deriveCouncilElectionCanonFromScheduledAt,
  deriveRemoteWrittenV3CanonFromScheduledAt,
  REMOTE_WRITTEN_V3_PARTICIPATION_DAYS,
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

/** Same optional fields as v1; stored as `v: 2` in some rows — treated like legacy written-remote, not v3. */
export type WrittenRemoteMetaV2 = {
  v: 2;
  public_notice_close_at?: string;
  discussion_closes_at?: string;
  voting_open_at?: string;
  voting_close_at?: string;
};

export type WrittenRemoteMode = 'remote_written' | 'written_remote';

/**
 * Remote written v3 marker + parallel phase windows (14 days from meeting start).
 * Gates may still use 7+7+7 from `scheduled_at` until a later rollout; this block is for explicit v3 detection.
 */
export type WrittenRemoteMetaV3 = {
  v: 3;
  mode: WrittenRemoteMode;
  participation_open_at: string;
  participation_close_at: string;
  public_notice_open_at: string;
  public_notice_close_at: string;
  nomination_open_at: string;
  nomination_close_at: string;
  voting_open_at: string;
  voting_close_at: string;
};

export type WrittenRemoteMeta = WrittenRemoteMetaV1 | WrittenRemoteMetaV2 | WrittenRemoteMetaV3;

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
  writtenRemoteMeta: WrittenRemoteMeta | null;
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

function parseWrittenRemoteLegacyMeta(o: Record<string, unknown>, v: 1 | 2): WrittenRemoteMetaV1 | WrittenRemoteMetaV2 | null {
  const pnc = typeof o.public_notice_close_at === 'string' ? o.public_notice_close_at.trim() : '';
  const dc = typeof o.discussion_closes_at === 'string' ? o.discussion_closes_at.trim() : '';
  const vo = typeof o.voting_open_at === 'string' ? o.voting_open_at.trim() : '';
  const vc = typeof o.voting_close_at === 'string' ? o.voting_close_at.trim() : '';
  const noticeClose = pnc || dc;
  if (!noticeClose && !vo && !vc) return null;
  const base = {
    ...(pnc ? { public_notice_close_at: pnc } : {}),
    ...(dc ? { discussion_closes_at: dc } : {}),
    ...(vo ? { voting_open_at: vo } : {}),
    ...(vc ? { voting_close_at: vc } : {}),
  };
  return v === 1 ? ({ v: 1, ...base } as WrittenRemoteMetaV1) : ({ v: 2, ...base } as WrittenRemoteMetaV2);
}

function parseWrittenRemoteV3Meta(o: Record<string, unknown>): WrittenRemoteMetaV3 | null {
  const str = (k: string): string | null => {
    const x = o[k];
    return typeof x === 'string' && x.trim() ? x.trim() : null;
  };
  const participation_open_at = str('participation_open_at');
  const participation_close_at = str('participation_close_at');
  const public_notice_open_at = str('public_notice_open_at');
  const public_notice_close_at = str('public_notice_close_at');
  const nomination_open_at = str('nomination_open_at');
  const nomination_close_at = str('nomination_close_at');
  const voting_open_at = str('voting_open_at');
  const voting_close_at = str('voting_close_at');
  const modeRaw = o.mode;
  const mode: WrittenRemoteMode | null =
    modeRaw === 'remote_written' || modeRaw === 'written_remote' ? modeRaw : null;
  const vNum = o.v === 3 || o.version === 3 ? 3 : null;
  if (vNum !== 3 || !mode) return null;
  if (
    !participation_open_at ||
    !participation_close_at ||
    !public_notice_open_at ||
    !public_notice_close_at ||
    !nomination_open_at ||
    !nomination_close_at ||
    !voting_open_at ||
    !voting_close_at
  ) {
    return null;
  }
  return {
    v: 3,
    mode,
    participation_open_at,
    participation_close_at,
    public_notice_open_at,
    public_notice_close_at,
    nomination_open_at,
    nomination_close_at,
    voting_open_at,
    voting_close_at,
  };
}

/** True when `meta` is the explicit remote-written v3 payload (by version + mode), regardless of `meeting_format`. */
export function isWrittenRemoteV3Meta(meta: unknown): boolean {
  if (!meta || typeof meta !== 'object') return false;
  const m = meta as Record<string, unknown>;
  const verOk = m.v === 3 || m.version === 3;
  if (!verOk) return false;
  const mode = m.mode;
  if (mode !== 'remote_written' && mode !== 'written_remote') return false;
  return true;
}

/** True when `description_zh` embeds a v3 written-remote HTML comment meta. */
export function isWrittenRemoteV3Meeting(meeting: Pick<MeetingRow, 'description_zh'>): boolean {
  const { meta } = extractWrittenRemoteMeta(meeting.description_zh);
  return isWrittenRemoteV3Meta(meta);
}

/** Read-only copy: V3 participation is system-scheduled (no manual enable/freeze/open/close). */
export function writtenRemoteV3AutoParticipationCopy(languageEn: boolean): string {
  return languageEn
    ? 'Participation opens and closes automatically on the system schedule. Manual enable, pause, or early open are not available.'
    : '参与由系统自动开放、系统自动截止；不可人工启用、暂停或提前开启。';
}

/** Read-only copy: resolution agendas on V3 meetings (no “generate formal ballot” control). */
export function writtenRemoteV3ResolutionVotingCopy(languageEn: boolean): string {
  return languageEn
    ? 'Voting will be available automatically during the unified participation window.'
    : '表决将在统一参与期内自动开放。';
}

export function extractWrittenRemoteMeta(descriptionZh: string | null | undefined): {
  cleanDescriptionZh: string;
  meta: WrittenRemoteMeta | null;
} {
  const s = descriptionZh ?? '';
  const i = s.lastIndexOf(META_START);
  if (i < 0) return { cleanDescriptionZh: s, meta: null };
  const end = s.indexOf(META_END, i + META_START.length);
  if (end < 0) return { cleanDescriptionZh: s, meta: null };
  const raw = s.slice(i + META_START.length, end).trim();
  let meta: WrittenRemoteMeta | null = null;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (o) {
      const v3 = parseWrittenRemoteV3Meta(o);
      if (v3) {
        meta = v3;
      } else if (o.v === 1) {
        meta = parseWrittenRemoteLegacyMeta(o, 1);
      } else if (o.v === 2) {
        meta = parseWrittenRemoteLegacyMeta(o, 2);
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

/** New remote-written meetings: embed v3 marker + 14-day parallel phase timestamps from meeting start (`scheduled_at` ISO). */
export function embedWrittenRemoteV3MetaFromMeetingStart(
  cleanDescriptionZh: string | null | undefined,
  scheduledIso: string,
): string | null {
  const t = scheduledIso?.trim();
  if (!t) return null;
  const close = addDaysIso(t, REMOTE_WRITTEN_V3_PARTICIPATION_DAYS);
  const payload: WrittenRemoteMetaV3 = {
    v: 3,
    mode: 'remote_written',
    participation_open_at: t,
    participation_close_at: close,
    public_notice_open_at: t,
    public_notice_close_at: close,
    nomination_open_at: t,
    nomination_close_at: close,
    voting_open_at: t,
    voting_close_at: close,
  };
  const base = (cleanDescriptionZh ?? '').replace(/\s+$/u, '');
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
  /** Populated for remote-written v3 only; parallel 14-day participation window. */
  nominationOpens: string | null;
  nominationCloses: string | null;
  votingOpens: string | null;
  votingCloses: string | null;
} {
  const ui = meetingFormatUiFromRow(m);
  const empty = (): ReturnType<typeof councilWrittenRemoteWindows> => ({
    publicNoticeOpens: null,
    publicNoticeCloses: null,
    discussionOpens: null,
    discussionCloses: null,
    nominationOpens: null,
    nominationCloses: null,
    votingOpens: null,
    votingCloses: null,
  });
  if (!isWrittenRemoteUi(ui)) return empty();

  if (isWrittenRemoteV3Meeting(m)) {
    const v3 = deriveRemoteWrittenV3CanonFromScheduledAt(m.scheduled_at);
    if (v3) {
      const o = v3.publicNoticeOpenIso;
      const c = v3.publicNoticeCloseIso;
      return {
        publicNoticeOpens: o,
        publicNoticeCloses: c,
        discussionOpens: o,
        discussionCloses: c,
        nominationOpens: v3.nominationOpenIso,
        nominationCloses: v3.nominationCloseIso,
        votingOpens: v3.votingOpenIso,
        votingCloses: v3.votingCloseIso,
      };
    }
  }

  const canon = deriveCouncilElectionCanonFromScheduledAt(m.scheduled_at);
  if (canon) {
    const o = canon.publicNoticeOpenIso;
    const c = canon.publicNoticeCloseIso;
    return {
      publicNoticeOpens: o,
      publicNoticeCloses: c,
      discussionOpens: o,
      discussionCloses: c,
      nominationOpens: null,
      nominationCloses: null,
      votingOpens: null,
      votingCloses: null,
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
    nominationOpens: null,
    nominationCloses: null,
    votingOpens: null,
    votingCloses: null,
  };
}

/** Fallback voting window from `meetings` row when `owner_vote_meetings` is absent. */
export function councilMeetingVotingWindowFallback(m: MeetingRow): {
  votingOpens: string | null;
  votingCloses: string | null;
} {
  const ui = meetingFormatUiFromRow(m);
  if (isWrittenRemoteUi(ui)) {
    if (isWrittenRemoteV3Meeting(m)) {
      const v3 = deriveRemoteWrittenV3CanonFromScheduledAt(m.scheduled_at);
      if (v3) {
        return {
          votingOpens: v3.votingOpenIso,
          votingCloses: v3.votingCloseIso,
        };
      }
    }
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
    if (isWrittenRemoteV3Meeting(m)) {
      const v3 = deriveRemoteWrittenV3CanonFromScheduledAt(m.scheduled_at);
      if (v3) {
        return {
          voting_opens_at: v3.votingOpenIso,
          voting_closes_at: v3.votingCloseIso,
        };
      }
    }
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
  if (isWrittenRemoteV3Meeting(m as Pick<MeetingRow, 'description_zh'>)) {
    const v3 = deriveRemoteWrittenV3CanonFromScheduledAt(m.scheduled_at ?? null);
    if (!v3) return { canon: null, votingOpenIso: null, votingCloseIso: null };
    return { canon: v3, votingOpenIso: v3.votingOpenIso, votingCloseIso: v3.votingCloseIso };
  }
  const canon = deriveCouncilElectionCanonFromScheduledAt(m.scheduled_at ?? null);
  if (!canon) return { canon: null, votingOpenIso: null, votingCloseIso: null };
  return { canon, votingOpenIso: canon.votingOpenIso, votingCloseIso: canon.votingCloseIso };
}
