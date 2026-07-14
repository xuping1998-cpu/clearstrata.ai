import {
  matterStatusToWorkspaceStage,
  workspaceStageLabel,
  type WorkspaceLifecycleStage,
} from '@/lib/community/governanceLifecycleModel';
import { TIMELINE_STAGES, timelineStageIndex } from '@/lib/community/governanceHubLifecycle';
import {
  lifecyclePillClassName,
  lifecyclePresentation,
  workspaceStageToLifecycleToken,
} from '@/lib/community/governanceLifecyclePresentation';
import type { GovernanceMatterStatus } from '@/lib/community/governanceMatterModel';

export type GovernanceLifecycleTimelineProps = {
  status: GovernanceMatterStatus;
  langEn: boolean;
  compact?: boolean;
};

export function GovernanceLifecycleTimeline({ status, langEn, compact = false }: GovernanceLifecycleTimelineProps) {
  const en = langEn;
  const current = matterStatusToWorkspaceStage(status);
  const currentIdx = timelineStageIndex(current === 'execution' ? 'archived' : current);

  const displayStages = TIMELINE_STAGES.filter((s) => s !== 'archived' || current === 'archived');

  return (
    <nav
      className={compact ? 'overflow-x-auto' : ''}
      aria-label={en ? 'Governance lifecycle' : '治理生命周期'}
    >
      <ol
        className={`flex items-center gap-1 ${compact ? 'min-w-max pb-1' : 'flex-wrap gap-y-2'}`}
      >
        {displayStages.map((stage, index) => {
          const stageIdx = timelineStageIndex(stage);
          const isComplete = stageIdx < currentIdx;
          const isCurrent = stageIdx === currentIdx;
          const sizeClass = compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
          const token = workspaceStageToLifecycleToken(stage as WorkspaceLifecycleStage);
          const pillState = isCurrent ? 'current' : isComplete ? 'complete' : 'future';

          return (
            <li key={stage} className="flex items-center gap-1">
              <span
                className={lifecyclePillClassName(token, pillState, sizeClass)}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {isComplete && !isCurrent ? '✓ ' : ''}
                {workspaceStageLabel(stage, en)}
              </span>
              {index < displayStages.length - 1 ? (
                <span
                  className={`text-xs ${isComplete ? lifecyclePresentation(token).textClass : 'text-gray-300'}`}
                  aria-hidden
                >
                  →
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
