import type { CockpitMetrics, GovernanceCockpitAction, GovernanceCockpitActionType } from '@/lib/community/governanceCockpitPriority';
import { cockpitActionButtonLabel } from '@/lib/community/governanceCockpitPriority';

export type GovernanceCockpitPanelProps = {
  langEn: boolean;
  metrics: CockpitMetrics;
  actions: GovernanceCockpitAction[];
  onQueueAction: (matterId: string, actionType: GovernanceCockpitActionType) => void;
};

export function GovernanceCockpitPanel({
  langEn,
  metrics,
  actions,
  onQueueAction,
}: GovernanceCockpitPanelProps) {
  const en = langEn;

  const urgentActions = actions.filter((a) => a.isUrgent);
  const primaryMetrics = [
    { label: en ? "Today's Actions" : '今日行动', value: metrics.todaysActions },
    { label: en ? 'Deadlines' : '临近截止', value: metrics.deadlinesApproaching },
    { label: en ? 'Awaiting CDA' : '等待 CDA', value: metrics.awaitingCda },
    { label: en ? 'Awaiting Resolution' : '等待决议', value: metrics.awaitingResolution },
  ].filter((m) => m.value > 0);

  const secondaryMetrics = [
    { label: en ? 'Awaiting Meeting' : '等待会议', value: metrics.awaitingMeeting },
    { label: en ? 'Awaiting Voting' : '等待投票', value: metrics.awaitingVoting },
  ].filter((m) => m.value > 0);

  return (
    <aside className="flex flex-col rounded-xl border border-gray-200 bg-white p-3 shadow-sm lg:p-4">
      <header className="border-b border-gray-100 pb-2">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-800">
          {en ? 'Governance Cockpit' : '治理驾驶舱'}
        </p>
        <p className="text-[11px] text-gray-500">
          {en ? "Today's actions and next steps" : '今日行动与下一步'}
        </p>
      </header>

      <p className="mt-3 text-xs font-bold text-gray-900 lg:hidden">
        {en
          ? `${metrics.todaysActions} action${metrics.todaysActions === 1 ? '' : 's'} pending`
          : `${metrics.todaysActions} 项待办`}
        {metrics.deadlinesApproaching > 0
          ? en
            ? ` · ${metrics.deadlinesApproaching} deadline approaching`
            : ` · ${metrics.deadlinesApproaching} 项临近截止`
          : ''}
      </p>

      <p className="mt-3 text-xs font-bold text-gray-900">
        {en ? "Today's Action Queue" : '今日行动队列'}
      </p>

      {actions.length === 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-gray-500">
          {en ? 'No governance actions are pending today.' : '今日暂无待办治理事项。'}
          <span className="mt-1 block">
            {en
              ? 'All active matters have been advanced to their appropriate current stage.'
              : '所有进行中的事项均已推进至当前应有阶段。'}
          </span>
        </p>
      ) : (
        <ol className="mt-2 space-y-2">
          {actions.map((action, index) => (
            <li
              key={`${action.matterId}-${action.actionType}`}
              className="rounded-lg border border-gray-100 px-3 py-2"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                {index + 1}. {en ? action.titleEn : action.titleZh}
              </p>
              <p className="mt-0.5 line-clamp-2 text-sm font-bold text-gray-900">{action.matterTitle}</p>
              <p className="mt-1 text-xs text-gray-500">{en ? action.reasonEn : action.reasonZh}</p>
              <button
                type="button"
                onClick={() => onQueueAction(action.matterId, action.actionType)}
                className="mt-2 rounded-lg bg-clearstrata-ui-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-clearstrata-ui-primaryHover"
              >
                {cockpitActionButtonLabel(action.actionType, en)}
              </button>
            </li>
          ))}
        </ol>
      )}

      {urgentActions.length > 0 ? (
        <div className="mt-4 border-t border-gray-100 pt-3">
          <p className="text-xs font-bold text-amber-800">{en ? 'Deadline warnings' : '截止提醒'}</p>
          <ul className="mt-1.5 space-y-1">
            {urgentActions.slice(0, 3).map((a) => (
              <li key={`urgent-${a.matterId}`} className="text-xs text-amber-900">
                {a.matterTitle}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {primaryMetrics.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
          {primaryMetrics.map((m) => (
            <MetricChip key={m.label} label={m.label} value={m.value} />
          ))}
        </div>
      ) : null}

      {secondaryMetrics.length > 0 ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-[11px] font-semibold text-gray-500">
            {en ? 'More metrics' : '更多指标'}
          </summary>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {secondaryMetrics.map((m) => (
              <MetricChip key={m.label} label={m.label} value={m.value} />
            ))}
          </div>
        </details>
      ) : null}

      <p className="mt-4 hidden text-[10px] leading-snug text-gray-400 lg:block">
        {en
          ? 'Clarity comes from making the important information impossible to miss.'
          : '清晰，是因为最重要的信息不会再被错过。'}
      </p>
    </aside>
  );
}

function MetricChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-gray-50 px-2 py-1 text-[10px]">
      <span className="text-gray-500">{label}</span>
      <span className="ml-1 font-bold text-gray-900">{value}</span>
    </div>
  );
}
