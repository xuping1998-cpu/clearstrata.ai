import type { MeetingRow } from './api';

function meetingTitleZhFirstPick(m: Pick<MeetingRow, 'title_zh' | 'title_en'>): string {
  const zh = m.title_zh?.trim();
  const en = m.title_en?.trim();
  return zh || en || '';
}

/** Title string used when linking / creating `owner_vote_meetings` for a council meeting. */
export function councilMeetingTitleForOwnerVoteBinding(m: MeetingRow): string {
  return meetingTitleZhFirstPick(m);
}

export type MeetingRowWithExtras = MeetingRow & { type?: unknown; category?: unknown };

/**
 * True for AGM/SGM council meetings eligible for Owner Voting (electronic ballots).
 * Prefer `meeting_type`; fallback scans title/category heuristics.
 */
export function isOwnerVotingMeeting(meeting: MeetingRowWithExtras): boolean {
  const mt = String(meeting.meeting_type ?? '')
    .trim()
    .toLowerCase();
  if (mt === 'agm' || mt === 'sgm') return true;

  const value = [
    meeting.meeting_type,
    meeting.type,
    meeting.category,
    meeting.title_zh,
    meeting.title_en,
  ]
    .filter((x) => x != null && String(x).trim() !== '')
    .join(' ')
    .toLowerCase();

  return (
    value.includes('agm') ||
    value.includes('sgm') ||
    value.includes('特别大会') ||
    value.includes('年度大会')
  );
}

export function ownerVoteMeetingTypeForInsert(meeting: MeetingRowWithExtras): 'agm' | 'sgm' {
  if (meeting.meeting_type === 'agm') return 'agm';
  if (meeting.meeting_type === 'sgm') return 'sgm';
  const blob = [
    meeting.title_zh,
    meeting.title_en,
    meeting.category,
    meeting.type,
    meeting.meeting_type,
  ]
    .filter((x) => x != null && String(x).trim() !== '')
    .join(' ')
    .toLowerCase();
  if (blob.includes('agm') || blob.includes('年度')) return 'agm';
  return 'sgm';
}

export function addDaysIso(fromIsoOrNull: string | null | undefined, days: number): string {
  const base = fromIsoOrNull?.trim()
    ? new Date(fromIsoOrNull)
    : new Date();
  if (Number.isNaN(base.getTime())) {
    const n = new Date();
    n.setUTCDate(n.getUTCDate() + days);
    return n.toISOString();
  }
  const d = new Date(base.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}
