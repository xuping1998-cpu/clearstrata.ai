import type { GovernanceMatterStatus } from '@/lib/community/governanceMatterModel';

export const WORKSPACE_LIFECYCLE_STAGES = [
  'draft',
  'discussion',
  'consultation',
  'resolution',
  'meeting',
  'voting',
  'execution',
  'archived',
] as const;

export type WorkspaceLifecycleStage = (typeof WORKSPACE_LIFECYCLE_STAGES)[number];

export function matterStatusToWorkspaceStage(status: GovernanceMatterStatus): WorkspaceLifecycleStage {
  switch (status) {
    case 'draft':
      return 'draft';
    case 'discussion':
      return 'discussion';
    case 'public_consultation':
      return 'consultation';
    case 'resolution_draft':
    case 'council_review':
      return 'resolution';
    case 'meeting':
      return 'meeting';
    case 'voting':
      return 'voting';
    case 'decision':
    case 'execution':
      return 'execution';
    case 'archived':
      return 'archived';
    default:
      return 'discussion';
  }
}

export function workspaceStageLabel(stage: WorkspaceLifecycleStage, langEn: boolean): string {
  const en: Record<WorkspaceLifecycleStage, string> = {
    draft: 'Draft',
    discussion: 'Discussion',
    consultation: 'Consultation',
    resolution: 'Resolution',
    meeting: 'Scheduled Meeting',
    voting: 'Voting',
    execution: 'Execution',
    archived: 'Archive',
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
  return langEn ? en[stage] : zh[stage];
}

export type NextStepInput = {
  stage: WorkspaceLifecycleStage;
  hasResolution: boolean;
  hasMeeting: boolean;
  hasVoting: boolean;
  langEn: boolean;
};

export function nextConstitutionalStep(input: NextStepInput): string {
  const { stage, hasResolution, hasMeeting, hasVoting, langEn } = input;
  if (stage === 'archived') {
    return langEn ? 'Recorded in Community Memory' : '已记入社区记忆';
  }
  if (stage === 'draft') {
    return langEn ? 'Publish for community deliberation' : '发布以开始社区议事';
  }
  if ((stage === 'discussion' || stage === 'consultation') && !hasResolution) {
    return langEn ? 'Generate CDA report; prepare resolution when ready' : '生成议事助手报告；就绪后准备决议';
  }
  if (hasResolution && !hasMeeting) {
    return langEn ? 'Schedule meeting linked to resolution' : '安排与决议关联的会议';
  }
  if (!hasResolution && stage !== 'meeting') {
    return langEn ? 'Create Community Resolution from discussion' : '基于讨论创建社区决议';
  }
  if (!hasMeeting) {
    return langEn ? 'Schedule meeting linked to resolution' : '安排与决议关联的会议';
  }
  if (!hasVoting) {
    return langEn ? 'Open voting when meeting is ready' : '会议就绪后开放投票';
  }
  if (stage === 'voting') {
    return langEn ? 'Await vote outcome; then execute decision' : '等待投票结果；随后执行决定';
  }
  return langEn ? 'Execute and archive to Community Memory' : '执行并归档至社区记忆';
}
