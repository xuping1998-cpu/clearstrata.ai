import type { MeetingFormat, MeetingStatus, MeetingType, VoteRule, VoteStatus } from './api';

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
  in_person: '线下',
  electronic: '线上',
  hybrid: '混合',
};

const formatEn: Record<MeetingFormat, string> = {
  in_person: 'In person',
  electronic: 'Electronic',
  hybrid: 'Hybrid',
};

const statusZh: Record<MeetingStatus, string> = {
  draft: '草稿',
  scheduled: '已安排',
  open: '投票中',
  closed: '已关闭',
  archived: '已归档',
};

const statusEn: Record<MeetingStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  open: 'Open',
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

export function labelFormat(t: string, en: boolean): string {
  const k = t as MeetingFormat;
  if (k in formatZh) return en ? formatEn[k] : formatZh[k];
  return t;
}

export function labelStatus(t: string, en: boolean): string {
  const k = t as MeetingStatus;
  if (k in statusZh) return en ? statusEn[k] : statusZh[k];
  return t;
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
