import { supabase } from '@/lib/supabase';
import type { ImportantUpdatesBullet } from '@/components/dashboard/ImportantUpdatesDashboardCard';
import {
  fetchLatestOwnerVoteMeetingCardRowsByCouncilTitles,
  fetchMeetingAgendaSummariesForMeetingIds,
  getMeetingsByPropertyAndYear,
  meetingTitleZhFirst,
  type MeetingRow,
  type OwnerVoteMeetingCardRow,
} from '@/features/meetings/api';
import { extractElectionAgendaMeta, isStrictAgmOrSgmMeeting } from '@/features/meetings/electionAgendaModel';
import {
  ELECTION_FIXED_PHASE_DAYS,
  REMOTE_WRITTEN_V3_PARTICIPATION_DAYS,
} from '@/features/meetings/electionTimelineMath';
import { isWrittenRemoteV3Meeting } from '@/features/meetings/meetingFormatModel';
import { FORMAL_NOTICE_SNAPSHOT_TITLE_EN } from '@/features/meetings/meetingDocumentsRead';
import { councilMeetingTitleForOwnerVoteBinding } from '@/features/meetings/ownerVotingCouncil';

type MeetingsNavHref = '/voting' | '/meetings';

/** AGM/SGM governance bullets outrank community announcements (max 80). */
export const AGM_SGM_NOTICE_PRIORITY = 110;
export const AGM_SGM_VOTING_PRIORITY = 130;

const RESULTS_DISCLOSURE_MS = 14 * 24 * 60 * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type AgmSgmLifecyclePhase = 'notice_period' | 'discussion' | 'nomination' | 'voting' | 'results';

function msIso(iso: string | null | undefined): number | null {
  const t = iso?.trim();
  if (!t) return null;
  const d = new Date(t).getTime();
  return Number.isNaN(d) ? null : d;
}

function addDaysMs(baseMs: number, days: number): number {
  return baseMs + days * MS_PER_DAY;
}

/** Voting is officially open only when DB status is open and now is within [voting_opens_at, voting_closes_at). */
function isOwnerVoteVotingOfficiallyOpen(
  ovLite: OwnerVoteMeetingCardRow | undefined,
  now: Date,
): boolean {
  const ovSt = ovLite?.status?.trim().toLowerCase() ?? '';
  if (ovSt !== 'open') return false;
  const openMs = msIso(ovLite?.voting_opens_at);
  if (openMs === null || now.getTime() < openMs) return false;
  const closeMs = msIso(ovLite?.voting_closes_at);
  if (closeMs !== null && now.getTime() >= closeMs) return false;
  return true;
}

function resolveVoteCloseMs(
  ovLite: OwnerVoteMeetingCardRow | undefined,
  voteOpenMs: number,
  hasElectionAgenda: boolean,
  isV3: boolean,
): number {
  const ovClose = msIso(ovLite?.voting_closes_at);
  if (ovClose !== null) return ovClose;
  if (isV3) return addDaysMs(voteOpenMs, REMOTE_WRITTEN_V3_PARTICIPATION_DAYS);
  const flowDays = hasElectionAgenda
    ? ELECTION_FIXED_PHASE_DAYS * 3
    : ELECTION_FIXED_PHASE_DAYS * 2;
  return addDaysMs(voteOpenMs, flowDays);
}

function deriveAgmSgmLifecyclePhase(
  meeting: MeetingRow,
  hasElectionAgenda: boolean,
  ovLite: OwnerVoteMeetingCardRow | undefined,
  now: Date,
): AgmSgmLifecyclePhase | null {
  const meetingStatus = String(meeting.status ?? '').trim().toLowerCase();
  if (meetingStatus === 'archived') return null;

  const ovStatus = String(ovLite?.status ?? '').trim().toLowerCase();
  if (ovStatus === 'archived') return null;

  const n = now.getTime();
  const voteOpenMs = msIso(ovLite?.voting_opens_at);
  const isV3 = isWrittenRemoteV3Meeting(meeting);

  if (!isOwnerVoteVotingOfficiallyOpen(ovLite, now)) {
    const ovCloseMs = msIso(ovLite?.voting_closes_at);
    if (voteOpenMs !== null && ovCloseMs !== null && n >= ovCloseMs) {
      return n < ovCloseMs + RESULTS_DISCLOSURE_MS ? 'results' : null;
    }
    if (voteOpenMs !== null && n >= voteOpenMs && ovCloseMs === null) {
      const inferredClose = resolveVoteCloseMs(ovLite, voteOpenMs, hasElectionAgenda, isV3);
      if (n >= inferredClose) {
        return n < inferredClose + RESULTS_DISCLOSURE_MS ? 'results' : null;
      }
    }
    return 'notice_period';
  }

  const flowStartMs = voteOpenMs!;
  const voteCloseMs = resolveVoteCloseMs(ovLite, flowStartMs, hasElectionAgenda, isV3);

  if (n >= voteCloseMs) {
    return n < voteCloseMs + RESULTS_DISCLOSURE_MS ? 'results' : null;
  }

  if (isV3) {
    return 'voting';
  }

  const discussionEnd = addDaysMs(flowStartMs, ELECTION_FIXED_PHASE_DAYS);
  const nominationEnd = hasElectionAgenda
    ? addDaysMs(flowStartMs, ELECTION_FIXED_PHASE_DAYS * 2)
    : discussionEnd;

  if (n < discussionEnd) return 'discussion';
  if (hasElectionAgenda && n < nominationEnd) return 'nomination';
  return 'voting';
}

function isFormalNoticeDocumentTitle(titleEn: string | null | undefined): boolean {
  const t = titleEn?.trim() ?? '';
  if (!t) return false;
  return t === FORMAL_NOTICE_SNAPSHOT_TITLE_EN || t.startsWith('01 ');
}

function meetingDetailUrl(
  propertyId: string,
  meetingId: string,
  meetingsHref: MeetingsNavHref,
): string {
  const qs = new URLSearchParams({
    propertyId,
    source: meetingsHref === '/voting' ? 'voting' : 'meetings',
  });
  return `${meetingsHref}/${encodeURIComponent(meetingId)}?${qs.toString()}`;
}

function countElectionAgendasByMeetingId(
  rows: Awaited<ReturnType<typeof fetchMeetingAgendaSummariesForMeetingIds>>['rows'],
): Record<string, number> {
  const byMeeting: Record<string, number> = {};
  for (const row of rows) {
    const mid = String(row.meeting_id ?? '').trim();
    if (!mid) continue;
    if (extractElectionAgendaMeta(row.description_zh ?? '').meta?.agenda_type === 'council_election') {
      byMeeting[mid] = (byMeeting[mid] ?? 0) + 1;
    }
  }
  return byMeeting;
}

function buildAgmSgmBulletText(meeting: MeetingRow, phase: AgmSgmLifecyclePhase, langEn: boolean): string {
  const title = meetingTitleZhFirst(meeting) || (langEn ? 'General meeting' : '大会');
  switch (phase) {
    case 'notice_period':
      return langEn ? `${title} is in the notice period` : `${title} 正处于通知期`;
    case 'discussion':
      return langEn ? `${title} — public notice period` : `${title} 正处于公示期`;
    case 'nomination':
      return langEn ? `${title} — nomination period` : `${title} 提名期进行中`;
    case 'voting':
      return langEn ? `${title} — voting open` : `${title} 投票期进行中`;
    case 'results':
      return langEn ? `${title} — results published` : `${title} 投票结果公示中`;
  }
}

async function fetchFormalNoticePublishedMeetingIds(
  propertyId: string,
  meetingIds: string[],
): Promise<Set<string>> {
  if (!meetingIds.length) return new Set();
  const { data, error } = await supabase
    .from('meeting_documents')
    .select('meeting_id, title_en')
    .eq('property_id', propertyId)
    .in('meeting_id', meetingIds);

  if (error) throw new Error(error.message);

  const published = new Set<string>();
  for (const row of data ?? []) {
    const mid = String((row as { meeting_id?: string }).meeting_id ?? '').trim();
    const titleEn = (row as { title_en?: string | null }).title_en;
    if (mid && isFormalNoticeDocumentTitle(titleEn)) {
      published.add(mid);
    }
  }
  return published;
}

/**
 * AGM/SGM meetings with published Formal Notice (01) in active lifecycle phases
 * → Dashboard Important Updates bullets (priority above community announcements).
 */
export async function fetchAgmSgmGovernanceBullets(params: {
  propertyId: string;
  langEn: boolean;
  meetingsHref: MeetingsNavHref;
  fiscalYear?: number;
}): Promise<ImportantUpdatesBullet[]> {
  const { propertyId, langEn, meetingsHref } = params;
  const fiscalYear = params.fiscalYear ?? new Date().getFullYear();
  const now = new Date();

  const { meetings, error: meetingsErr } = await getMeetingsByPropertyAndYear(propertyId, fiscalYear);
  if (meetingsErr) throw meetingsErr;

  const agmSgmMeetings = meetings.filter(isStrictAgmOrSgmMeeting);
  if (!agmSgmMeetings.length) return [];

  const meetingIds = agmSgmMeetings.map((m) => String(m.id).trim()).filter(Boolean);
  const publishedIds = await fetchFormalNoticePublishedMeetingIds(propertyId, meetingIds);
  const activeMeetings = agmSgmMeetings.filter(
    (m) =>
      publishedIds.has(String(m.id).trim()) &&
      String(m.status ?? '').toLowerCase() !== 'archived',
  );
  if (!activeMeetings.length) return [];

  const [{ rows: agendaRows, error: agendaErr }, ovRes] = await Promise.all([
    fetchMeetingAgendaSummariesForMeetingIds(propertyId, meetingIds),
    fetchLatestOwnerVoteMeetingCardRowsByCouncilTitles(
      propertyId,
      activeMeetings.map((m) => councilMeetingTitleForOwnerVoteBinding(m).trim()).filter(Boolean),
    ),
  ]);
  if (agendaErr) throw agendaErr;
  if (ovRes.error) throw ovRes.error;

  const electionByMeeting = countElectionAgendasByMeetingId(agendaRows);
  const bullets: ImportantUpdatesBullet[] = [];

  for (const meeting of activeMeetings) {
    const councilId = String(meeting.id).trim();
    const bindTitle = councilMeetingTitleForOwnerVoteBinding(meeting).trim();
    const ovLite = bindTitle ? ovRes.byTitle[bindTitle] : undefined;
    const hasElectionAgenda = (electionByMeeting[councilId] ?? 0) > 0;

    const phase = deriveAgmSgmLifecyclePhase(meeting, hasElectionAgenda, ovLite, now);
    if (!phase) continue;

    const isVoting = phase === 'voting';
    bullets.push({
      id: `agm-sgm-${councilId}`,
      text: buildAgmSgmBulletText(meeting, phase, langEn),
      kind: isVoting ? 'action' : 'notice',
      actionUrl: meetingDetailUrl(propertyId, councilId, meetingsHref),
      source: 'agm_sgm',
      priority: isVoting ? AGM_SGM_VOTING_PRIORITY : AGM_SGM_NOTICE_PRIORITY,
      createdAt: ovLite?.voting_opens_at ?? meeting.scheduled_at ?? meeting.created_at ?? undefined,
    });
  }

  return bullets;
}
