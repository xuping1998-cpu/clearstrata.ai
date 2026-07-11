import {
  matterStatusToWorkspaceStage,
  workspaceStageLabel,
  type WorkspaceLifecycleStage,
} from '@/lib/community/governanceLifecycleModel';
import type { GovernanceMatterCategory, GovernanceMatterStatus } from '@/lib/community/governanceMatterModel';

export const COCKPIT_TIMELINE_STAGES = [
  'discussion',
  'consultation',
  'cda',
  'resolution',
  'meeting',
  'voting',
  'execution',
  'archived',
] as const;

export type CockpitTimelineStage = (typeof COCKPIT_TIMELINE_STAGES)[number];

export type CockpitLifecycleTimelineProps = {
  status: GovernanceMatterStatus;
  category: GovernanceMatterCategory;
  hasCdaReport: boolean;
  langEn: boolean;
  compact?: boolean;
};

function cockpitStageLabel(stage: CockpitTimelineStage, langEn: boolean): string {
  if (stage === 'cda') return langEn ? 'CDA' : '议事助手';
  return workspaceStageLabel(stage as WorkspaceLifecycleStage, langEn);
}

function resolveCurrentCockpitIndex(status: GovernanceMatterStatus, hasCdaReport: boolean): number {
  const ws = matterStatusToWorkspaceStage(status);
  if (ws === 'archived') return COCKPIT_TIMELINE_STAGES.indexOf('archived');
  if (ws === 'execution') return COCKPIT_TIMELINE_STAGES.indexOf('execution');
  if (ws === 'voting') return COCKPIT_TIMELINE_STAGES.indexOf('voting');
  if (ws === 'meeting') return COCKPIT_TIMELINE_STAGES.indexOf('meeting');
  if (ws === 'resolution') return COCKPIT_TIMELINE_STAGES.indexOf('resolution');
  if (ws === 'consultation') {
    return hasCdaReport
      ? COCKPIT_TIMELINE_STAGES.indexOf('consultation')
      : COCKPIT_TIMELINE_STAGES.indexOf('cda');
  }
  if (ws === 'discussion') {
    return hasCdaReport
      ? COCKPIT_TIMELINE_STAGES.indexOf('discussion')
      : COCKPIT_TIMELINE_STAGES.indexOf('cda');
  }
  return 0;
}

function stageSymbol(
  isComplete: boolean,
  isCurrent: boolean,
  isCda: boolean,
  skipped: boolean,
): string {
  if (skipped) return '—';
  if (isComplete) return '✓';
  if (isCurrent && isCda) return '◇';
  if (isCurrent) return '●';
  return '○';
}

export function CockpitLifecycleTimeline({
  status,
  category,
  hasCdaReport,
  langEn,
  compact = false,
}: CockpitLifecycleTimelineProps) {
  const en = langEn;
  const currentIdx = resolveCurrentCockpitIndex(status, hasCdaReport);
  const agmNote =
    category === 'annual_general_meeting' || category === 'special_general_meeting'
      ? en
        ? 'AGM/SGM — applicability may vary by agenda item'
        : '大会事项 — 适用性因议程而异'
      : null;

  return (
    <div role="group" aria-label={en ? 'Governance lifecycle progress' : '治理生命周期进展'}>
      {agmNote ? <p className="mb-1.5 text-[10px] text-amber-700">{agmNote}</p> : null}
      <ol className={`flex items-center ${compact ? 'min-w-max gap-0.5 overflow-x-auto pb-0.5' : 'flex-wrap gap-1'}`}>
        {COCKPIT_TIMELINE_STAGES.map((stage, index) => {
          const isCda = stage === 'cda';
          const isComplete = index < currentIdx;
          const isCurrent = index === currentIdx;
          const skipped =
            isCda &&
            hasCdaReport &&
            currentIdx > COCKPIT_TIMELINE_STAGES.indexOf('cda') &&
            !isComplete &&
            !isCurrent;

          return (
            <li key={stage} className="flex items-center">
              <span
                className={stepClass({ isCda, isComplete, isCurrent, skipped, compact })}
                aria-current={isCurrent ? 'step' : undefined}
                title={isCda ? (en ? 'Advisory checkpoint' : '辅助检查点') : undefined}
              >
                <span className="mr-0.5 font-mono text-[10px]" aria-hidden>
                  {stageSymbol(isComplete, isCurrent, isCda, skipped)}
                </span>
                {cockpitStageLabel(stage, en)}
              </span>
              {index < COCKPIT_TIMELINE_STAGES.length - 1 ? (
                <span className="mx-0.5 text-[10px] text-gray-300" aria-hidden>
                  →
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function stepClass({
  isCda,
  isComplete,
  isCurrent,
  skipped,
  compact,
}: {
  isCda: boolean;
  isComplete: boolean;
  isCurrent: boolean;
  skipped: boolean;
  compact: boolean;
}): string {
  const base = `inline-flex items-center rounded-md px-1.5 py-0.5 ${compact ? 'text-[10px]' : 'text-xs'} `;

  if (skipped) {
    return `${base}text-gray-400 line-through`;
  }
  if (isCda && isCurrent) {
    return `${base}font-semibold text-indigo-900 ring-1 ring-dashed ring-indigo-300 bg-indigo-50/50`;
  }
  if (isCda && isComplete) {
    return `${base}font-medium text-indigo-800`;
  }
  if (isCda) {
    return `${base}text-indigo-300`;
  }
  if (isCurrent) {
    return `${base}font-bold text-emerald-900 ring-2 ring-emerald-500/40 bg-emerald-50`;
  }
  if (isComplete) {
    return `${base}font-medium text-emerald-800`;
  }
  return `${base}text-gray-400`;
}
