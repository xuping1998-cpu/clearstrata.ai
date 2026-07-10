import {
  matterStatusToWorkspaceStage,
  nextConstitutionalStep,
  type WorkspaceLifecycleStage,
} from '@/lib/community/governanceLifecycleModel';
import {
  daysUntilIso,
  formatOpenUntil,
  governanceMatterCategoryLabel,
  governanceMatterStatusLabel,
  type GovernanceMatterDashboardRow,
  type GovernanceMatterRow,
} from '@/lib/community/governanceMatterModel';

/** Lifecycle stages shown in Governance Hub feed (GP-006 / UIP-001). */
export const HUB_LIFECYCLE_STAGES = [
  'discussion',
  'consultation',
  'resolution',
  'meeting',
  'voting',
  'archive',
] as const;

export type HubLifecycleStage = (typeof HUB_LIFECYCLE_STAGES)[number];

export function matterToHubLifecycleStage(matter: GovernanceMatterRow): HubLifecycleStage {
  const stage = matterStatusToWorkspaceStage(matter.status);
  if (stage === 'consultation') return 'consultation';
  if (stage === 'resolution') return 'resolution';
  if (stage === 'meeting') return 'meeting';
  if (stage === 'voting') return 'voting';
  if (stage === 'archived' || stage === 'execution') return 'archive';
  return 'discussion';
}

export function hubLifecycleStageLabel(stage: HubLifecycleStage, langEn: boolean): string {
  const en: Record<HubLifecycleStage, string> = {
    discussion: 'Discussion',
    consultation: 'Public Consultation',
    resolution: 'Community Resolution',
    meeting: 'Scheduled Meeting',
    voting: 'Voting',
    archive: 'Archive',
  };
  const zh: Record<HubLifecycleStage, string> = {
    discussion: '讨论中',
    consultation: '公开征求意见',
    resolution: '社区决议',
    meeting: '已排会议',
    voting: '投票中',
    archive: '已归档',
  };
  return langEn ? en[stage] : zh[stage];
}

export function hubLifecycleEmptyLabel(stage: HubLifecycleStage, langEn: boolean): string {
  return langEn
    ? 'No governance matters are currently in this stage.'
    : '当前阶段暂无治理事项。';
}

export function partitionMattersByHubStage<T extends GovernanceMatterRow>(
  matters: T[],
): Record<HubLifecycleStage, T[]> {
  const buckets = Object.fromEntries(
    HUB_LIFECYCLE_STAGES.map((s) => [s, [] as T[]]),
  ) as Record<HubLifecycleStage, T[]>;

  for (const matter of matters) {
    if (matter.status === 'draft') continue;
    buckets[matterToHubLifecycleStage(matter)].push(matter);
  }

  return buckets;
}

export type MatterCardMeta = {
  stageLabel: string;
  categoryLabel: string;
  commentLine: string | null;
  nextStep: string;
  lastUpdated: string;
  hasResolution: boolean;
  hasMeeting: boolean;
  hasVoting: boolean;
};

export function buildMatterCardMeta(
  matter: GovernanceMatterDashboardRow,
  langEn: boolean,
): MatterCardMeta {
  const en = langEn;
  const stage = matterToHubLifecycleStage(matter);
  const wsStage = matterStatusToWorkspaceStage(matter.status);
  const remainingDays = daysUntilIso(matter.discussion_deadline);

  const commentParts: string[] = [];
  if (matter.comment_count > 0) {
    commentParts.push(en ? `${matter.comment_count} comments` : `${matter.comment_count} 条评论`);
  }
  if (stage === 'consultation' && matter.discussion_deadline) {
    commentParts.push(formatOpenUntil(matter.discussion_deadline, en));
  } else if (remainingDays != null && remainingDays >= 0) {
    commentParts.push(en ? `${remainingDays} days remaining` : `剩余 ${remainingDays} 天`);
  }

  const hasResolution = Boolean(matter.resolution_id);
  const hasMeeting = Boolean(matter.meeting_id);
  const hasVoting = Boolean(matter.voting_id);

  const nextStep = nextConstitutionalStep({
    stage: wsStage,
    hasResolution,
    hasMeeting,
    hasVoting,
    langEn: en,
  });

  return {
    stageLabel: governanceMatterStatusLabel(matter.status, en),
    categoryLabel: governanceMatterCategoryLabel(matter.category, en),
    commentLine: commentParts.length ? commentParts.join(' · ') : null,
    nextStep,
    lastUpdated: new Date(matter.last_revision_at).toLocaleString(),
    hasResolution,
    hasMeeting,
    hasVoting,
  };
}

export type CouncilPriorityItem = {
  id: string;
  labelEn: string;
  labelZh: string;
  count: number;
  matterId: string | null;
  matterTitle: string | null;
};

export function computeCouncilPriorityActions(
  matters: GovernanceMatterDashboardRow[],
): CouncilPriorityItem[] {
  const active = matters.filter((m) => m.status !== 'archived' && m.status !== 'draft');

  const pick = (list: GovernanceMatterDashboardRow[]) =>
    list.length > 0 ? list[0]! : null;

  const discussions = active.filter((m) => m.status === 'discussion');
  const cdaCandidates = active.filter((m) =>
    ['discussion', 'public_consultation'].includes(m.status),
  );
  const resolutionCandidates = active.filter(
    (m) =>
      !m.resolution_id &&
      ['discussion', 'public_consultation', 'resolution_draft', 'council_review'].includes(m.status),
  );
  const meetingCandidates = active.filter((m) => m.resolution_id && !m.meeting_id);
  const votingCandidates = active.filter((m) => m.meeting_id && !m.voting_id);

  const items: CouncilPriorityItem[] = [];

  if (discussions.length) {
    const m = pick(discussions);
    items.push({
      id: 'review-discussions',
      labelEn: `Review ${discussions.length} active discussion${discussions.length === 1 ? '' : 's'}`,
      labelZh: `审议 ${discussions.length} 项进行中的讨论`,
      count: discussions.length,
      matterId: m?.id ?? null,
      matterTitle: m?.title ?? null,
    });
  }

  if (cdaCandidates.length) {
    const m = pick(cdaCandidates);
    items.push({
      id: 'generate-cda',
      labelEn: `Generate CDA for ${cdaCandidates.length} matter${cdaCandidates.length === 1 ? '' : 's'}`,
      labelZh: `为 ${cdaCandidates.length} 项事项生成议事助手报告`,
      count: cdaCandidates.length,
      matterId: m?.id ?? null,
      matterTitle: m?.title ?? null,
    });
  }

  if (resolutionCandidates.length) {
    const m = pick(resolutionCandidates);
    items.push({
      id: 'prepare-resolution',
      labelEn: `Prepare ${resolutionCandidates.length} Resolution${resolutionCandidates.length === 1 ? '' : 's'}`,
      labelZh: `准备 ${resolutionCandidates.length} 项社区决议`,
      count: resolutionCandidates.length,
      matterId: m?.id ?? null,
      matterTitle: m?.title ?? null,
    });
  }

  if (meetingCandidates.length) {
    const m = pick(meetingCandidates);
    items.push({
      id: 'schedule-meeting',
      labelEn: `Schedule ${meetingCandidates.length} Meeting${meetingCandidates.length === 1 ? '' : 's'}`,
      labelZh: `为 ${meetingCandidates.length} 项事项排定会议`,
      count: meetingCandidates.length,
      matterId: m?.id ?? null,
      matterTitle: m?.title ?? null,
    });
  }

  if (votingCandidates.length) {
    const m = pick(votingCandidates);
    items.push({
      id: 'open-voting',
      labelEn: `Open Voting for ${votingCandidates.length} approved item${votingCandidates.length === 1 ? '' : 's'}`,
      labelZh: `为 ${votingCandidates.length} 项已批准事项开放投票`,
      count: votingCandidates.length,
      matterId: m?.id ?? null,
      matterTitle: m?.title ?? null,
    });
  }

  return items;
}

/** Map workspace stage to timeline index for UIP-005 visualization. */
export const TIMELINE_STAGES: WorkspaceLifecycleStage[] = [
  'discussion',
  'consultation',
  'resolution',
  'meeting',
  'voting',
  'archived',
];

export function timelineStageIndex(stage: WorkspaceLifecycleStage): number {
  const idx = TIMELINE_STAGES.indexOf(stage);
  return idx >= 0 ? idx : 0;
}
