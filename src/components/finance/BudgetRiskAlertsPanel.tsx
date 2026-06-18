import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { formatCurrency } from '../../lib/budget/dashboardApi';
import {
  alertRowKey,
  alertTypeLabel,
  fetchAlertDetailInvoices,
  fetchAlertDetailTransactions,
  listBudgetRiskAlerts,
  recommendedActions,
  summarizeBudgetRiskAlertsRows,
  type BudgetRiskAlert,
  type BudgetRiskAlertSeverity,
} from '../../features/finance/budgetRiskAlertsApi';
import {
  createCouncilActionFromAlert,
  openActionKey,
  listOpenActionKeys,
} from '../../features/finance/councilActionsApi';
import type { MappedExpenseInvoice } from '../../features/finance/budgetVarianceApi';
import type { MappedRevenueTransaction } from '../../features/finance/revenueReconciliationApi';

type Props = {
  propertyId: string;
  fiscalYear: number;
  en: boolean;
  canManage?: boolean;
  onActionCreated?: () => void;
};

function severityEmoji(severity: BudgetRiskAlertSeverity): string {
  if (severity === 'critical') return '🔴';
  if (severity === 'warning') return '🟡';
  return '🔵';
}

function severityLabel(severity: BudgetRiskAlertSeverity, en: boolean): string {
  if (severity === 'critical') return en ? 'Critical' : '严重';
  if (severity === 'warning') return en ? 'Warning' : '警告';
  return en ? 'Info' : '提示';
}

function severityBadgeClass(severity: BudgetRiskAlertSeverity): string {
  if (severity === 'critical') return 'bg-red-100 text-red-900';
  if (severity === 'warning') return 'bg-amber-100 text-amber-900';
  return 'bg-sky-100 text-sky-900';
}

function isExpenseAlert(type: BudgetRiskAlert['alert_type']): boolean {
  return (
    type === 'EXPENSE_OVER_BUDGET' ||
    type === 'EXPENSE_NEAR_LIMIT' ||
    type === 'UNMAPPED_EXPENSE'
  );
}

function isRevenueAlert(type: BudgetRiskAlert['alert_type']): boolean {
  return (
    type === 'REVENUE_COLLECTION_LOW' ||
    type === 'REVENUE_COLLECTION_CRITICAL' ||
    type === 'UNMAPPED_REVENUE'
  );
}

function AlertDetailDrawer({
  alert,
  invoices,
  transactions,
  loading,
  en,
  canManage,
  hasOpenAction,
  creatingAction,
  onCreateAction,
  onClose,
}: {
  alert: BudgetRiskAlert;
  invoices: MappedExpenseInvoice[];
  transactions: MappedRevenueTransaction[];
  loading: boolean;
  en: boolean;
  canManage: boolean;
  hasOpenAction: boolean;
  creatingAction: boolean;
  onCreateAction: () => void;
  onClose: () => void;
}) {
  const loc = en ? 'en' : 'zh';
  const actions = recommendedActions(alert, en);
  const title =
    alert.budget_category ??
    (en ? alertTypeLabel(alert.alert_type, true) : alertTypeLabel(alert.alert_type, false));
  const showBudgetActual =
    alert.alert_type !== 'UNMAPPED_EXPENSE' && alert.alert_type !== 'UNMAPPED_REVENUE';
  const showInvoices =
    alert.alert_type === 'UNMAPPED_EXPENSE' ||
    alert.alert_type === 'EXPENSE_OVER_BUDGET' ||
    alert.alert_type === 'EXPENSE_NEAR_LIMIT' ||
    (alert.alert_type === 'NO_ACTIVITY' && (loading || invoices.length > 0));
  const showTransactions =
    alert.alert_type === 'UNMAPPED_REVENUE' ||
    alert.alert_type === 'REVENUE_COLLECTION_LOW' ||
    alert.alert_type === 'REVENUE_COLLECTION_CRITICAL' ||
    (alert.alert_type === 'NO_ACTIVITY' && (loading || transactions.length > 0));
  const varianceLabel = isRevenueAlert(alert.alert_type)
    ? en
      ? 'Remaining'
      : '未收'
    : en
      ? 'Variance'
      : '差异';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        aria-label={en ? 'Close' : '关闭'}
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div>
            <h4 className="text-base font-semibold text-gray-900">{title}</h4>
            <p className="mt-0.5 text-xs text-gray-500">{alertTypeLabel(alert.alert_type, en)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-500 hover:bg-gray-100"
            aria-label={en ? 'Close' : '关闭'}
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        {showBudgetActual ? (
          <div className="grid grid-cols-3 gap-2 border-b border-gray-100 bg-gray-50 p-4 text-center text-xs">
            <div>
              <div className="text-gray-500">{en ? 'Budget' : '预算'}</div>
              <div className="mt-0.5 font-bold tabular-nums">
                {formatCurrency(alert.budget_amount, loc)}
              </div>
            </div>
            <div>
              <div className="text-gray-500">{en ? 'Actual' : '实际'}</div>
              <div className="mt-0.5 font-bold tabular-nums">
                {formatCurrency(alert.actual_amount, loc)}
              </div>
            </div>
            <div>
              <div className="text-gray-500">{varianceLabel}</div>
              <div
                className={`mt-0.5 font-bold tabular-nums ${
                  alert.variance_amount > 0 && isExpenseAlert(alert.alert_type)
                    ? 'text-red-700'
                    : ''
                }`}
              >
                {formatCurrency(Math.abs(alert.variance_amount), loc)}
              </div>
            </div>
          </div>
        ) : (
          <div className="border-b border-gray-100 bg-gray-50 p-4 text-sm">
            <div className="text-gray-500">{en ? 'Unmapped total' : '未映射合计'}</div>
            <div className="mt-0.5 text-lg font-bold tabular-nums text-amber-900">
              {formatCurrency(alert.actual_amount, loc)}
            </div>
            <div className="mt-1 text-xs text-gray-600">
              {en
                ? `${Math.round(alert.variance_amount)} item(s)`
                : `${Math.round(alert.variance_amount)} 笔`}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-sm text-gray-700">{alert.message}</p>

          {actions.length > 0 ? (
            <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50/60 p-3">
              <h5 className="text-sm font-semibold text-violet-950">
                {en ? 'Recommended Action' : '建议措施'}
              </h5>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-violet-900">
                {actions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {canManage ? (
            <div className="mt-4">
              <button
                type="button"
                disabled={creatingAction || hasOpenAction}
                onClick={onCreateAction}
                className="w-full rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creatingAction
                  ? en
                    ? 'Creating…'
                    : '创建中…'
                  : hasOpenAction
                    ? en
                      ? 'Action already open'
                      : '行动已存在'
                    : en
                      ? 'Create Action'
                      : '创建行动'}
              </button>
            </div>
          ) : null}

          {showInvoices ? (
            <>
              <h5 className="mt-4 text-sm font-semibold text-gray-800">
                {alert.alert_type === 'UNMAPPED_EXPENSE'
                  ? en
                    ? 'Unmapped invoices'
                    : '未映射发票'
                  : en
                    ? 'Mapped invoices'
                    : '已映射发票'}
              </h5>
              {loading ? (
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {en ? 'Loading…' : '加载中…'}
                </div>
              ) : invoices.length === 0 ? (
                <p className="mt-2 text-sm text-gray-500">
                  {en ? 'No invoices to show.' : '暂无发票。'}
                </p>
              ) : (
                <table className="mt-2 w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs text-gray-500">
                      <th className="py-1.5 font-medium">{en ? 'Invoice #' : '发票号'}</th>
                      <th className="py-1.5 font-medium">{en ? 'Vendor' : '供应商'}</th>
                      <th className="py-1.5 font-medium">{en ? 'Date' : '日期'}</th>
                      <th className="py-1.5 text-right font-medium">{en ? 'Amount' : '金额'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.invoice_id} className="border-b border-gray-100">
                        <td className="py-2 text-gray-800">{inv.invoice_number || '—'}</td>
                        <td className="max-w-[6rem] truncate py-2 text-gray-700" title={inv.vendor_name ?? ''}>
                          {inv.vendor_name || '—'}
                        </td>
                        <td className="whitespace-nowrap py-2 text-gray-600">
                          {inv.invoice_date ? inv.invoice_date.slice(0, 10) : '—'}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {formatCurrency(inv.total_amount, loc)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          ) : null}

          {showTransactions ? (
            <>
              <h5 className="mt-4 text-sm font-semibold text-gray-800">
                {alert.alert_type === 'UNMAPPED_REVENUE'
                  ? en
                    ? 'Unmapped bank credits'
                    : '未映射银行收入'
                  : en
                    ? 'Mapped transactions'
                    : '已映射银行流水'}
              </h5>
              {loading ? (
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {en ? 'Loading…' : '加载中…'}
                </div>
              ) : transactions.length === 0 ? (
                <p className="mt-2 text-sm text-gray-500">
                  {en ? 'No bank transactions to show.' : '暂无银行流水。'}
                </p>
              ) : (
                <table className="mt-2 w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs text-gray-500">
                      <th className="py-1.5 font-medium">{en ? 'Date' : '日期'}</th>
                      <th className="py-1.5 font-medium">{en ? 'Description' : '描述'}</th>
                      <th className="py-1.5 text-right font-medium">{en ? 'Amount' : '金额'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.bank_transaction_id} className="border-b border-gray-100">
                        <td className="whitespace-nowrap py-2 text-gray-600">
                          {tx.transaction_date ? tx.transaction_date.slice(0, 10) : '—'}
                        </td>
                        <td className="max-w-[10rem] truncate py-2 text-gray-800" title={tx.description ?? ''}>
                          {tx.description || '—'}
                        </td>
                        <td className="py-2 text-right tabular-nums text-emerald-800">
                          {formatCurrency(tx.amount, loc)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

export function BudgetRiskAlertsPanel({
  propertyId,
  fiscalYear,
  en,
  canManage = false,
  onActionCreated,
}: Props) {
  const loc = en ? 'en' : 'zh';
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<BudgetRiskAlert[]>([]);
  const [openActionKeys, setOpenActionKeys] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<BudgetRiskAlert | null>(null);
  const [drawerInvoices, setDrawerInvoices] = useState<MappedExpenseInvoice[]>([]);
  const [drawerTxs, setDrawerTxs] = useState<MappedRevenueTransaction[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [creatingKey, setCreatingKey] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [alerts, actionKeys] = await Promise.all([
      listBudgetRiskAlerts(propertyId, fiscalYear),
      listOpenActionKeys(propertyId),
    ]);
    setRows(alerts);
    setOpenActionKeys(actionKeys);
    setLoading(false);
  }, [propertyId, fiscalYear]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => summarizeBudgetRiskAlertsRows(rows), [rows]);

  const openDetail = async (alert: BudgetRiskAlert) => {
    setSelected(alert);
    setDrawerLoading(true);
    setDrawerInvoices([]);
    setDrawerTxs([]);
    const [invoices, transactions] = await Promise.all([
      fetchAlertDetailInvoices(propertyId, fiscalYear, alert),
      fetchAlertDetailTransactions(propertyId, fiscalYear, alert),
    ]);
    setDrawerInvoices(invoices);
    setDrawerTxs(transactions);
    setDrawerLoading(false);
  };

  const handleCreateAction = async (alert: BudgetRiskAlert) => {
    const key = alertRowKey(alert);
    setCreatingKey(key);
    setActionMessage(null);
    const { action, error, existing } = await createCouncilActionFromAlert(alert, en);
    setCreatingKey(null);
    if (error) {
      setActionMessage(error);
      return;
    }
    if (action) {
      setOpenActionKeys((prev) => {
        const next = new Set(prev);
        next.add(openActionKey(alert.alert_type, alert.budget_category));
        return next;
      });
      setActionMessage(
        existing
          ? en
            ? 'An open action already exists for this alert.'
            : '该预警已有进行中的行动。'
          : en
            ? 'Council action created.'
            : '业委会行动已创建。',
      );
      onActionCreated?.();
    }
  };

  if (loading) {
    return (
      <section className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-500 shadow-sm">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        {en ? 'Loading budget risk alerts…' : '正在加载预算风险预警…'}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-base font-semibold text-gray-900">
          {en ? 'Budget Risk Alerts' : '预算风险预警'}
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          {en
            ? 'Read-only alerts from expense variance, revenue reconciliation, and unmapped activity.'
            : '基于支出差异、收入对账与未映射数据的只读风险分析。'}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-red-100 bg-red-50/50 px-3 py-2">
          <div className="text-xs font-medium text-red-800">{en ? 'Critical' : '严重'}</div>
          <div className="mt-0.5 text-lg font-bold tabular-nums text-red-900">
            {summary.criticalCount}
          </div>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2">
          <div className="text-xs font-medium text-amber-800">{en ? 'Warning' : '警告'}</div>
          <div className="mt-0.5 text-lg font-bold tabular-nums text-amber-900">
            {summary.warningCount}
          </div>
        </div>
        <div className="rounded-xl border border-sky-100 bg-sky-50/50 px-3 py-2">
          <div className="text-xs font-medium text-sky-800">{en ? 'Info' : '提示'}</div>
          <div className="mt-0.5 text-lg font-bold tabular-nums text-sky-900">
            {summary.infoCount}
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
          <div className="text-xs font-medium text-gray-500">{en ? 'Total Alerts' : '预警总数'}</div>
          <div className="mt-0.5 text-lg font-bold tabular-nums text-gray-900">
            {summary.totalCount}
          </div>
        </div>
      </div>

      {actionMessage ? (
        <p className="mt-3 text-sm text-violet-800">{actionMessage}</p>
      ) : null}

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          {en ? 'No budget risk alerts for this fiscal year.' : '本财年暂无预算风险预警。'}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                <th className="px-2 py-2 font-medium">{en ? 'Level' : '等级'}</th>
                <th className="px-2 py-2 font-medium">{en ? 'Type' : '类型'}</th>
                <th className="px-2 py-2 font-medium">{en ? 'Category' : '科目'}</th>
                <th className="px-2 py-2 text-right font-medium">{en ? 'Budget' : '预算'}</th>
                <th className="px-2 py-2 text-right font-medium">{en ? 'Actual' : '实际'}</th>
                <th className="px-2 py-2 text-right font-medium">{en ? '%' : '百分比'}</th>
                <th className="px-2 py-2 font-medium">{en ? 'Message' : '说明'}</th>
                {canManage ? (
                  <th className="px-2 py-2 font-medium">{en ? 'Action' : '操作'}</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const rowKey = alertRowKey(row);
                const hasOpen = openActionKeys.has(
                  openActionKey(row.alert_type, row.budget_category),
                );
                return (
                  <tr
                    key={rowKey}
                    className="border-b border-gray-100 hover:bg-sky-50/50"
                  >
                    <td
                      className="cursor-pointer px-2 py-2.5"
                      onClick={() => void openDetail(row)}
                    >
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${severityBadgeClass(row.severity)}`}
                    >
                      <span aria-hidden>{severityEmoji(row.severity)}</span>
                      {severityLabel(row.severity, en)}
                    </span>
                    </td>
                    <td
                      className="cursor-pointer px-2 py-2.5 text-gray-800"
                      onClick={() => void openDetail(row)}
                    >
                      {alertTypeLabel(row.alert_type, en)}
                    </td>
                    <td
                      className="cursor-pointer px-2 py-2.5 font-medium text-gray-900"
                      onClick={() => void openDetail(row)}
                    >
                      {row.budget_category ?? '—'}
                    </td>
                    <td
                      className="cursor-pointer px-2 py-2.5 text-right tabular-nums"
                      onClick={() => void openDetail(row)}
                    >
                      {row.budget_amount > 0 ? formatCurrency(row.budget_amount, loc) : '—'}
                    </td>
                    <td
                      className="cursor-pointer px-2 py-2.5 text-right tabular-nums"
                      onClick={() => void openDetail(row)}
                    >
                      {formatCurrency(row.actual_amount, loc)}
                    </td>
                    <td
                      className="cursor-pointer px-2 py-2.5 text-right tabular-nums text-gray-700"
                      onClick={() => void openDetail(row)}
                    >
                      {row.percent_value == null ? '—' : `${row.percent_value.toFixed(1)}%`}
                    </td>
                    <td
                      className="max-w-[12rem] cursor-pointer px-2 py-2.5 text-gray-700"
                      onClick={() => void openDetail(row)}
                    >
                      {row.message}
                    </td>
                    {canManage ? (
                      <td className="px-2 py-2.5">
                        <button
                          type="button"
                          disabled={hasOpen || creatingKey === rowKey}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleCreateAction(row);
                          }}
                          className="whitespace-nowrap rounded-lg bg-violet-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {creatingKey === rowKey
                            ? en
                              ? '…'
                              : '…'
                            : hasOpen
                              ? en
                                ? 'Open'
                                : '进行中'
                              : en
                                ? 'Create Action'
                                : '创建行动'}
                        </button>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected ? (
        <AlertDetailDrawer
          alert={selected}
          invoices={drawerInvoices}
          transactions={drawerTxs}
          loading={drawerLoading}
          en={en}
          canManage={canManage}
          hasOpenAction={openActionKeys.has(
            openActionKey(selected.alert_type, selected.budget_category),
          )}
          creatingAction={creatingKey === alertRowKey(selected)}
          onCreateAction={() => void handleCreateAction(selected)}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </section>
  );
}
