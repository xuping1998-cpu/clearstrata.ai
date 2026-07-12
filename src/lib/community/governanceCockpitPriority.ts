import type {
  CockpitMetrics,
  GovernanceBriefLine,
  GovernanceCockpitAction,
  GovernanceCockpitActionType,
  GovernanceHealth,
  MatterIntelligence,
} from '@/lib/community/governanceIntelligence';
import { buildGovernanceIntelligenceBundle } from '@/lib/community/governanceIntelligence';
import {
  matterStatusToWorkspaceStage,
  type WorkspaceLifecycleStage,
} from '@/lib/community/governanceLifecycleModel';
import type { GovernanceMatterDashboardRow } from '@/lib/community/governanceMatterModel';

export type {
  CockpitMetrics,
  GovernanceBriefLine,
  GovernanceCockpitAction,
  GovernanceCockpitActionType,
  GovernanceHealth,
  MatterIntelligence,
};

export type CockpitMatterContext = {
  hasCdaReport: boolean;
};

export function buildGovernanceCockpitActions(
  matters: GovernanceMatterDashboardRow[],
  cdaByMatterId: Record<string, boolean>,
): GovernanceCockpitAction[] {
  return buildGovernanceIntelligenceBundle(matters, cdaByMatterId).actions;
}

export function computeCockpitMetrics(
  matters: GovernanceMatterDashboardRow[],
  _actions: GovernanceCockpitAction[],
  cdaByMatterId: Record<string, boolean>,
): CockpitMetrics {
  return buildGovernanceIntelligenceBundle(matters, cdaByMatterId).metrics;
}

export { buildGovernanceIntelligenceBundle } from '@/lib/community/governanceIntelligence';

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
    archive: 'Publish result',
  };
  const zh: Record<GovernanceCockpitActionType, string> = {
    review_discussion: '继续讨论',
    generate_cda: '生成报告',
    prepare_resolution: '准备决议',
    schedule_meeting: '安排会议',
    open_voting: '开启投票',
    archive: '公布结果',
  };
  return langEn ? en[actionType] : zh[actionType];
}
