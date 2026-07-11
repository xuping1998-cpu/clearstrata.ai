import {
  matterStatusToWorkspaceStage,
  workspaceStageLabel,
  type WorkspaceLifecycleStage,
} from '@/lib/community/governanceLifecycleModel';
import type { GovernanceMatterCategory, GovernanceMatterStatus } from '@/lib/community/governanceMatterModel';

/** Cockpit lifecycle includes CDA as advisory checkpoint (UIP-011). */
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
  if (stage === 'cda') {
    return langEn ? 'CDA' : '议事助手';
  }
  return workspaceStageLabel(stage as WorkspaceLifecycleStage, langEn);
}

function resolveCurrentCockpitIndex(
  status: GovernanceMatterStatus,
  hasCdaReport: boolean,
): number {
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

function agmApplicabilityLabel(category: GovernanceMatterCategory, langEn: boolean): string | null {
  if (category !== 'annual_general_meeting' && category !== 'special_general_meeting') {
    return null;
  }
  return langEn
    ? 'AGM/SGM — deliberation applicability varies by agenda item'
    : '大会事项 — 议事适用性因议程而异';
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
  const agmNote = agmApplicabilityLabel(category, en);

  return (
    <div>
      {agmNote ? <p className="mb-2 text-[11px] text-amber-800">{agmNote}</p> : null}
      <nav aria-label={en ? 'Governance lifecycle' : '治理生命周期'} className={compact ? 'overflow-x-auto' : ''}>
        <ol className={`flex items-center gap-1 ${compact ? 'min-w-max pb-1' : 'flex-wrap gap-y-2'}`}>
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
              <li key={stage} className="flex items-center gap-1">
                <span
                  className={pillClass({ isCda, isComplete, isCurrent, skipped, compact })}
                  aria-current={isCurrent ? 'step' : undefined}
                  title={
                    isCda
                      ? en
                        ? 'Advisory — AI assists, people decide'
                        : '辅助阶段 — AI 协助，人做决定'
                      : undefined
                  }
                >
                  {isComplete && !isCurrent ? '✓ ' : ''}
                  {cockpitStageLabel(stage, en)}
                </span>
                {index < COCKPIT_TIMELINE_STAGES.length - 1 ? (
                  <span className={`text-xs ${isComplete ? 'text-emerald-500' : 'text-gray-300'}`} aria-hidden>
                    →
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}

function pillClass({
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
  const base = compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  let cls = `rounded-full font-semibold border ${base} `;

  if (skipped) {
    return `${cls}border-dashed border-gray-200 bg-gray-50 text-gray-400 line-through`;
  }

  if (isCda) {
    if (isCurrent) {
      return `${cls}border-indigo-400 border-dashed bg-indigo-50 text-indigo-900`;
    }
    if (isComplete) {
      return `${cls}border-indigo-200 bg-indigo-50/80 text-indigo-800`;
    }
    return `${cls}border-dashed border-indigo-100 bg-white text-indigo-300`;
  }

  if (isCurrent) {
    return `${cls}border-clearstrata-ui-primary bg-clearstrata-ui-primary text-white shadow-sm`;
  }
  if (isComplete) {
    return `${cls}border-emerald-300 bg-emerald-50 text-emerald-900`;
  }
  return `${cls}border-gray-200 bg-gray-50 text-gray-400`;
}
