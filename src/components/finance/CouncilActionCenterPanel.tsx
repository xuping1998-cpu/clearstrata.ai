import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, CalendarDays, Loader2, Map, ShoppingCart, Users } from 'lucide-react';
import { CouncilActionDetailDrawer } from './CouncilActionDetailDrawer';
import {
  actionTypeLabel,
  listCouncilActions,
  priorityLabel,
  statusLabel,
  summarizeCouncilActions,
  type CouncilAction,
  type CouncilActionPriority,
  type CouncilActionStatus,
} from '../../features/finance/councilActionsApi';
import { mappingHref, procurementNewJobHref } from '../../features/finance/councilActionWorkflowApi';
import { alertTypeLabel } from '../../features/finance/budgetRiskAlertsApi';

type Props = {
  propertyId: string;
  fiscalYear: number;
  en: boolean;
  canManage: boolean;
  roleInProperty: string | null;
  staffType: string | null;
  refreshKey?: number;
};

function statusBadgeClass(status: CouncilActionStatus): string {
  if (status === 'completed') return 'bg-emerald-100 text-emerald-900';
  if (status === 'in_progress') return 'bg-sky-100 text-sky-900';
  if (status === 'dismissed') return 'bg-gray-100 text-gray-700';
  return 'bg-amber-100 text-amber-900';
}

function priorityBadgeClass(priority: CouncilActionPriority): string {
  if (priority === 'critical') return 'bg-red-100 text-red-900';
  if (priority === 'high') return 'bg-orange-100 text-orange-900';
  if (priority === 'low') return 'bg-gray-100 text-gray-700';
  return 'bg-violet-100 text-violet-900';
}

export function CouncilActionCenterPanel({
  propertyId,
  fiscalYear,
  en,
  canManage,
  roleInProperty,
  staffType,
  refreshKey = 0,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CouncilAction[]>([]);
  const [selected, setSelected] = useState<CouncilAction | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const actions = await listCouncilActions(propertyId);
    setRows(actions);
    setLoading(false);
  }, [propertyId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const summary = useMemo(() => summarizeCouncilActions(rows), [rows]);
  const today = new Date().toISOString().slice(0, 10);

  if (loading) {
    return (
      <section className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-500 shadow-sm">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        {en ? 'Loading council actions…' : '正在加载业委会行动…'}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-base font-semibold text-gray-900">
          {en ? 'Council Action Center' : '业委会行动中心'}
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          {en
            ? 'Assignment, discussion, execution, and audit trail for budget risk follow-ups.'
            : '预算风险跟进的分配、讨论、执行与审计留痕。'}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2">
          <div className="text-xs font-medium text-amber-800">{en ? 'Open' : '待处理'}</div>
          <div className="mt-0.5 text-lg font-bold tabular-nums text-amber-900">{summary.openCount}</div>
        </div>
        <div className="rounded-xl border border-sky-100 bg-sky-50/50 px-3 py-2">
          <div className="text-xs font-medium text-sky-800">{en ? 'In Progress' : '进行中'}</div>
          <div className="mt-0.5 text-lg font-bold tabular-nums text-sky-900">
            {summary.inProgressCount}
          </div>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2">
          <div className="text-xs font-medium text-emerald-800">{en ? 'Completed' : '已完成'}</div>
          <div className="mt-0.5 text-lg font-bold tabular-nums text-emerald-900">
            {summary.completedCount}
          </div>
        </div>
        <div className="rounded-xl border border-red-100 bg-red-50/50 px-3 py-2">
          <div className="text-xs font-medium text-red-800">{en ? 'Overdue' : '已逾期'}</div>
          <div className="mt-0.5 text-lg font-bold tabular-nums text-red-900">
            {summary.overdueCount}
          </div>
        </div>
        <div className="rounded-xl border border-violet-100 bg-violet-50/50 px-3 py-2 col-span-2 sm:col-span-1">
          <div className="text-xs font-medium text-violet-800">
            {en ? 'Completion Rate' : '完成率'}
          </div>
          <div className="mt-0.5 text-lg font-bold tabular-nums text-violet-900">
            {summary.completionRate == null ? '—' : `${summary.completionRate.toFixed(1)}%`}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50/40 p-3">
        <h4 className="text-sm font-semibold text-violet-950">
          {en ? 'Suggested actions' : '建议操作'}
        </h4>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link
            to={mappingHref()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-900 hover:bg-violet-50"
          >
            <Map className="size-3.5" aria-hidden />
            {en ? 'Open Mapping' : '打开科目映射'}
          </Link>
          <Link
            to={procurementNewJobHref(null)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-900 hover:bg-violet-50"
          >
            <ShoppingCart className="size-3.5" aria-hidden />
            {en ? 'Create Procurement Request' : '创建采购授权'}
          </Link>
          <Link
            to="/meetings"
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-900 hover:bg-violet-50"
          >
            <CalendarDays className="size-3.5" aria-hidden />
            {en ? 'Create Council Discussion' : '创建业委会讨论'}
          </Link>
          <Link
            to="/manager-tasks"
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-900 hover:bg-violet-50"
          >
            <Briefcase className="size-3.5" aria-hidden />
            {en ? 'Assign Manager' : '分配物业经理'}
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          {en
            ? 'No council actions yet. Create one from a budget risk alert above.'
            : '暂无业委会行动。请从上方预算风险预警创建。'}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                <th className="px-2 py-2 font-medium">{en ? 'Status' : '状态'}</th>
                <th className="px-2 py-2 font-medium">{en ? 'Priority' : '优先级'}</th>
                <th className="px-2 py-2 font-medium">{en ? 'Title' : '标题'}</th>
                <th className="px-2 py-2 font-medium">{en ? 'Source Alert' : '来源预警'}</th>
                <th className="px-2 py-2 font-medium">{en ? 'Assignee' : '负责人'}</th>
                <th className="px-2 py-2 font-medium">{en ? 'Due Date' : '截止日期'}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const overdue =
                  (row.status === 'open' || row.status === 'in_progress') &&
                  row.due_date != null &&
                  row.due_date < today;
                return (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-b border-gray-100 hover:bg-sky-50/50"
                    onClick={() => setSelected(row)}
                  >
                    <td className="px-2 py-2.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(row.status)}`}
                      >
                        {statusLabel(row.status, en)}
                      </span>
                    </td>
                    <td className="px-2 py-2.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${priorityBadgeClass(row.priority)}`}
                      >
                        {priorityLabel(row.priority, en)}
                      </span>
                    </td>
                    <td className="max-w-[10rem] px-2 py-2.5 font-medium text-gray-900">
                      {row.title}
                    </td>
                    <td className="px-2 py-2.5 text-gray-700">
                      {row.alert_type
                        ? alertTypeLabel(
                            row.alert_type as Parameters<typeof alertTypeLabel>[0],
                            en,
                          )
                        : '—'}
                    </td>
                    <td className="px-2 py-2.5 text-gray-700">
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3.5 text-gray-400" aria-hidden />
                        {row.assignee_name ?? (en ? 'Unassigned' : '未分配')}
                      </span>
                    </td>
                    <td
                      className={`whitespace-nowrap px-2 py-2.5 tabular-nums ${overdue ? 'font-semibold text-red-700' : 'text-gray-700'}`}
                    >
                      {row.due_date ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected ? (
        <CouncilActionDetailDrawer
          action={selected}
          fiscalYear={fiscalYear}
          en={en}
          roleInProperty={roleInProperty}
          staffType={staffType}
          onClose={() => setSelected(null)}
          onUpdated={() => {
            void (async () => {
              const actions = await listCouncilActions(propertyId);
              setRows(actions);
              setSelected((prev) => actions.find((r) => r.id === prev?.id) ?? null);
            })();
          }}
        />
      ) : null}
    </section>
  );
}
