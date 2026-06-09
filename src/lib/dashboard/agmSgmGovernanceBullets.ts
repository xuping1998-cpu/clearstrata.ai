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
  deriveAgmSgmCanonDisplayWindows,
  deriveRemoteWrittenV3CanonFromScheduledAt,
} from '@/features/meetings/electionTimelineMath';
import { isWrittenRemoteV3Meeting } from '@/features/meetings/meetingFormatModel';
import { FORMAL_NOTICE_SNAPSHOT_TITLE_EN } from '@/features/meetings/meetingDocumentsRead';
import { councilMeetingTitleForOwnerVoteBinding } from '@/features/meetings/ownerVotingCouncil';
type MeetingsNavHref = '/voting' | '/meetings';

/** AGM/SGM governance bullets outrank community announcements (max 80). */
export const AGM_SGM_NOTICE_PRIORITY = 110;
export const AGM_SGM_VOTING_PRIORITY = 130;

const RESULTS_DISCLOSURE_MS = 14 * 24 * 60 * 60 * 1000;

type AgmSgmLifecyclePhase = 'discussion' | 'nomination' | 'voting' | 'results';

function msIso(iso: string | null | undefined): number | null {
  const t = iso?.trim();
  if (!t) return null;
  const d = new Date(t).getTime();
  return Number.isNaN(d) ? null : d;
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

function deriveAgmSgmLifecyclePhase(
  meeting: MeetingRow,
  hasElectionAgenda: boolean,
  ovLite: OwnerVoteMeetingCardRow | undefined,
  now: Date,
): AgmSgmLifecyclePhase | null {
  const n = now.getTime();

  if (isWrittenRemoteV3Meeting(meeting)) {
    const v3 = deriveRemoteWrittenV3CanonFromScheduledAt(meeting.scheduled_at);
    if (!v3) return null;
    const open = msIso(v3.publicNoticeOpenIso);
    const voteClose = msIso(v3.votingCloseIso);
    if (open === null || voteClose === null) return null;
    if (n >= voteClose) {
      return n < voteClose + RESULTS_DISCLOSURE_MS ? 'results' : null;
    }
    if (n < open) return 'discussion';
    const ovSt = ovLite?.status?.trim().toLowerCase() ?? '';
    const ovClose = msIso(ovLite?.voting_closes_at);
    if (ovSt === 'open' && (ovClose === null || n < ovClose)) return 'voting';
    return 'discussion';
  }

  const disp = deriveAgmSgmCanonDisplayWindows(meeting.scheduled_at, hasElectionAgenda);
  if (!disp) return null;

  const noticeOpen = msIso(disp.publicNoticeOpenIso);
  const noticeClose = msIso(disp.publicNoticeCloseIso);
  const voteOpen = msIso(disp.votingOpenIso);
  const voteClose = msIso(disp.votingCloseIso);
  if (noticeOpen === null || noticeClose === null || voteOpen === null || voteClose === null) {
    return null;
  }

  if (n >= voteClose) {
    return n < voteClose + RESULTS_DISCLOSURE_MS ? 'results' : null;
  }

  const ovSt = ovLite?.status?.trim().toLowerCase() ?? '';
  const ovClose = msIso(ovLite?.voting_closes_at);
  const inCanonVote = n >= voteOpen && n < voteClose;
  const inOvVote = ovSt === 'open' && (ovClose === null || n < ovClose);
  if (inCanonVote || inOvVote) return 'voting';

  if (hasElectionAgenda && disp.nominationOpenIso && disp.nominationCloseIso) {
    const nomOpen = msIso(disp.nominationOpenIso);
    const nomClose = msIso(disp.nominationCloseIso);
    if (nomOpen !== null && nomClose !== null && n >= nomOpen && n < nomClose) {
      return 'nomination';
    }
  }

  if (n < noticeOpen) return 'discussion';
  return 'discussion';
}

function buildAgmSgmBulletText(meeting: MeetingRow, phase: AgmSgmLifecyclePhase, langEn: boolean): string {
  const title = meetingTitleZhFirst(meeting) || (langEn ? 'General meeting' : '大会');
  switch (phase) {
    case 'discussion':
      return langEn ? `${title} — discussion period` : `${title} 正处于讨论期`;
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
  const activeMeetings = agmSgmMeetings.filter((m) => publishedIds.has(String(m.id).trim()));
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
      createdAt: meeting.scheduled_at ?? meeting.created_at ?? undefined,
    });
  }

  return bullets;
}
