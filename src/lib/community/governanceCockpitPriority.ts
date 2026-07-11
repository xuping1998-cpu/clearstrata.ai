import { daysUntilIso } from '@/lib/community/governanceMatterModel';
import {
  matterStatusToWorkspaceStage,
  type WorkspaceLifecycleStage,
} from '@/lib/community/governanceLifecycleModel';
import type { GovernanceMatterDashboardRow } from '@/lib/community/governanceMatterModel';

export type GovernanceCockpitActionType =
  | 'review_discussion'
  | 'generate_cda'
  | 'prepare_resolution'
  | 'schedule_meeting'
  | 'open_voting'
  | 'archive';

export type GovernanceCockpitAction = {
  matterId: string;
  matterTitle: string;
  actionType: GovernanceCockpitActionType;
  priority: number;
  titleEn: string;
  titleZh: string;
  reasonEn: string;
  reasonZh: string;
  isUrgent?: boolean;
};

export type CockpitMetrics = {
  todaysActions: number;
  deadlinesApproaching: number;
  awaitingCda: number;
  awaitingResolution: number;
  awaitingMeeting: number;
  awaitingVoting: number;
};

export type CockpitMatterContext = {
  hasCdaReport: boolean;
};

const ACTION_PRIORITY: Record<GovernanceCockpitActionType, number> = {
  review_discussion: 20,
  generate_cda: 30,
  prepare_resolution: 40,
  schedule_meeting: 50,
  open_voting: 60,
  archive: 70,
};

function isDeadlineUrgent(matter: GovernanceMatterDashboardRow): boolean {
  const days = daysUntilIso(matter.discussion_deadline);
  return days != null && days <= 2;
}

function urgencyBoost(matter: GovernanceMatterDashboardRow): number {
  const days = daysUntilIso(matter.discussion_deadline);
  if (days != null && days < 0) return 0;
  if (days != null && days <= 2) return -15;
  if (days != null && days <= 7) return -5;
  return 0;
}

function inferPendingAction(
  matter: GovernanceMatterDashboardRow,
  ctx: CockpitMatterContext,
): GovernanceCockpitAction | null {
  const status = matter.status;
  const hasResolution = Boolean(matter.resolution_id);
  const hasMeeting = Boolean(matter.meeting_id);
  const hasVoting = Boolean(matter.voting_id);

  if (status === 'archived') return null;

  if (status === 'decision' || status === 'execution') {
    return {
      matterId: matter.id,
      matterTitle: matter.title,
      actionType: 'archive',
      priority: ACTION_PRIORITY.archive,
      titleEn: 'Archive matter',
      titleZh: '归档事项',
      reasonEn: 'Voting closed — ready for Community Memory',
      reasonZh: '投票已结束 — 可归档至社区记忆',
    };
  }

  if (hasMeeting && !hasVoting && (status === 'meeting' || status === 'voting')) {
    return {
      matterId: matter.id,
      matterTitle: matter.title,
      actionType: 'open_voting',
      priority: ACTION_PRIORITY.open_voting,
      titleEn: 'Open voting',
      titleZh: '开放投票',
      reasonEn: 'Meeting linked; voting not open',
      reasonZh: '会议已关联；投票尚未开放',
    };
  }

  if (hasResolution && !hasMeeting) {
    return {
      matterId: matter.id,
      matterTitle: matter.title,
      actionType: 'schedule_meeting',
      priority: ACTION_PRIORITY.schedule_meeting,
      titleEn: 'Schedule meeting',
      titleZh: '排定会议',
      reasonEn: 'Resolution ready for meeting',
      reasonZh: '决议已就绪，待排会议',
    };
  }

  if (
    !hasResolution &&
    ['discussion', 'public_consultation', 'resolution_draft', 'council_review'].includes(status)
  ) {
    const commentHint =
      matter.comment_count > 0
        ? enReason(matter.comment_count)
        : { en: 'Discussion in progress', zh: '讨论进行中' };

    if (['discussion', 'public_consultation'].includes(status) && matter.comment_count > 0) {
      return {
        matterId: matter.id,
        matterTitle: matter.title,
        actionType: 'prepare_resolution',
        priority: ACTION_PRIORITY.prepare_resolution,
        titleEn: 'Prepare Community Resolution',
        titleZh: '准备社区决议',
        reasonEn: 'Discussion has comments and no Resolution',
        reasonZh: '讨论已有评论，尚未准备决议',
      };
    }

    if (!hasResolution && ['resolution_draft', 'council_review'].includes(status)) {
      return {
        matterId: matter.id,
        matterTitle: matter.title,
        actionType: 'prepare_resolution',
        priority: ACTION_PRIORITY.prepare_resolution,
        titleEn: 'Prepare Community Resolution',
        titleZh: '准备社区决议',
        reasonEn: 'Resolution draft in progress',
        reasonZh: '决议草案进行中',
      };
    }

    if (status === 'discussion') {
      return {
        matterId: matter.id,
        matterTitle: matter.title,
        actionType: 'review_discussion',
        priority: ACTION_PRIORITY.review_discussion,
        titleEn: 'Review discussion',
        titleZh: '审议讨论',
        reasonEn: commentHint.en,
        reasonZh: commentHint.zh,
      };
    }
  }

  if (
    ['discussion', 'public_consultation'].includes(status) &&
    !ctx.hasCdaReport
  ) {
    const commentReason =
      matter.comment_count > 0
        ? {
            en: `${matter.comment_count} comment${matter.comment_count === 1 ? '' : 's'} — no latest analysis yet`,
            zh: `已有 ${matter.comment_count} 条评论，尚无最新分析`,
          }
        : { en: 'No current CDA report', zh: '尚无议事助手报告' };
    return {
      matterId: matter.id,
      matterTitle: matter.title,
      actionType: 'generate_cda',
      priority: ACTION_PRIORITY.generate_cda,
      titleEn: 'Generate CDA report',
      titleZh: '生成 CDA 报告',
      reasonEn: commentReason.en,
      reasonZh: commentReason.zh,
    };
  }

  if (status === 'public_consultation') {
    return {
      matterId: matter.id,
      matterTitle: matter.title,
      actionType: 'review_discussion',
      priority: ACTION_PRIORITY.review_discussion,
      titleEn: 'Review consultation',
      titleZh: '审议征求意见',
      reasonEn: 'Public consultation open',
      reasonZh: '公开征求意见进行中',
    };
  }

  return null;
}

function enReason(count: number): { en: string; zh: string } {
  return {
    en: `${count} owner comment${count === 1 ? '' : 's'} recorded`,
    zh: `已有 ${count} 条业主评论`,
  };
}

export function buildGovernanceCockpitActions(
  matters: GovernanceMatterDashboardRow[],
  cdaByMatterId: Record<string, boolean>,
): GovernanceCockpitAction[] {
  const active = matters.filter((m) => m.status !== 'archived');

  const actions: GovernanceCockpitAction[] = [];

  for (const matter of active) {
    const pending = inferPendingAction(matter, {
      hasCdaReport: cdaByMatterId[matter.id] ?? false,
    });
    if (!pending) continue;

    const boost = urgencyBoost(matter);
    const deadlineBoost = isDeadlineUrgent(matter) ? -10 : 0;
    actions.push({
      ...pending,
      priority: pending.priority + boost + deadlineBoost,
      isUrgent: isDeadlineUrgent(matter),
    });
  }

  return actions.sort((a, b) => a.priority - b.priority || a.matterTitle.localeCompare(b.matterTitle));
}

export function computeCockpitMetrics(
  matters: GovernanceMatterDashboardRow[],
  actions: GovernanceCockpitAction[],
  cdaByMatterId: Record<string, boolean>,
): CockpitMetrics {
  const active = matters.filter((m) => m.status !== 'archived' && m.status !== 'draft');

  return {
    todaysActions: actions.length,
    deadlinesApproaching: active.filter((m) => isDeadlineUrgent(m)).length,
    awaitingCda: active.filter(
      (m) =>
        ['discussion', 'public_consultation'].includes(m.status) && !cdaByMatterId[m.id],
    ).length,
    awaitingResolution: active.filter((m) => !m.resolution_id && m.status !== 'draft').length,
    awaitingMeeting: active.filter((m) => m.resolution_id && !m.meeting_id).length,
    awaitingVoting: active.filter((m) => m.meeting_id && !m.voting_id).length,
  };
}

export const PIPELINE_FILTERS: Array<WorkspaceLifecycleStage | 'all'> = [
  'all',
  'draft',
  'discussion',
  'consultation',
  'resolution',
  'meeting',
  'voting',
  'execution',
  'archived',
];

export function pipelineFilterLabel(
  filter: WorkspaceLifecycleStage | 'all',
  langEn: boolean,
): string {
  if (filter === 'all') return langEn ? 'All' : '全部';
  const en: Record<WorkspaceLifecycleStage, string> = {
    draft: 'Draft',
    discussion: 'Discussion',
    consultation: 'Consultation',
    resolution: 'Resolution',
    meeting: 'Scheduled Meeting',
    voting: 'Voting',
    execution: 'Execution',
    archived: 'Archived',
  };
  const zh: Record<WorkspaceLifecycleStage, string> = {
    draft: '草稿',
    discussion: '讨论',
    consultation: '征求意见',
    resolution: '决议',
    meeting: '已排会议',
    voting: '投票中',
    execution: '执行',
    archived: '已归档',
  };
  return langEn ? en[filter] : zh[filter];
}

export function matterMatchesPipelineFilter(
  matter: GovernanceMatterDashboardRow,
  filter: WorkspaceLifecycleStage | 'all',
): boolean {
  if (filter === 'all') return true;
  return matterStatusToWorkspaceStage(matter.status) === filter;
}

export function countMattersForPipelineFilter(
  matters: GovernanceMatterDashboardRow[],
  filter: WorkspaceLifecycleStage | 'all',
): number {
  if (filter === 'all') return matters.length;
  return matters.filter((m) => matterMatchesPipelineFilter(m, filter)).length;
}

export function cockpitActionButtonLabel(
  actionType: GovernanceCockpitActionType,
  langEn: boolean,
): string {
  const en: Record<GovernanceCockpitActionType, string> = {
    review_discussion: 'Continue discussion',
    generate_cda: 'Generate report',
    prepare_resolution: 'Prepare resolution',
    schedule_meeting: 'Schedule meeting',
    open_voting: 'Open voting',
    archive: 'Archive matter',
  };
  const zh: Record<GovernanceCockpitActionType, string> = {
    review_discussion: '继续讨论',
    generate_cda: '生成报告',
    prepare_resolution: '准备决议',
    schedule_meeting: '安排会议',
    open_voting: '开启投票',
    archive: '归档事项',
  };
  return langEn ? en[actionType] : zh[actionType];
}
