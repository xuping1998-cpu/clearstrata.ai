import {
  matterStatusToWorkspaceStage,
  workspaceStageLabel,
  type WorkspaceLifecycleStage,
} from '@/lib/community/governanceLifecycleModel';
import { TIMELINE_STAGES, timelineStageIndex } from '@/lib/community/governanceHubLifecycle';
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
          const isFuture = stageIdx > currentIdx;

          return (
            <li key={stage} className="flex items-center gap-1">
              <StagePill
                stage={stage}
                langEn={en}
                isComplete={isComplete}
                isCurrent={isCurrent}
                isFuture={isFuture}
                compact={compact}
              />
              {index < displayStages.length - 1 ? (
                <span
                  className={`text-xs ${isComplete ? 'text-emerald-500' : 'text-gray-300'}`}
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

function StagePill({
  stage,
  langEn,
  isComplete,
  isCurrent,
  isFuture,
  compact,
}: {
  stage: WorkspaceLifecycleStage;
  langEn: boolean;
  isComplete: boolean;
  isCurrent: boolean;
  isFuture: boolean;
  compact: boolean;
}) {
  const label = workspaceStageLabel(stage, langEn);
  const base = compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  let cls = 'rounded-full font-semibold border ';
  if (isCurrent) {
    cls += 'border-clearstrata-ui-primary bg-clearstrata-ui-primary text-white shadow-sm';
  } else if (isComplete) {
    cls += 'border-emerald-300 bg-emerald-50 text-emerald-900';
  } else {
    cls += 'border-gray-200 bg-gray-50 text-gray-400';
  }

  return (
    <span className={`${base} ${cls}`} aria-current={isCurrent ? 'step' : undefined}>
      {isComplete && !isCurrent ? '✓ ' : ''}
      {label}
    </span>
  );
}
