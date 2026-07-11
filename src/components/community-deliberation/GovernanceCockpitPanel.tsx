import type { CockpitMetrics, GovernanceCockpitAction, GovernanceCockpitActionType } from '@/lib/community/governanceCockpitPriority';
import { cockpitActionButtonLabel } from '@/lib/community/governanceCockpitPriority';

export type GovernanceCockpitPanelProps = {
  langEn: boolean;
  metrics: CockpitMetrics;
  actions: GovernanceCockpitAction[];
  onSelectMatter: (matterId: string) => void;
  onQueueAction: (matterId: string, actionType: GovernanceCockpitActionType) => void;
};

export function GovernanceCockpitPanel({
  langEn,
  metrics,
  actions,
  onSelectMatter,
  onQueueAction,
}: GovernanceCockpitPanelProps) {
  const en = langEn;

  return (
    <aside className="flex flex-col rounded-xl border border-emerald-200 bg-gradient-to-b from-emerald-50/50 to-white p-4 shadow-sm">
      <header>
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-950">
          {en ? 'Governance Cockpit' : '治理驾驶舱'}
        </p>
        <p className="mt-0.5 text-[11px] text-emerald-900/90">
          {en ? "Today's actions and next steps" : '今日行动与下一步'}
        </p>
      </header>

      <div className="mt-3 grid grid-cols-2 gap-1.5 text-[10px]">
        <MetricChip label={en ? "Today's Actions" : '今日行动'} value={metrics.todaysActions} />
        <MetricChip label={en ? 'Deadlines' : '临近截止'} value={metrics.deadlinesApproaching} />
        <MetricChip label={en ? 'Awaiting CDA' : '等待 CDA'} value={metrics.awaitingCda} />
        <MetricChip label={en ? 'Awaiting Resolution' : '等待决议'} value={metrics.awaitingResolution} />
        <MetricChip label={en ? 'Awaiting Meeting' : '等待会议'} value={metrics.awaitingMeeting} />
        <MetricChip label={en ? 'Awaiting Voting' : '等待投票'} value={metrics.awaitingVoting} />
      </div>

      <p className="mt-4 text-xs font-bold text-gray-900">
        {en ? "Today's Action Queue" : '今日行动队列'}
      </p>

      {actions.length === 0 ? (
        <div className="mt-2 rounded-lg border border-gray-100 bg-white/80 px-3 py-3 text-xs leading-relaxed text-gray-600">
          <p>{en ? 'No governance actions are pending today.' : '今日暂无待办治理事项。'}</p>
          <p className="mt-1">
            {en
              ? 'All active matters have been advanced to their appropriate current stage.'
              : '所有进行中的事项均已推进至当前应有阶段。'}
          </p>
        </div>
      ) : (
        <ul className="mt-2 space-y-2">
          {actions.map((action) => (
            <li
              key={`${action.matterId}-${action.actionType}`}
              className="rounded-lg border border-emerald-100 bg-white px-3 py-2.5 shadow-sm"
            >
              <p className="text-xs font-bold text-gray-900">
                {en ? action.titleEn : action.titleZh}
              </p>
              <p className="mt-0.5 line-clamp-1 text-sm font-semibold text-emerald-950">
                {action.matterTitle}
              </p>
              <p className="mt-0.5 text-[11px] text-gray-600">
                {en ? action.reasonEn : action.reasonZh}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onQueueAction(action.matterId, action.actionType)}
                  className="rounded-lg bg-clearstrata-ui-primary px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-clearstrata-ui-primaryHover"
                >
                  {cockpitActionButtonLabel(action.actionType, en)}
                </button>
                <button
                  type="button"
                  onClick={() => onSelectMatter(action.matterId)}
                  className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-800 hover:bg-gray-50"
                >
                  {en ? 'Open Matter' : '打开事项'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-[10px] leading-snug text-gray-500">
        {en
          ? 'A cockpit shows what must be done next — not merely where to look.'
          : '驾驶舱主动告诉使用者，下一步必须完成什么。'}
      </p>
    </aside>
  );
}

function MetricChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-white/80 px-2 py-1.5 ring-1 ring-emerald-100">
      <p className="text-gray-600">{label}</p>
      <p className="font-bold text-emerald-950">{value}</p>
    </div>
  );
}
