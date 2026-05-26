/** Hidden HTML comment blob in `meeting_agenda_items.description_zh`. Must match Postgres `try_extract_election_agenda_meta`. */

import { meetingTitleZhFirst, type MeetingRow, type OwnerVoteMeetingLite } from './api';
import { MEETING_VOTE_ARCHIVE_FORMAL_NOTICE } from '@/components/meetings/meetingVoteArchiveConstants';
import { labelMeetingFormatUiDisplay, labelMeetingType, meetingUiStrings } from './labels';
import {
  councilMeetingVotingWindowFallback,
  councilWrittenRemoteWindows,
  extractGovernanceMeta,
  extractWrittenRemoteMeta,
  isWrittenRemoteUi,
  isWrittenRemoteV3Meeting,
  meetingFormatUiFromRow,
  MEETING_SGM_REQUISITION_PERCENT_DEFAULT,
  meetingSgmRequisitionRequiredUnits,
  stripWrittenRemoteMeta,
  type MeetingGovernanceMetaV1,
} from './meetingFormatModel';
import {
  councilElectionLifecyclePhase,
  deriveAgmSgmCanonDisplayWindows,
  deriveCouncilElectionCanonFromScheduledAt,
  deriveRemoteWrittenV3CanonFromScheduledAt,
  electionTimestampsCanonEqual,
} from './electionTimelineMath';

export const ELECTION_AGENDA_MARKER = '<!--clearstrata-election-agenda';

/** Stored + derived; coerce accepts legacy string values without throwing. */
export type ElectionNominationStatus = 'open' | 'closed';

export type ElectionCandidateDraft = {
  id: string;
  name: string;
  unit_no: string | null | undefined;
  statement: string | null | undefined;
  nominated_by: string | null | undefined;
  nominated_by_user_id?: string | null;
  nominated_by_unit?: string | null;
  nomination_source?: string | null;
  reviewed_by_user_id?: string | null;
  reviewed_at?: string | null;
  accepted: boolean;
  created_at: string | null | undefined;
};

export type ElectionAgendaMetaV1 = {
  v: 1;
  agenda_type: 'council_election';
  seats: number;
  allow_self_nomination: boolean;
  max_choices_per_unit: number;
  nomination_status: ElectionNominationStatus;
  /** ISO 8601; optional for legacy agendas without a nominal window */
  nomination_opens_at?: string;
  nomination_closes_at?: string;
  title_zh?: string;
  title_en?: string;
  depends_on_resolution_kind?: string;
  candidates: ElectionCandidateDraft[];
};

export type ResolutionKind = 'remove_council';

export type ResolutionAgendaMetaV1 = {
  v: 1;
  agenda_type: 'resolution';
  resolution_kind: ResolutionKind;
  title_zh?: string;
  title_en?: string;
  requires_pass_before_election?: boolean;
};

export const RESOLUTION_AGENDA_MARKER = '<!--clearstrata-resolution-agenda';

export type ElectionNominationPhase = 'before_open' | 'collecting' | 'ended' | 'legacy_no_deadline';

/** Canonical nomination UX phase (election agenda + council meeting timeline). */
export type ElectionNominationUiStatus =
  | 'before_open'
  | 'open'
  | 'closed'
  | 'invalid'
  | 'legacy_no_deadline';

/** Fields required to validate/auto-derive council election triple-phase from `meetings.scheduled_at`. */
export type CouncilElectionCanonMeetingInput = Pick<
  MeetingRow,
  'meeting_type' | 'scheduled_at' | 'voting_open_at' | 'voting_close_at' | 'description_zh' | 'meeting_format'
>;

export type ElectionNominationRibbonModel = {
  hasElection: true;
  /** True only while collecting nominations (`open`), not during `before_open`. */
  anyNominationOpen: boolean;
  /** Merged UX status across agendas (see mergeElectionNominationUiStatuses). */
  nominationUiStatus: ElectionNominationUiStatus;
  nominationOpensIso: string | null;
  nominationClosesIso: string | null;
  totalCandidates: number;
};

/** Display-only: strict `meeting_type` only (title/category heuristics excluded). */
export function isStrictAgmOrSgmMeeting(meeting: Pick<MeetingRow, 'meeting_type'>): boolean {
  const mt = String(meeting.meeting_type ?? '').trim().toLowerCase();
  return mt === 'agm' || mt === 'sgm';
}

export function agmSgmScheduledNotSetLabel(languageEn: boolean): string {
  return languageEn ? 'Not set' : '暂未设置';
}

/** Display-only: strict AGM/SGM nomination window from canon (ignores lagging agenda JSON timestamps). */
export function councilAgmSgmNominationWindowDisplayIso(
  meeting: Pick<MeetingRow, 'meeting_type' | 'scheduled_at'> | null | undefined,
): { openIso: string | null; closeIso: string | null } | null {
  if (!meeting || !isStrictAgmOrSgmMeeting(meeting)) return null;
  const canon = deriveCouncilElectionCanonFromScheduledAt(meeting.scheduled_at);
  if (!canon) return { openIso: null, closeIso: null };
  return { openIso: canon.nominationOpenIso, closeIso: canon.nominationCloseIso };
}

export function parseIsoFlexible(s?: string | null): Date | null {
  const t = s?.trim();
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

export type ElectionCouncilTimelineContext = {
  /** `meetings.scheduled_at` (= public notice opens). */
  publicNoticeOpensIso: string | null;
  publicNoticeClosesIso: string | null;
  votingOpensIso: string | null;
  votingClosesIso: string | null;
};

/** Storage for council-election agendas must match auto 7–7–7 phases from scheduled start (written-remote meta + row votes + agenda nomin dates). Remote-written v3 uses a single 14-day participation window. */
export function councilElectionStoredMatchesCanon(
  meeting: CouncilElectionCanonMeetingInput,
  meta: ElectionAgendaMetaV1,
): boolean {
  if (isWrittenRemoteV3Meeting(meeting)) {
    const v3 = deriveRemoteWrittenV3CanonFromScheduledAt(meeting.scheduled_at);
    if (!v3) return false;

    if (!electionTimestampsCanonEqual(meta.nomination_opens_at, v3.nominationOpenIso)) return false;
    if (!electionTimestampsCanonEqual(meta.nomination_closes_at, v3.nominationCloseIso)) return false;

    if (!electionTimestampsCanonEqual(meeting.voting_open_at, v3.votingOpenIso)) return false;
    if (!electionTimestampsCanonEqual(meeting.voting_close_at, v3.votingCloseIso)) return false;

    const { meta: wr } = extractWrittenRemoteMeta(meeting.description_zh);
    if (!wr || wr.v !== 3) return false;

    return (
      electionTimestampsCanonEqual(wr.participation_open_at, v3.publicNoticeOpenIso) &&
      electionTimestampsCanonEqual(wr.participation_close_at, v3.publicNoticeCloseIso) &&
      electionTimestampsCanonEqual(wr.public_notice_open_at, v3.publicNoticeOpenIso) &&
      electionTimestampsCanonEqual(wr.public_notice_close_at, v3.publicNoticeCloseIso) &&
      electionTimestampsCanonEqual(wr.nomination_open_at, v3.nominationOpenIso) &&
      electionTimestampsCanonEqual(
        wr.nomination_close_at ??
          (wr as { nomination_closes_at?: string }).nomination_closes_at,
        v3.nominationCloseIso,
      ) &&
      electionTimestampsCanonEqual(wr.voting_open_at, v3.votingOpenIso) &&
      electionTimestampsCanonEqual(wr.voting_close_at, v3.votingCloseIso)
    );
  }

  const canon = deriveCouncilElectionCanonFromScheduledAt(meeting.scheduled_at);
  if (!canon) return false;

  if (!electionTimestampsCanonEqual(meta.nomination_opens_at, canon.nominationOpenIso)) return false;
  if (!electionTimestampsCanonEqual(meta.nomination_closes_at, canon.nominationCloseIso)) return false;

  if (!electionTimestampsCanonEqual(meeting.voting_open_at, canon.votingOpenIso)) return false;
  if (!electionTimestampsCanonEqual(meeting.voting_close_at, canon.votingCloseIso)) return false;

  const ui = meetingFormatUiFromRow(meeting);
  if (!isWrittenRemoteUi(ui)) {
    /** In-person AGMs/SGMs still carry nomin + row dates only; hybrid written-remote markers optional. */
    return true;
  }

  const { meta: wr } = extractWrittenRemoteMeta(meeting.description_zh);
  const noticeCloseStored =
    wr?.public_notice_close_at?.trim() || wr?.discussion_closes_at?.trim() || '';

  /** Written-remote expects embedded notice close (= end of publicity window). */
  if (!electionTimestampsCanonEqual(noticeCloseStored, canon.publicNoticeCloseIso)) return false;

  const mvo = wr?.voting_open_at?.trim();
  const mvc = wr?.voting_close_at?.trim();
  if (mvo && !electionTimestampsCanonEqual(mvo, canon.votingOpenIso)) return false;
  if (mvc && !electionTimestampsCanonEqual(mvc, canon.votingCloseIso)) return false;

  return true;
}

export function buildElectionCouncilTimelineContext(meeting: MeetingRow): ElectionCouncilTimelineContext {
  const wr = councilWrittenRemoteWindows(meeting);
  const vw = councilMeetingVotingWindowFallback(meeting);
  return {
    publicNoticeOpensIso: wr.publicNoticeOpens?.trim() ? wr.publicNoticeOpens : null,
    publicNoticeClosesIso: wr.publicNoticeCloses?.trim() ? wr.publicNoticeCloses : null,
    votingOpensIso: vw.votingOpens?.trim() ? vw.votingOpens : null,
    votingClosesIso: vw.votingCloses?.trim() ? vw.votingCloses : null,
  };
}

export type ElectionTimelineAnalysis = {
  invalid_election_timeline: boolean;
  /** Specifically `voting_open_at <= nomination_close_at`. */
  votingOpenVsNominationCloseBroken: boolean;
};

function msIsoUtc(iso?: string | null): number | null {
  const d = parseIsoFlexible(iso);
  return d === null ? null : d.getTime();
}

/** Validates election storage vs auto 7+7+7 timeline from scheduled start plus internal ordering rules. Remote-written v3 uses 14-day parallel-window checks only. */
export function analyzeCouncilElectionTimeline(
  meta: ElectionAgendaMetaV1 | null | undefined,
  meeting: CouncilElectionCanonMeetingInput,
): ElectionTimelineAnalysis {
  if (!meta || meta.agenda_type !== 'council_election') {
    return { invalid_election_timeline: false, votingOpenVsNominationCloseBroken: false };
  }

  if (isWrittenRemoteV3Meeting(meeting)) {
    const ok = councilElectionStoredMatchesCanon(meeting, meta);
    return { invalid_election_timeline: !ok, votingOpenVsNominationCloseBroken: !ok };
  }

  const canon = deriveCouncilElectionCanonFromScheduledAt(meeting.scheduled_at);
  /**
   * Strict AGM/SGM: phase + UI follow `scheduled_at` canon only. Agenda JSON / row voting timestamps may
   * lag re-saves; do not surface `invalid` for storage drift vs canon.
   */
  if (isStrictAgmOrSgmMeeting(meeting)) {
    return { invalid_election_timeline: false, votingOpenVsNominationCloseBroken: false };
  }

  if (!canon || !councilElectionStoredMatchesCanon(meeting, meta)) {
    return { invalid_election_timeline: true, votingOpenVsNominationCloseBroken: true };
  }

  return { invalid_election_timeline: false, votingOpenVsNominationCloseBroken: false };
}

export function electionNominationPhase(now: Date, m: ElectionAgendaMetaV1): ElectionNominationPhase {
  const s = getElectionNominationStatus(now, m, undefined);
  if (s === 'legacy_no_deadline') return 'legacy_no_deadline';
  if (s === 'before_open') return 'before_open';
  if (s === 'closed') return 'ended';
  if (s === 'open') return 'collecting';
  /** `invalid`: treat like pre-formal nomination (mirror prior blocking behaviour). */
  return 'collecting';
}

/**
 * Canonical nomination UX state for UI + ribbons.
 * Pass `meeting` for `council_election` agendas so phases follow auto 7+7+7 from `meetings.scheduled_at`.
 */
export function getElectionNominationStatus(
  now: Date,
  meta: ElectionAgendaMetaV1,
  meeting?: CouncilElectionCanonMeetingInput | null,
): ElectionNominationUiStatus {
  if (meeting != null && meta.agenda_type === 'council_election') {
    if (isWrittenRemoteV3Meeting(meeting)) {
      const a = analyzeCouncilElectionTimeline(meta, meeting);
      if (a.invalid_election_timeline || a.votingOpenVsNominationCloseBroken) {
        return 'invalid';
      }

      const v3c = deriveRemoteWrittenV3CanonFromScheduledAt(meeting.scheduled_at);
      if (!v3c) {
        return 'invalid';
      }

      const n = now.getTime();
      const openMs = msIsoUtc(v3c.publicNoticeOpenIso);
      const closeMs = msIsoUtc(v3c.publicNoticeCloseIso);
      if (openMs === null || closeMs === null) return 'invalid';
      if (n < openMs) return 'before_open';
      if (n >= closeMs) return 'closed';
      return 'open';
    }

    const a = analyzeCouncilElectionTimeline(meta, meeting);
    if (a.invalid_election_timeline || a.votingOpenVsNominationCloseBroken) {
      return 'invalid';
    }

    const canon = deriveCouncilElectionCanonFromScheduledAt(meeting.scheduled_at);
    if (!canon) {
      return isStrictAgmOrSgmMeeting(meeting) ? 'before_open' : 'invalid';
    }

    const n = now.getTime();
    const nomOpenMs = msIsoUtc(canon.nominationOpenIso);
    const nomCloseMs = msIsoUtc(canon.nominationCloseIso);
    if (nomOpenMs === null || nomCloseMs === null) return 'invalid';
    if (n < nomOpenMs) return 'before_open';
    if (n >= nomCloseMs) return 'closed';
    return 'open';
  }

  const closesAt = parseIsoFlexible(meta.nomination_closes_at);
  if (!closesAt) return 'legacy_no_deadline';

  const opensAt = parseIsoFlexible(meta.nomination_opens_at);
  const n = now.getTime();

  if (opensAt !== null && n < opensAt.getTime()) return 'before_open';
  if (n >= closesAt.getTime()) return 'closed';
  return 'open';
}

export function mergeElectionNominationUiStatuses(statuses: ElectionNominationUiStatus[]): ElectionNominationUiStatus {
  if (statuses.length === 0) return 'legacy_no_deadline';
  if (statuses.some((s) => s === 'invalid')) return 'invalid';
  if (statuses.some((s) => s === 'before_open')) return 'before_open';
  if (statuses.some((s) => s === 'open')) return 'open';
  if (statuses.some((s) => s === 'legacy_no_deadline')) return 'legacy_no_deadline';
  return 'closed';
}

/** Localized line for ribbons / headings (legacy uses inline fallbacks — no single i18n key). */
export function formatElectionNominationUiStatus(
  status: ElectionNominationUiStatus,
  opts: { t: (key: string) => string; languageEn: boolean },
): string {
  const { t, languageEn } = opts;
  switch (status) {
    case 'invalid':
      return t('meeting_election_time_overlap_admin_warn');
    case 'before_open':
      return t('meeting_election_nomination_not_open_owner');
    case 'open':
      return t('meeting_election_nomination_open');
    case 'closed':
      return t('meeting_election_nomination_ended_label');
    case 'legacy_no_deadline':
      return languageEn ? 'No nomination deadline (legacy agenda).' : '未设置提名截止日（兼容旧议程）';
    default:
      return '—';
  }
}

/** Formal ranked-choice ballots: only within the canon voting phase `[nomination_close, +7d)`. */
export function isFormalElectionVotingAllowed(
  now: Date,
  m: ElectionAgendaMetaV1,
  meeting?: CouncilElectionCanonMeetingInput | null,
): boolean {
  if (m.agenda_type === 'council_election' && meeting) {
    if (isWrittenRemoteV3Meeting(meeting)) {
      if (analyzeCouncilElectionTimeline(m, meeting).invalid_election_timeline) return false;
      const v3c = deriveRemoteWrittenV3CanonFromScheduledAt(meeting.scheduled_at);
      if (!v3c) return false;
      const n = now.getTime();
      const openMs = msIsoUtc(v3c.votingOpenIso);
      const closeMs = msIsoUtc(v3c.votingCloseIso);
      if (openMs === null || closeMs === null) return false;
      return n >= openMs && n < closeMs;
    }

    if (analyzeCouncilElectionTimeline(m, meeting).invalid_election_timeline) return false;
    const canon = deriveCouncilElectionCanonFromScheduledAt(meeting.scheduled_at);
    if (!canon) return false;
    return councilElectionLifecyclePhase(now, canon) === 'voting';
  }
  const s = getElectionNominationStatus(now, m, undefined);
  return s === 'closed' || s === 'legacy_no_deadline';
}

/** Owner yes/no/abstain on embedded remove_council resolution; mirrors `submit_owner_vote` V3 / legacy windows. */
export function isRemoveCouncilResolutionVotingAllowed(
  now: Date,
  councilMeeting: Pick<MeetingRow, 'scheduled_at' | 'status' | 'description_zh' | 'meeting_format'>,
  ownerVoteMeeting?: {
    status?: string | null;
    voting_opens_at?: string | null;
    voting_closes_at?: string | null;
  } | null,
): boolean {
  const cmStatus = String(councilMeeting.status ?? '').trim().toLowerCase();
  if (cmStatus === 'closed' || cmStatus === 'ended' || cmStatus === 'archived') return false;

  if (isWrittenRemoteV3Meeting(councilMeeting)) {
    const v3c = deriveRemoteWrittenV3CanonFromScheduledAt(councilMeeting.scheduled_at);
    if (!v3c) return false;
    const n = now.getTime();
    const openMs = msIsoUtc(v3c.votingOpenIso);
    const closeMs = msIsoUtc(v3c.votingCloseIso);
    if (openMs === null || closeMs === null) return false;
    return n >= openMs && n < closeMs;
  }

  if (cmStatus === 'draft') return false;

  const ovSt = String(ownerVoteMeeting?.status ?? '').trim().toLowerCase();
  if (ovSt !== 'open') return false;

  const n = now.getTime();
  const vo = parseIsoFlexible(ownerVoteMeeting?.voting_opens_at);
  const vc = parseIsoFlexible(ownerVoteMeeting?.voting_closes_at);
  if (vo !== null && n < vo.getTime()) return false;
  if (vc !== null && n >= vc.getTime()) return false;
  return true;
}

export function defaultElectionMeta(overrides?: Partial<Omit<ElectionAgendaMetaV1, 'v' | 'agenda_type' | 'candidates'>>): ElectionAgendaMetaV1 {
  return {
    v: 1,
    agenda_type: 'council_election',
    seats: overrides?.seats ?? 3,
    allow_self_nomination: overrides?.allow_self_nomination ?? true,
    max_choices_per_unit: overrides?.max_choices_per_unit ?? 3,
    nomination_status: overrides?.nomination_status ?? 'open',
    nomination_opens_at: overrides?.nomination_opens_at,
    nomination_closes_at: overrides?.nomination_closes_at,
    title_zh: overrides?.title_zh,
    title_en: overrides?.title_en,
    depends_on_resolution_kind: overrides?.depends_on_resolution_kind,
    candidates: [],
  };
}

export function buildElectionNominationRibbon(
  metas: ElectionAgendaMetaV1[],
  refNow?: Date,
  councilMeeting?: CouncilElectionCanonMeetingInput | null,
): ElectionNominationRibbonModel | null {
  if (!metas.length) return null;
  const now = refNow ?? new Date();
  let totalCandidates = 0;
  let nominationClosesIso: string | null = null;
  let nominationOpensIso: string | null = null;
  const statuses: ElectionNominationUiStatus[] = [];

  for (const raw of metas) {
    const m = finalizeElectionMeta(raw, now);
    totalCandidates += m.candidates.length;
    const c = m.nomination_closes_at?.trim();
    if (c && (nominationClosesIso === null || c < nominationClosesIso)) nominationClosesIso = c;
    const o = m.nomination_opens_at?.trim();
    if (o && (nominationOpensIso === null || o < nominationOpensIso)) nominationOpensIso = o;
    statuses.push(getElectionNominationStatus(now, m, councilMeeting ?? null));
  }

  const nominationUiStatus = mergeElectionNominationUiStatuses(statuses);
  const anyNominationOpen = nominationUiStatus === 'open';

  return {
    hasElection: true,
    anyNominationOpen,
    nominationUiStatus,
    nominationOpensIso,
    nominationClosesIso,
    totalCandidates,
  };
}

/** For `<input type="datetime-local" />`. */
export function toDatetimeLocalValue(iso: string | undefined | null): string {
  const t = iso?.trim();
  if (!t) return '';
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocalValue(s: string | undefined | null): string | undefined {
  const t = s?.trim();
  if (!t) return undefined;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

export function stripElectionCommentFromZh(text?: string | null): string {
  return extractElectionAgendaMeta(text).cleanDescriptionZh.replace(/\s+$/u, '').trim();
}

/**
 * Parse election meta trailing block; strips one well-formed occurrence (same heuristic as migration).
 */
export function extractElectionAgendaMeta(descriptionZh: string | null | undefined): {
  cleanDescriptionZh: string;
  meta: ElectionAgendaMetaV1 | null;
} {
  const s = descriptionZh ?? '';
  const i = s.indexOf(ELECTION_AGENDA_MARKER);
  if (i < 0) return { cleanDescriptionZh: s.replace(/\s+$/u, '').trimEnd(), meta: null };

  const afterMarker = i + ELECTION_AGENDA_MARKER.length;
  let j = afterMarker;
  while (j < s.length && (s[j] === ' ' || s[j] === '\t' || s[j] === '\r')) j++;
  if (s[j] === '\n') j++;

  const endRel = s.indexOf('\n-->', j);
  /** Unclosed blob would leave a duplicate marker prefix on re-embed → meta stays null forever. Strip from opener onward. */
  if (endRel < 0) {
    const clean = s.slice(0, i).replace(/\s+$/u, '').trimEnd();
    return { cleanDescriptionZh: clean, meta: null };
  }

  const raw = s.slice(j, endRel).trim();
  let meta: ElectionAgendaMetaV1 | null = null;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    meta = coerceElectionMeta(o);
  } catch {
    /* ignore */
  }
  const clean = `${s.slice(0, i)}${s.slice(endRel + '\n-->'.length)}`.replace(/\s+$/u, '').trimEnd();
  return { cleanDescriptionZh: clean, meta };
}

export function finalizeElectionMeta(m: ElectionAgendaMetaV1, refNow?: Date): ElectionAgendaMetaV1 {
  const now = refNow ?? new Date();
  const r = coerceElectionMeta({ ...(m as object), v: 1, agenda_type: 'council_election' } as ElectionAgendaMetaV1);
  const base =
    r ??
    defaultElectionMeta({
      candidates: Array.isArray(m?.candidates) ? m.candidates : [],
    });

  const s = getElectionNominationStatus(now, base, undefined);
  const nomination_status: ElectionNominationStatus =
    s === 'closed' || s === 'invalid' ? 'closed' : 'open';

  return { ...base, nomination_status };
}

/** Replace existing election block at end-of-field (or embed new). */
export function embedElectionAgendaMeta(visibleZh: string | null | undefined, meta: ElectionAgendaMetaV1): string {
  const base = stripElectionCommentFromZh(visibleZh ?? '').replace(/\s+$/u, '');
  const safe = finalizeElectionMeta(meta);
  const block = `${ELECTION_AGENDA_MARKER}\n${JSON.stringify(safe)}\n-->`;
  return base ? `${base}\n\n${block}` : block;
}

/** Safe display: user-visible portion of `description_zh` (meta comment removed). */
export function displayAgendaZhWithoutElection(descriptionZh?: string | null): string {
  return stripElectionCommentFromZh(descriptionZh ?? '');
}

function optIsoField(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

function normalizeNominationStatus(v: unknown): ElectionNominationStatus {
  const s = typeof v === 'string' ? v.trim().toLowerCase() : '';
  return s === 'closed' ? 'closed' : 'open';
}

function coerceElectionMeta(o: Partial<ElectionAgendaMetaV1> | Record<string, unknown>): ElectionAgendaMetaV1 | null {
  if (!o || (o as ElectionAgendaMetaV1).v !== 1 || (o as ElectionAgendaMetaV1).agenda_type !== 'council_election') return null;

  const seats = Math.max(1, Math.floor(Number((o as ElectionAgendaMetaV1).seats) || 1));
  const maxChoices = Math.max(1, Math.floor(Number((o as ElectionAgendaMetaV1).max_choices_per_unit) || 1));
  const allow =
    typeof (o as ElectionAgendaMetaV1).allow_self_nomination === 'boolean'
      ? (o as ElectionAgendaMetaV1).allow_self_nomination
      : true;
  const nomination_status = normalizeNominationStatus((o as ElectionAgendaMetaV1).nomination_status);
  const nomination_opens_at = optIsoField((o as ElectionAgendaMetaV1).nomination_opens_at);
  const nomination_closes_at = optIsoField((o as ElectionAgendaMetaV1).nomination_closes_at);

  const rawCands = Array.isArray((o as ElectionAgendaMetaV1).candidates) ? (o as ElectionAgendaMetaV1).candidates : [];
  const candidates: ElectionCandidateDraft[] = [];
  for (const c of rawCands as unknown[]) {
    if (!c || typeof c !== 'object') continue;
    const r = c as Record<string, unknown>;
    const id = String(r.id ?? '').trim();
    if (!id) continue;
    const optStr = (v: unknown): string | null | undefined => {
      if (v == null) return v as null | undefined;
      const s = String(v).trim();
      return s.length ? s : null;
    };
    candidates.push({
      id,
      name: String(r.name ?? ''),
      unit_no: r.unit_no != null ? String(r.unit_no) : '',
      statement: r.statement != null ? String(r.statement) : '',
      nominated_by: r.nominated_by != null ? String(r.nominated_by) : '',
      nominated_by_user_id: optStr(r.nominated_by_user_id),
      nominated_by_unit: optStr(r.nominated_by_unit),
      nomination_source: optStr(r.nomination_source),
      reviewed_by_user_id: optStr(r.reviewed_by_user_id),
      reviewed_at: optStr(r.reviewed_at),
      accepted:
        typeof r.accepted === 'boolean'
          ? r.accepted
          : String(r.accepted ?? '').toLowerCase() === 'true' || String(r.accepted ?? '') === '1',
      created_at: r.created_at != null ? String(r.created_at) : new Date().toISOString(),
    });
  }

  return {
    v: 1,
    agenda_type: 'council_election',
    seats,
    allow_self_nomination: allow,
    max_choices_per_unit: maxChoices,
    nomination_status,
    nomination_opens_at,
    nomination_closes_at,
    title_zh: optStrField((o as ElectionAgendaMetaV1).title_zh),
    title_en: optStrField((o as ElectionAgendaMetaV1).title_en),
    depends_on_resolution_kind: optStrField((o as ElectionAgendaMetaV1).depends_on_resolution_kind),
    candidates,
  };
}

function optStrField(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

function coerceResolutionMeta(o: Partial<ResolutionAgendaMetaV1> | Record<string, unknown>): ResolutionAgendaMetaV1 | null {
  if (!o || (o as ResolutionAgendaMetaV1).v !== 1 || (o as ResolutionAgendaMetaV1).agenda_type !== 'resolution') {
    return null;
  }
  const kind = String((o as ResolutionAgendaMetaV1).resolution_kind ?? '').trim() as ResolutionKind;
  if (kind !== 'remove_council') return null;
  return {
    v: 1,
    agenda_type: 'resolution',
    resolution_kind: kind,
    title_zh: optStrField((o as ResolutionAgendaMetaV1).title_zh),
    title_en: optStrField((o as ResolutionAgendaMetaV1).title_en),
    requires_pass_before_election:
      typeof (o as ResolutionAgendaMetaV1).requires_pass_before_election === 'boolean'
        ? (o as ResolutionAgendaMetaV1).requires_pass_before_election
        : true,
  };
}

export function defaultRemoveCouncilResolutionMeta(
  overrides?: Partial<Omit<ResolutionAgendaMetaV1, 'v' | 'agenda_type' | 'resolution_kind'>>,
): ResolutionAgendaMetaV1 {
  return {
    v: 1,
    agenda_type: 'resolution',
    resolution_kind: 'remove_council',
    title_zh: overrides?.title_zh ?? '是否罢免现任业委会',
    title_en: overrides?.title_en ?? 'Resolution to remove the current council',
    requires_pass_before_election: overrides?.requires_pass_before_election ?? true,
  };
}

export function defaultRemovalLinkedElectionMeta(
  overrides?: Partial<Omit<ElectionAgendaMetaV1, 'v' | 'agenda_type' | 'candidates'>>,
): ElectionAgendaMetaV1 {
  return defaultElectionMeta({
    seats: overrides?.seats ?? 3,
    max_choices_per_unit: overrides?.max_choices_per_unit ?? 3,
    allow_self_nomination: overrides?.allow_self_nomination ?? true,
    nomination_opens_at: overrides?.nomination_opens_at,
    nomination_closes_at: overrides?.nomination_closes_at,
    title_zh: overrides?.title_zh ?? '选举新业委会',
    title_en: overrides?.title_en ?? 'Election of new council',
    depends_on_resolution_kind: 'remove_council',
  });
}

export function extractResolutionAgendaMeta(descriptionZh: string | null | undefined): {
  cleanDescriptionZh: string;
  meta: ResolutionAgendaMetaV1 | null;
} {
  const s = descriptionZh ?? '';
  const i = s.indexOf(RESOLUTION_AGENDA_MARKER);
  if (i < 0) return { cleanDescriptionZh: s.replace(/\s+$/u, '').trimEnd(), meta: null };

  const afterMarker = i + RESOLUTION_AGENDA_MARKER.length;
  let j = afterMarker;
  while (j < s.length && (s[j] === ' ' || s[j] === '\t' || s[j] === '\r')) j++;
  if (s[j] === '\n') j++;

  const endRel = s.indexOf('\n-->', j);
  if (endRel < 0) {
    const clean = s.slice(0, i).replace(/\s+$/u, '').trimEnd();
    return { cleanDescriptionZh: clean, meta: null };
  }

  const raw = s.slice(j, endRel).trim();
  let meta: ResolutionAgendaMetaV1 | null = null;
  try {
    meta = coerceResolutionMeta(JSON.parse(raw) as Record<string, unknown>);
  } catch {
    /* ignore */
  }
  const clean = `${s.slice(0, i)}${s.slice(endRel + '\n-->'.length)}`.replace(/\s+$/u, '').trimEnd();
  return { cleanDescriptionZh: clean, meta };
}

export function stripResolutionCommentFromZh(text?: string | null): string {
  return extractResolutionAgendaMeta(text).cleanDescriptionZh.replace(/\s+$/u, '').trim();
}

export function embedResolutionAgendaMeta(
  visibleZh: string | null | undefined,
  meta: ResolutionAgendaMetaV1,
): string {
  const base = stripResolutionCommentFromZh(stripElectionCommentFromZh(visibleZh ?? '')).replace(/\s+$/u, '');
  const safe = coerceResolutionMeta(meta) ?? defaultRemoveCouncilResolutionMeta();
  const block = `${RESOLUTION_AGENDA_MARKER}\n${JSON.stringify(safe)}\n-->`;
  return base ? `${base}\n\n${block}` : block;
}

/** Strip both election and resolution HTML comment blobs. */
export function displayAgendaZhWithoutEmbeddedMeta(descriptionZh?: string | null): string {
  return stripResolutionCommentFromZh(stripElectionCommentFromZh(descriptionZh ?? ''));
}

export function isRemoveCouncilResolutionAgenda(descriptionZh?: string | null): boolean {
  return extractResolutionAgendaMeta(descriptionZh ?? '').meta?.resolution_kind === 'remove_council';
}

const FORMAL_REMOVE_COUNCIL_TITLE_MARKERS_ZH = [
  '罢免',
  '罢免业委会',
  '罢免现任业委会',
  '罢免现有业委会',
  '罷免',
  '罷免業委會',
  '罷免現任業委會',
  '罷免現有業委會',
] as const;

const FORMAL_REMOVE_COUNCIL_TITLE_MARKERS_EN = [
  'remove council',
  'remove current council',
] as const;

/** Formal `requires_vote` agenda whose title indicates remove-council (no embedded meta). */
export function isFormalRemoveCouncilResolutionByTitle(
  titleZh?: string | null,
  titleEn?: string | null,
): boolean {
  const zh = String(titleZh ?? '').trim();
  const en = String(titleEn ?? '').trim().toLowerCase();
  if (FORMAL_REMOVE_COUNCIL_TITLE_MARKERS_ZH.some((m) => zh.includes(m))) return true;
  if (FORMAL_REMOVE_COUNCIL_TITLE_MARKERS_EN.some((m) => en.includes(m))) return true;
  return false;
}

export type RemoveCouncilAgendaRow = {
  description_zh?: string | null;
  requires_vote?: boolean | null;
  title_zh?: string | null;
  title_en?: string | null;
};

/** Embedded remove_council meta, or formal resolution with remove-council title heuristics. */
export function isRemoveCouncilGovernanceAgenda(row: RemoveCouncilAgendaRow): boolean {
  if (isRemoveCouncilResolutionAgenda(row.description_zh)) return true;
  if (!!row.requires_vote && isFormalRemoveCouncilResolutionByTitle(row.title_zh, row.title_en)) {
    return true;
  }
  return false;
}

export function electionDependsOnRemoveCouncil(descriptionZh?: string | null): boolean {
  const m = extractElectionAgendaMeta(descriptionZh ?? '').meta;
  return m?.depends_on_resolution_kind === 'remove_council';
}

type AgendaSortRow = {
  sort_order?: number | null;
  description_zh?: string | null;
  requires_vote?: boolean | null;
  title_zh?: string | null;
  title_en?: string | null;
};

/** Order: remove_council resolution → linked election → other agendas (stable by sort_order). */
export function sortGovernanceAgendaItems<T extends AgendaSortRow>(items: T[]): T[] {
  const rank = (a: T): number => {
    if (isRemoveCouncilGovernanceAgenda(a)) return 0;
    if (electionDependsOnRemoveCouncil(a.description_zh)) return 1;
    if (extractElectionAgendaMeta(a.description_zh ?? '').meta?.agenda_type === 'council_election') return 2;
    if (extractResolutionAgendaMeta(a.description_zh ?? '').meta?.agenda_type === 'resolution') return 3;
    if (a.requires_vote) return 4;
    return 5;
  };
  return [...items].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
}

export function isOwnerRequisitionedRemovalSgmMeeting(input: {
  meeting_type?: string | null;
  initiation_type?: string | null;
  meeting_format_ui?: string | null;
  description_zh?: string | null;
}): boolean {
  const mt = String(input.meeting_type ?? '').trim().toLowerCase();
  if (mt !== 'sgm') return false;
  const initFromGov = extractGovernanceMeta(input.description_zh ?? '').meta?.initiation_type;
  const init = String(input.initiation_type ?? initFromGov ?? '').trim();
  if (init !== 'owner_requisitioned') return false;
  const fmt = String(input.meeting_format_ui ?? '').trim().toLowerCase();
  return fmt === 'written_remote' || fmt === 'remote_written';
}

/** Agenda row shape for 01 Formal Notice (matches `meeting_agenda_items` notice fetch). */
export type FormalNoticeAgendaRow = {
  id: string;
  sort_order?: number | null;
  title_en?: string | null;
  title_zh?: string | null;
  description_zh?: string | null;
  requires_vote?: boolean | null;
};

export type FormalNoticeAgendaKind = 'removal_resolution' | 'election' | 'resolution' | 'normal';

export type FormalNoticeAgendaItem = {
  id: string;
  order: number;
  kind: FormalNoticeAgendaKind;
  kindLabel: string;
  /** Primary line in current UI language; secondary in the other language when available. */
  displayTitle: string;
};

export function formalNoticeAgendaKindFromRow(row: FormalNoticeAgendaRow): FormalNoticeAgendaKind {
  if (isRemoveCouncilGovernanceAgenda(row)) return 'removal_resolution';
  if (extractElectionAgendaMeta(row.description_zh ?? '').meta?.agenda_type === 'council_election') {
    return 'election';
  }
  return row.requires_vote ? 'resolution' : 'normal';
}

function formalNoticeBilingualTitle(
  row: FormalNoticeAgendaRow,
  languageEn: boolean,
  fallbackOrder: number,
): string {
  const zh = row.title_zh?.trim() || '';
  const en = row.title_en?.trim() || '';
  if (languageEn) {
    const primary = en || zh || `Agenda item ${fallbackOrder}`;
    const secondary = en && zh && en !== zh ? zh : null;
    return secondary ? `${primary} / ${secondary}` : primary;
  }
  const primary = zh || en || `议程 ${fallbackOrder}`;
  const secondary = zh && en && zh !== en ? en : null;
  return secondary ? `${primary} / ${secondary}` : primary;
}

export function buildFormalNoticeAgendaItems(
  rows: FormalNoticeAgendaRow[],
  languageEn: boolean,
): FormalNoticeAgendaItem[] {
  const sorted = sortGovernanceAgendaItems(rows);
  return sorted.map((row, idx) => {
    const kind = formalNoticeAgendaKindFromRow(row);
    const order = idx + 1;

    const kindLabel = (() => {
      switch (kind) {
        case 'removal_resolution':
          return languageEn ? 'Removal resolution' : '罢免决议';
        case 'election':
          return languageEn ? 'Council election' : '选举';
        case 'resolution':
          return languageEn ? 'Resolution' : '决议';
        default:
          return languageEn ? 'Agenda' : '议程';
      }
    })();

    return {
      id: row.id,
      order,
      kind,
      kindLabel,
      displayTitle: formalNoticeBilingualTitle(row, languageEn, order),
    };
  });
}

export function buildFormalNoticeIntro(
  items: FormalNoticeAgendaItem[],
  languageEn: boolean,
): string {
  const hasRemoval = items.some((i) => i.kind === 'removal_resolution');
  const hasElection = items.some((i) => i.kind === 'election');
  const hasResolution = items.some((i) => i.kind === 'resolution');

  if (languageEn) {
    if (hasRemoval && hasElection) {
      return 'This formal notice informs all owners that this meeting will consider a resolution to remove the current council and elect new council members.';
    }
    if (hasRemoval) {
      return 'This formal notice informs all owners that this meeting will consider a resolution to remove the current council.';
    }
    if (hasElection) {
      return 'This formal notice informs all owners that this meeting will include an election of council members.';
    }
    if (hasResolution) {
      return 'This formal notice informs all owners of the resolutions to be considered at this remote written meeting.';
    }
    return 'This formal notice informs all owners of this remote written meeting and electronic voting.';
  }

  if (hasRemoval && hasElection) {
    return '特此通知全体业主：本次会议将审议罢免现任业委会之决议，并选举新一届业委会成员。';
  }
  if (hasRemoval) {
    return '特此通知全体业主：本次会议将审议罢免现任业委会之决议。';
  }
  if (hasElection) {
    return '特此通知全体业主：本次会议将进行业委会成员选举。';
  }
  if (hasResolution) {
    return '特此通知全体业主：本次会议将审议下列决议事项。';
  }
  return '特此通知全体业主：本次会议以远程书面会议形式举行，业主可通过平台进行电子投票。';
}

export function buildFormalNoticeInitiationLines(
  meta: MeetingGovernanceMetaV1 | null,
  languageEn: boolean,
): string[] {
  if (!meta) return [];

  if (meta.initiation_type === 'owner_requisitioned') {
    const total = meta.total_voting_units ?? '—';
    const pct = meta.required_percent ?? MEETING_SGM_REQUISITION_PERCENT_DEFAULT;
    const required =
      meta.required_units ?? meetingSgmRequisitionRequiredUnits(meta.total_voting_units ?? 0, pct);
    const signed = meta.signed_units ?? '—';

    if (languageEn) {
      return [
        'This Special General Meeting is owner-requisitioned.',
        `Total voting units: ${total}`,
        `Required threshold: ${pct}%`,
        `Required signed units: ${required}`,
        `Signed units: ${signed}`,
      ];
    }
    return [
      '本次特别业主大会由业主联署发起。',
      `总投票单位：${total}`,
      `法定联署门槛：${pct}%`,
      `所需联署户数：${required}`,
      `已联名户数：${signed}`,
    ];
  }

  if (meta.initiation_type === 'council_initiated') {
    return languageEn
      ? ['This meeting is initiated by the council.']
      : ['本次会议由业委会发起。', 'This meeting is initiated by the council.'];
  }

  return [];
}

export type FormalNoticeIsoWindow = { openIso: string; closeIso: string };

export type FormalNoticeTimelineWindows = {
  isV3: boolean;
  participation: FormalNoticeIsoWindow | null;
  publicNotice: FormalNoticeIsoWindow | null;
  nomination: FormalNoticeIsoWindow | null;
  voting: FormalNoticeIsoWindow | null;
};

export function deriveFormalNoticeTimelineWindows(
  meeting: Pick<MeetingRow, 'meeting_type' | 'description_zh' | 'scheduled_at'>,
  opts: {
    hasElectionAgenda: boolean;
    ownerVoteVotingOpens?: string | null;
    ownerVoteVotingCloses?: string | null;
  },
): FormalNoticeTimelineWindows {
  const pair = (open: string | null | undefined, close: string | null | undefined): FormalNoticeIsoWindow | null => {
    const o = open?.trim();
    const c = close?.trim();
    if (!o || !c) return null;
    return { openIso: o, closeIso: c };
  };

  if (isWrittenRemoteV3Meeting(meeting)) {
    const v3 = deriveRemoteWrittenV3CanonFromScheduledAt(meeting.scheduled_at);
    if (!v3) {
      return { isV3: true, participation: null, publicNotice: null, nomination: null, voting: null };
    }
    const window = pair(v3.publicNoticeOpenIso, v3.publicNoticeCloseIso);
    return {
      isV3: true,
      participation: window,
      publicNotice: window,
      nomination: opts.hasElectionAgenda ? window : null,
      voting: window,
    };
  }

  if (isStrictAgmOrSgmMeeting(meeting)) {
    const disp = deriveAgmSgmCanonDisplayWindows(meeting.scheduled_at, opts.hasElectionAgenda);
    if (!disp) {
      return { isV3: false, participation: null, publicNotice: null, nomination: null, voting: null };
    }
    return {
      isV3: false,
      participation: null,
      publicNotice: pair(disp.publicNoticeOpenIso, disp.publicNoticeCloseIso),
      nomination:
        opts.hasElectionAgenda && disp.nominationOpenIso && disp.nominationCloseIso
          ? pair(disp.nominationOpenIso, disp.nominationCloseIso)
          : null,
      voting: pair(disp.votingOpenIso, disp.votingCloseIso),
    };
  }

  const disc = councilWrittenRemoteWindows(meeting);
  let noticeOpen = disc.publicNoticeOpens?.trim() || null;
  let noticeClose = disc.publicNoticeCloses?.trim() || null;
  if (!noticeOpen && !noticeClose && meeting.scheduled_at?.trim()) {
    const canon = deriveCouncilElectionCanonFromScheduledAt(meeting.scheduled_at);
    if (canon) {
      noticeOpen = canon.publicNoticeOpenIso;
      noticeClose = canon.publicNoticeCloseIso;
    }
  }

  const fb = councilMeetingVotingWindowFallback(meeting);
  const voteOpen = opts.ownerVoteVotingOpens?.trim() || fb.votingOpens || null;
  const voteClose = opts.ownerVoteVotingCloses?.trim() || fb.votingCloses || null;

  return {
    isV3: false,
    participation: null,
    publicNotice: pair(noticeOpen, noticeClose),
    nomination: pair(disc.nominationOpens, disc.nominationCloses),
    voting: pair(voteOpen, voteClose),
  };
}

export type FormalNoticeBuildInput = {
  meeting: Pick<
    MeetingRow,
    | 'meeting_type'
    | 'description_zh'
    | 'description_en'
    | 'scheduled_at'
    | 'title_zh'
    | 'title_en'
    | 'meeting_format'
  >;
  ownerVoteMeeting?: Pick<OwnerVoteMeetingLite, 'voting_opens_at' | 'voting_closes_at'> | null;
  electionAgendaCount: number;
  agendaNoticeRows: FormalNoticeAgendaRow[];
};

/** View-model for formal notice modal — same fields rendered in MeetingVoteArchiveCard. */
export type FormalNoticeViewPayload = {
  intro: string;
  initiationLines: string[];
  title: string;
  typeLabel: string;
  formatLabel: string;
  dateStr: string;
  participationSpan: string | null;
  publicNoticeSpan: string;
  nominationSpan: string | null;
  votingSpan: string;
  descDisplay: string;
  agendaItems: FormalNoticeAgendaItem[];
  docTitle: string;
  meetingNameLabel: string;
  meetingTypeLabel: string;
  meetingFormatLabel: string;
  meetingDateLabel: string;
  participationPeriodLabel: string;
  publicNoticeLabel: string;
  nominationPeriodLabel: string;
  votingPeriodLabel: string;
  descriptionLabel: string;
  topicsLabel: string;
  agendaEmpty: string;
  participationLabel: string;
  participationBody: string;
};

export type FormalNoticePlainTextLang = 'zh' | 'en' | 'bilingual';

function fmtFormalNoticeArchiveTs(iso: string | null | undefined, languageEn: boolean): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(languageEn ? 'en-CA' : 'zh-CN', { dateStyle: 'medium', timeStyle: 'short' });
}

function fmtFormalNoticeArchiveWindowSpan(
  window: FormalNoticeIsoWindow | null,
  languageEn: boolean,
  notSet: string,
): string {
  if (!window) return notSet;
  const open = fmtFormalNoticeArchiveTs(window.openIso, languageEn) ?? notSet;
  const close = fmtFormalNoticeArchiveTs(window.closeIso, languageEn) ?? notSet;
  return `${open} · ${close}`;
}

/** Build formal notice view payload — shared by Draft preview modal and archive plain text. */
export function buildFormalNoticeViewPayload(
  input: FormalNoticeBuildInput,
  languageEn: boolean,
): FormalNoticeViewPayload {
  const fc = MEETING_VOTE_ARCHIVE_FORMAL_NOTICE;
  const c = languageEn ? fc.en : fc.zh;
  const notSet = languageEn ? fc.notSet.en : fc.notSet.zh;
  const orNotSet = (s: string | null | undefined) => (s?.trim() ? s.trim() : notSet);

  const { meeting, ownerVoteMeeting, electionAgendaCount, agendaNoticeRows } = input;
  const agendaItems = buildFormalNoticeAgendaItems(agendaNoticeRows, languageEn);
  const hasElectionAgenda =
    agendaItems.some((a) => a.kind === 'election') || electionAgendaCount > 0;
  const governanceMeta = extractGovernanceMeta(meeting.description_zh ?? '').meta;

  const timeline = deriveFormalNoticeTimelineWindows(meeting, {
    hasElectionAgenda,
    ownerVoteVotingOpens: ownerVoteMeeting?.voting_opens_at,
    ownerVoteVotingCloses: ownerVoteMeeting?.voting_closes_at,
  });

  const title =
    meetingTitleZhFirst(meeting)?.trim() ||
    (languageEn ? meetingUiStrings.untitled.en : meetingUiStrings.untitled.zh);
  const typeLabel = orNotSet(labelMeetingType(meeting.meeting_type, languageEn));
  const fd = labelMeetingFormatUiDisplay(meeting, languageEn);
  const formatCore = fd.secondary ? `${fd.primary}\n${fd.secondary}` : fd.primary;
  const formatLabel = orNotSet(formatCore);
  const dateStr = fmtFormalNoticeArchiveTs(meeting.scheduled_at, languageEn) ?? notSet;

  const descZh = meeting.description_zh ? stripWrittenRemoteMeta(meeting.description_zh) : '';
  const descEn = meeting.description_en?.trim() || '';
  const descCombined = languageEn ? descEn || descZh : descZh || descEn;

  return {
    intro: buildFormalNoticeIntro(agendaItems, languageEn),
    initiationLines: buildFormalNoticeInitiationLines(governanceMeta, languageEn),
    title,
    typeLabel,
    formatLabel,
    dateStr,
    participationSpan: timeline.participation
      ? fmtFormalNoticeArchiveWindowSpan(timeline.participation, languageEn, notSet)
      : null,
    publicNoticeSpan: fmtFormalNoticeArchiveWindowSpan(timeline.publicNotice, languageEn, notSet),
    nominationSpan: timeline.nomination
      ? fmtFormalNoticeArchiveWindowSpan(timeline.nomination, languageEn, notSet)
      : null,
    votingSpan: fmtFormalNoticeArchiveWindowSpan(timeline.voting, languageEn, notSet),
    descDisplay: descCombined ? descCombined : notSet,
    agendaItems,
    docTitle: c.docTitle,
    meetingNameLabel: c.meetingName,
    meetingTypeLabel: c.meetingType,
    meetingFormatLabel: c.meetingFormat,
    meetingDateLabel: c.meetingDate,
    participationPeriodLabel: languageEn ? 'Participation period:' : '参与期：',
    publicNoticeLabel: languageEn ? 'Public notice / discussion period:' : '公示 / 讨论期：',
    nominationPeriodLabel: languageEn ? 'Nomination period:' : '提名期：',
    votingPeriodLabel: languageEn ? 'Voting period:' : '投票期：',
    descriptionLabel: c.description,
    topicsLabel: languageEn ? 'Agenda:' : '议程：',
    agendaEmpty: languageEn ? 'No agenda items listed.' : '暂无议程。',
    participationLabel: c.participation,
    participationBody: c.participationBody,
  };
}

function renderFormalNoticePlainTextSection(payload: FormalNoticeViewPayload): string {
  const lines: string[] = [];
  lines.push(payload.docTitle);
  lines.push('');
  lines.push(payload.intro);
  if (payload.initiationLines.length > 0) {
    lines.push('');
    lines.push(...payload.initiationLines);
  }
  lines.push('');
  lines.push(`${payload.meetingNameLabel}`);
  lines.push(payload.title);
  lines.push('');
  lines.push(`${payload.meetingTypeLabel}`);
  lines.push(payload.typeLabel);
  lines.push('');
  lines.push(`${payload.meetingFormatLabel}`);
  lines.push(payload.formatLabel);
  lines.push('');
  lines.push(`${payload.meetingDateLabel}`);
  lines.push(payload.dateStr);
  if (payload.participationSpan) {
    lines.push('');
    lines.push(`${payload.participationPeriodLabel}`);
    lines.push(payload.participationSpan);
  }
  lines.push('');
  lines.push(`${payload.publicNoticeLabel}`);
  lines.push(payload.publicNoticeSpan);
  if (payload.nominationSpan) {
    lines.push('');
    lines.push(`${payload.nominationPeriodLabel}`);
    lines.push(payload.nominationSpan);
  }
  lines.push('');
  lines.push(`${payload.votingPeriodLabel}`);
  lines.push(payload.votingSpan);
  lines.push('');
  lines.push(`${payload.descriptionLabel}`);
  lines.push(payload.descDisplay);
  lines.push('');
  lines.push(`${payload.topicsLabel}`);
  if (payload.agendaItems.length > 0) {
    payload.agendaItems.forEach((item, idx) => {
      lines.push(`${idx + 1}. ${item.displayTitle}`);
    });
  } else {
    lines.push(payload.agendaEmpty);
  }
  lines.push('');
  lines.push(`${payload.participationLabel}`);
  lines.push(payload.participationBody);
  return lines.join('\n');
}

/** Plain-text formal notice for meeting_documents slot 01 — uses the same view payload as Draft preview. */
export function buildFormalNoticePlainText(
  input: FormalNoticeBuildInput,
  lang: FormalNoticePlainTextLang = 'bilingual',
): string {
  const header = '01 Formal Notice\n================================\n';
  if (lang === 'zh') {
    return header + '\n' + renderFormalNoticePlainTextSection(buildFormalNoticeViewPayload(input, false));
  }
  if (lang === 'en') {
    return header + '\n' + renderFormalNoticePlainTextSection(buildFormalNoticeViewPayload(input, true));
  }
  const zhSection = renderFormalNoticePlainTextSection(buildFormalNoticeViewPayload(input, false));
  const enSection = renderFormalNoticePlainTextSection(buildFormalNoticeViewPayload(input, true));
  return `${header}\n=== 中文 ===\n\n${zhSection}\n\n=== English ===\n\n${enSection}`;
}
