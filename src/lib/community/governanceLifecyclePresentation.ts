import type { WorkspaceLifecycleStage } from '@/lib/community/governanceLifecycleModel';
import type { GovernanceTimelinePhase } from '@/lib/community/governanceTimelineModel';
import { MOTION_PROGRESS } from '@/lib/ui/motionClasses';

export type GovernanceLifecycleToken =
  | 'draft'
  | 'discussion'
  | 'consultation'
  | 'cda'
  | 'resolution'
  | 'meeting'
  | 'voting'
  | 'execution'
  | 'archived'
  | 'danger';

export type GovernanceLifecyclePresentation = {
  token: GovernanceLifecycleToken;
  labelEn: string;
  labelZh: string;
  textClass: string;
  backgroundClass: string;
  borderClass: string;
  accentClass: string;
  solidBackgroundClass: string;
  solidTextClass: string;
  progressClass: string;
  advisory?: boolean;
};

const BASE: Record<GovernanceLifecycleToken, Omit<GovernanceLifecyclePresentation, 'token'>> = {
  draft: {
    labelEn: 'Draft',
    labelZh: '草稿',
    textClass: 'text-clearstrata-lifecycle-draft-text',
    backgroundClass: 'bg-clearstrata-lifecycle-draft-surface',
    borderClass: 'border-clearstrata-lifecycle-draft-border',
    accentClass: 'bg-clearstrata-lifecycle-draft-accent',
    solidBackgroundClass: 'bg-clearstrata-lifecycle-draft-accent',
    solidTextClass: 'text-white',
    progressClass: 'bg-clearstrata-lifecycle-draft-accent',
  },
  discussion: {
    labelEn: 'Discussion',
    labelZh: '讨论',
    textClass: 'text-clearstrata-lifecycle-discussion-text',
    backgroundClass: 'bg-clearstrata-lifecycle-discussion-surface',
    borderClass: 'border-clearstrata-lifecycle-discussion-border',
    accentClass: 'bg-clearstrata-lifecycle-discussion-accent',
    solidBackgroundClass: 'bg-clearstrata-lifecycle-discussion-accent',
    solidTextClass: 'text-white',
    progressClass: 'bg-clearstrata-lifecycle-discussion-accent',
  },
  consultation: {
    labelEn: 'Consultation',
    labelZh: '征求意见',
    textClass: 'text-clearstrata-lifecycle-consultation-text',
    backgroundClass: 'bg-clearstrata-lifecycle-consultation-surface',
    borderClass: 'border-clearstrata-lifecycle-consultation-border',
    accentClass: 'bg-clearstrata-lifecycle-consultation-accent',
    solidBackgroundClass: 'bg-clearstrata-lifecycle-consultation-accent',
    solidTextClass: 'text-white',
    progressClass: 'bg-clearstrata-lifecycle-consultation-accent',
  },
  cda: {
    labelEn: 'CDA',
    labelZh: '议事助手',
    textClass: 'text-clearstrata-lifecycle-cda-text',
    backgroundClass: 'bg-clearstrata-lifecycle-cda-surface',
    borderClass: 'border-clearstrata-lifecycle-cda-border',
    accentClass: 'bg-clearstrata-lifecycle-cda-accent',
    solidBackgroundClass: 'bg-clearstrata-lifecycle-cda-accent',
    solidTextClass: 'text-white',
    progressClass: 'bg-clearstrata-lifecycle-cda-accent',
    advisory: true,
  },
  resolution: {
    labelEn: 'Resolution',
    labelZh: '决议',
    textClass: 'text-clearstrata-lifecycle-resolution-text',
    backgroundClass: 'bg-clearstrata-lifecycle-resolution-surface',
    borderClass: 'border-clearstrata-lifecycle-resolution-border',
    accentClass: 'bg-clearstrata-lifecycle-resolution-accent',
    solidBackgroundClass: 'bg-clearstrata-lifecycle-resolution-accent',
    solidTextClass: 'text-white',
    progressClass: 'bg-clearstrata-lifecycle-resolution-accent',
  },
  meeting: {
    labelEn: 'Meeting',
    labelZh: '会议',
    textClass: 'text-clearstrata-lifecycle-meeting-text',
    backgroundClass: 'bg-clearstrata-lifecycle-meeting-surface',
    borderClass: 'border-clearstrata-lifecycle-meeting-border',
    accentClass: 'bg-clearstrata-lifecycle-meeting-accent',
    solidBackgroundClass: 'bg-clearstrata-lifecycle-meeting-accent',
    solidTextClass: 'text-white',
    progressClass: 'bg-clearstrata-lifecycle-meeting-accent',
  },
  voting: {
    labelEn: 'Voting',
    labelZh: '投票',
    textClass: 'text-clearstrata-lifecycle-voting-text',
    backgroundClass: 'bg-clearstrata-lifecycle-voting-surface',
    borderClass: 'border-clearstrata-lifecycle-voting-border',
    accentClass: 'bg-clearstrata-lifecycle-voting-accent',
    solidBackgroundClass: 'bg-clearstrata-lifecycle-voting-accent',
    solidTextClass: 'text-white',
    progressClass: 'bg-clearstrata-lifecycle-voting-accent',
  },
  execution: {
    labelEn: 'Execution',
    labelZh: '执行',
    textClass: 'text-clearstrata-lifecycle-execution-text',
    backgroundClass: 'bg-clearstrata-lifecycle-execution-surface',
    borderClass: 'border-clearstrata-lifecycle-execution-border',
    accentClass: 'bg-clearstrata-lifecycle-execution-accent',
    solidBackgroundClass: 'bg-clearstrata-lifecycle-execution-accent',
    solidTextClass: 'text-white',
    progressClass: 'bg-clearstrata-lifecycle-execution-accent',
  },
  archived: {
    labelEn: 'Archived',
    labelZh: '已归档',
    textClass: 'text-clearstrata-lifecycle-archived-text',
    backgroundClass: 'bg-clearstrata-lifecycle-archived-surface',
    borderClass: 'border-clearstrata-lifecycle-archived-border',
    accentClass: 'bg-clearstrata-lifecycle-archived-accent',
    solidBackgroundClass: 'bg-clearstrata-lifecycle-archived-accent',
    solidTextClass: 'text-white',
    progressClass: 'bg-clearstrata-lifecycle-archived-accent',
  },
  danger: {
    labelEn: 'At risk',
    labelZh: '风险',
    textClass: 'text-clearstrata-lifecycle-danger-text',
    backgroundClass: 'bg-clearstrata-lifecycle-danger-surface',
    borderClass: 'border-clearstrata-lifecycle-danger-border',
    accentClass: 'bg-clearstrata-lifecycle-danger-accent',
    solidBackgroundClass: 'bg-clearstrata-lifecycle-danger-accent',
    solidTextClass: 'text-white',
    progressClass: 'bg-clearstrata-lifecycle-danger-accent',
  },
};

export function lifecyclePresentation(token: GovernanceLifecycleToken): GovernanceLifecyclePresentation {
  return { token, ...BASE[token] };
}

export function workspaceStageToLifecycleToken(stage: WorkspaceLifecycleStage): GovernanceLifecycleToken {
  if (stage === 'archived') return 'archived';
  return stage;
}

export function cockpitStageToLifecycleToken(stage: string): GovernanceLifecycleToken {
  if (stage === 'cda') return 'cda';
  if (stage === 'archived') return 'archived';
  if (stage in BASE) return stage as GovernanceLifecycleToken;
  return 'discussion';
}

export function timelinePhaseToLifecycleToken(phase: GovernanceTimelinePhase): GovernanceLifecycleToken {
  if (phase === 'archive') return 'archived';
  return phase;
}

export type LifecyclePillState = 'current' | 'complete' | 'future' | 'advisory-current' | 'skipped';

export function lifecyclePillClassName(
  token: GovernanceLifecycleToken,
  state: LifecyclePillState,
  extra?: string,
): string {
  const p = lifecyclePresentation(token);
  const base = `rounded-full border font-semibold ${MOTION_PROGRESS}`;

  if (state === 'skipped') {
    return [base, 'border-gray-200 text-gray-400 line-through', extra].filter(Boolean).join(' ');
  }
  if (state === 'advisory-current' || (state === 'current' && p.advisory)) {
    return [
      base,
      p.borderClass,
      p.backgroundClass,
      p.textClass,
      'ring-1 ring-dashed ring-indigo-300',
      extra,
    ]
      .filter(Boolean)
      .join(' ');
  }
  if (state === 'current') {
    return [base, p.solidBackgroundClass, p.solidTextClass, 'border-transparent shadow-sm', extra]
      .filter(Boolean)
      .join(' ');
  }
  if (state === 'complete') {
    return [base, p.borderClass, p.backgroundClass, p.textClass, extra].filter(Boolean).join(' ');
  }
  return [base, 'border-gray-200 bg-gray-50 text-gray-400', extra].filter(Boolean).join(' ');
}
