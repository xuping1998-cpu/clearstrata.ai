import type { MeetingFormat, MeetingRow, MeetingStatus, MeetingType, VoteRule, VoteStatus } from './api';
import { getWrittenRemoteV3DisplayStatus, meetingFormatUiFromRow, type WrittenRemoteV3OvLite } from './meetingFormatModel';

const meetingTypeZh: Record<MeetingType, string> = {
  agm: 'AGM',
  sgm: 'SGM',
  council: '业委会',
};

const meetingTypeEn: Record<MeetingType, string> = {
  agm: 'AGM',
  sgm: 'SGM',
  council: 'Council',
};

const formatZh: Record<MeetingFormat, string> = {
  in_person: '线下会议',
  electronic: '实时远程会议',
  hybrid: '远程书面会议',
};

const formatEn: Record<MeetingFormat, string> = {
  in_person: 'In-person',
  electronic: 'Live Remote',
  hybrid: 'Remote Written Meeting',
};

const statusZh: Record<MeetingStatus, string> = {
  draft: '草稿',
  scheduled: '进行中',
  open: '进行中',
  closed: '已结束',
  archived: '已归档',
};

const statusEn: Record<MeetingStatus, string> = {
  draft: 'Draft',
  scheduled: 'Active',
  open: 'Active',
  closed: 'Closed',
  archived: 'Archived',
};

const voteRuleZh: Record<VoteRule, string> = {
  simple_majority: '简单多数',
  three_quarter: '3/4多数',
  unanimous: '一致同意',
};

const voteRuleEn: Record<VoteRule, string> = {
  simple_majority: 'Simple majority',
  three_quarter: 'Three-quarters',
  unanimous: 'Unanimous',
};

const voteStatusZh: Record<VoteStatus, string> = {
  draft: '草稿',
  open: '投票中',
  closed: '已关闭',
  passed: '通过',
  failed: '未通过',
};

const voteStatusEn: Record<VoteStatus, string> = {
  draft: 'Draft',
  open: 'Open',
  closed: 'Closed',
  passed: 'Passed',
  failed: 'Failed',
};

export function labelMeetingType(t: string, en: boolean): string {
  const k = t as MeetingType;
  if (k in meetingTypeZh) return en ? meetingTypeEn[k] : meetingTypeZh[k];
  return t;
}

export function labelFormat(
  fmt: string,
  en: boolean,
  _extras?: { descriptionZh?: string | null },
): string {
  const k = fmt as MeetingFormat;
  if (k in formatZh) return en ? formatEn[k] : formatZh[k];
  return fmt;
}

/** User-facing meeting format (two buckets); uses `meetingFormatUiFromRow` — DB column + written-remote meta. */
export type MeetingFormatUiDisplay = {
  primary: string;
  /** Hybrid / live-remote / in-person bucket only; null for written-remote. */
  secondary: string | null;
};

export function labelMeetingFormatUiDisplay(
  row: Pick<MeetingRow, 'meeting_format' | 'description_zh'>,
  languageEn: boolean,
): MeetingFormatUiDisplay {
  const ui = meetingFormatUiFromRow(row);
  if (ui === 'written_remote') {
    return {
      primary: languageEn ? 'Remote Written Meeting (Recommended)' : '远程书面会议（推荐）',
      secondary: null,
    };
  }
  return {
    primary: languageEn ? 'Hybrid Meeting' : '混合会议',
    secondary: languageEn
      ? 'Attend at a fixed time, in person, by Zoom, or both.'
      : '固定时间参加（现场或 Zoom，或并行）',
  };
}

export function labelMeetingFormatUiPrimary(
  row: Pick<MeetingRow, 'meeting_format' | 'description_zh'>,
  languageEn: boolean,
): string {
  return labelMeetingFormatUiDisplay(row, languageEn).primary;
}

export function labelStatus(t: string, en: boolean): string {
  const k = t as MeetingStatus;
  if (k in statusZh) return en ? statusEn[k] : statusZh[k];
  return t;
}

/** List/detail badge: V3 formal vote status from OV snapshot + status; legacy uses DB status. */
export function labelMeetingDisplayStatus(
  meeting: Pick<MeetingRow, 'status' | 'description_zh' | 'scheduled_at'>,
  en: boolean,
  ov?: WrittenRemoteV3OvLite | null,
): string {
  const v3Status = getWrittenRemoteV3DisplayStatus(meeting, ov);
  if (v3Status === 'draft') return en ? 'Not open yet' : '未开启';
  if (v3Status === 'waiting_freeze') return en ? 'Waiting for voter roll freeze' : '等待冻结';
  if (v3Status === 'open') return en ? 'Voting Open' : '投票中';
  if (v3Status === 'closed') return en ? 'Closed' : '已结束';
  return labelStatus(meeting.status, en);
}

export function labelVoteRule(t: string, en: boolean): string {
  const k = t as VoteRule;
  if (k in voteRuleZh) return en ? voteRuleEn[k] : voteRuleZh[k];
  return t;
}

export function labelVoteStatus(t: string, en: boolean): string {
  const k = t as VoteStatus;
  if (k in voteStatusZh) return en ? voteStatusEn[k] : voteStatusZh[k];
  return t;
}

export const meetingUiStrings = {
  sectionInfo: { zh: '会议信息', en: 'Meeting info' },
  sectionAgenda: { zh: '议程与投票', en: 'Agenda & voting' },
  sectionInvite: { zh: '邀请与通知', en: 'Invitations & notice' },
  notFound: { zh: '未找到该会议', en: 'Meeting not found' },
  untitled: { zh: '未命名会议', en: 'Untitled meeting' },
  format: { zh: '会议形式', en: 'Format' },
  voteRule: { zh: '投票规则', en: 'Vote rule' },
} as const;
