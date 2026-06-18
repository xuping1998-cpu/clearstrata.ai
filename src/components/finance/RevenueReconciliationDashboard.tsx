import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { formatCurrency } from '../../lib/budget/dashboardApi';
import {
  countActiveRevenueMappings,
  countRevenueBudgetLines,
  fetchMappedRevenueTransactions,
  listRevenueReconciliation,
  summarizeRevenueReconciliationRows,
  type MappedRevenueTransaction,
  type RevenueReconciliationRow,
  type RevenueReconciliationStatus,
} from '../../features/finance/revenueReconciliationApi';

type Props = {
  propertyId: string;
  fiscalYear: number;
  en: boolean;
};

type EmptyReason = 'no_budget' | 'no_mapping' | 'no_transactions' | null;

function statusLabel(status: RevenueReconciliationStatus, en: boolean): string {
  if (status === 'complete') return en ? 'Complete' : '已收齐';
  if (status === 'warning') return en ? 'Warning' : '接近';
  return en ? 'Normal' : '正常';
}

function statusBadgeClass(status: RevenueReconciliationStatus): string {
  if (status === 'complete') return 'bg-sky-100 text-sky-900';
  if (status === 'warning') return 'bg-amber-100 text-amber-900';
  return 'bg-emerald-100 text-emerald-900';
}

function barColor(status: RevenueReconciliationStatus): string {
  if (status === 'complete') return 'bg-sky-500';
  if (status === 'warning') return 'bg-amber-400';
  return 'bg-emerald-500';
}

function CollectionBar({
  percent,
  status,
}: {
  percent: number | null;
  status: RevenueReconciliationStatus;
}) {
  const pct = percent ?? 0;
  const fill = Math.min(100, pct);
  const over = pct > 100;
  return (
    <div className="flex min-w-[7rem] items-center gap-2">
      <span className="w-10 shrink-0 text-right text-xs tabular-nums text-gray-600">
        {percent == null ? '—' : `${pct.toFixed(1)}%`}
      </span>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-[width] ${barColor(status)}`}
          style={{ width: `${over ? 100 : fill}%` }}
        />
        {over ? (
          <div className="absolute inset-y-0 right-0 w-1 rounded-r-full bg-sky-700" title="Over target" />
        ) : null}
      </div>
    </div>
  );
}

function CategoryDetailDrawer({
  row,
  transactions,
  loading,
  en,
  onClose,
}: {
  row: RevenueReconciliationRow;
  transactions: MappedRevenueTransaction[];
  loading: boolean;
  en: boolean;
  onClose: () => void;
}) {
  const loc = en ? 'en' : 'zh';
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
          <h4 className="text-base font-semibold text-gray-900">{row.category}</h4>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-500 hover:bg-gray-100"
            aria-label={en ? 'Close' : '关闭'}
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 border-b border-gray-100 bg-gray-50 p-4 text-center text-xs">
          <div>
            <div className="text-gray-500">{en ? 'Budget' : '预算'}</div>
            <div className="mt-0.5 font-bold tabular-nums">{formatCurrency(row.budget_amount, loc)}</div>
          </div>
          <div>
            <div className="text-gray-500">{en ? 'Actual' : '已收'}</div>
            <div className="mt-0.5 font-bold tabular-nums">{formatCurrency(row.actual_amount, loc)}</div>
          </div>
          <div>
            <div className="text-gray-500">{en ? 'Remaining' : '未收'}</div>
            <div className="mt-0.5 font-bold tabular-nums text-sky-900">
              {formatCurrency(row.remaining_amount, loc)}
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <h5 className="text-sm font-semibold text-gray-800">
            {en ? 'Mapped bank revenue' : '已映射银行收入'}
          </h5>
          {loading ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {en ? 'Loading…' : '加载中…'}
            </div>
          ) : transactions.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">
              {en ? 'No mapped bank credits for this category.' : '该科目暂无已映射银行收入。'}
            </p>
          ) : (
            <table className="mt-3 w-full text-left text-sm">
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
        </div>
      </aside>
    </div>
  );
}

export function RevenueReconciliationDashboard({ propertyId, fiscalYear, en }: Props) {
  const loc = en ? 'en' : 'zh';
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RevenueReconciliationRow[]>([]);
  const [emptyReason, setEmptyReason] = useState<EmptyReason>(null);
  const [selected, setSelected] = useState<RevenueReconciliationRow | null>(null);
  const [drawerTxs, setDrawerTxs] = useState<MappedRevenueTransaction[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [budgetCount, mappingCount, reconciliation] = await Promise.all([
      countRevenueBudgetLines(propertyId, fiscalYear),
      countActiveRevenueMappings(propertyId, fiscalYear),
      listRevenueReconciliation(propertyId, fiscalYear),
    ]);

    if (budgetCount === 0) {
      setEmptyReason('no_budget');
      setRows([]);
      setLoading(false);
      return;
    }
    if (mappingCount === 0) {
      setEmptyReason('no_mapping');
      setRows([]);
      setLoading(false);
      return;
    }

    const totalTx = reconciliation.reduce((s, r) => s + r.transaction_count, 0);
    setEmptyReason(totalTx === 0 ? 'no_transactions' : null);
    setRows(reconciliation);
    setLoading(false);
  }, [propertyId, fiscalYear]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => summarizeRevenueReconciliationRows(rows), [rows]);

  const openDetail = async (row: RevenueReconciliationRow) => {
    setSelected(row);
    setDrawerLoading(true);
    const txs = await fetchMappedRevenueTransactions(propertyId, fiscalYear, row.category);
    setDrawerTxs(txs);
    setDrawerLoading(false);
  };

  if (loading) {
    return (
      <section className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-500 shadow-sm">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        {en ? 'Loading revenue reconciliation…' : '正在加载收入对账…'}
      </section>
    );
  }

  if (emptyReason === 'no_budget') {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950 shadow-sm">
        {en ? 'Please approve AGM revenue budget first.' : '请先批准 AGM 收入预算。'}
      </section>
    );
  }

  if (emptyReason === 'no_mapping') {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950 shadow-sm">
        {en ? 'Please configure revenue mapping rules first.' : '请先配置收入映射规则。'}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-base font-semibold text-gray-900">
          {en ? 'Revenue Reconciliation' : '收入对账'}
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          {en
            ? 'AGM revenue budget vs mapped bank credits (bank only, no invoices).'
            : 'AGM 收入预算 vs 已映射银行进账（仅银行流水，不含发票）。'}
        </p>
      </div>

      {emptyReason === 'no_transactions' ? (
        <p className="mt-4 text-sm text-gray-500">
          {en ? 'No mapped revenue data yet.' : '尚无已映射收入数据。'}
        </p>
      ) : null}

      {rows.length > 0 ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
              <div className="text-xs font-medium text-gray-500">
                {en ? 'Revenue Budget' : '收入预算'}
              </div>
              <div className="mt-0.5 text-lg font-bold tabular-nums text-gray-900">
                {formatCurrency(summary.totalBudget, loc)}
              </div>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2">
              <div className="text-xs font-medium text-emerald-800">
                {en ? 'Actual Revenue' : '已收收入'}
              </div>
              <div className="mt-0.5 text-lg font-bold tabular-nums text-emerald-900">
                {formatCurrency(summary.totalActual, loc)}
              </div>
            </div>
            <div className="rounded-xl border border-sky-100 bg-sky-50/50 px-3 py-2">
              <div className="text-xs font-medium text-sky-800">
                {en ? 'Remaining Revenue' : '待收收入'}
              </div>
              <div className="mt-0.5 text-lg font-bold tabular-nums text-sky-900">
                {formatCurrency(summary.totalRemaining, loc)}
              </div>
            </div>
            <div className="rounded-xl border border-violet-100 bg-violet-50/50 px-3 py-2">
              <div className="text-xs font-medium text-violet-800">
                {en ? 'Collection %' : '收缴率'}
              </div>
              <div className="mt-0.5 text-lg font-bold tabular-nums text-violet-900">
                {summary.collectionPercent == null
                  ? '—'
                  : `${summary.collectionPercent.toFixed(1)}%`}
              </div>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-2 py-2 font-medium">{en ? 'Category' : '科目'}</th>
                  <th className="px-2 py-2 text-right font-medium">{en ? 'Budget' : '预算'}</th>
                  <th className="px-2 py-2 text-right font-medium">{en ? 'Actual' : '已收'}</th>
                  <th className="px-2 py-2 text-right font-medium">{en ? 'Remaining' : '未收'}</th>
                  <th className="px-2 py-2 font-medium">{en ? 'Collection %' : '收缴率'}</th>
                  <th className="px-2 py-2 text-center font-medium">{en ? 'Txns' : '笔数'}</th>
                  <th className="px-2 py-2 text-center font-medium">{en ? 'Status' : '状态'}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.category}
                    className="cursor-pointer border-b border-gray-100 hover:bg-sky-50/50"
                    onClick={() => void openDetail(row)}
                  >
                    <td className="px-2 py-2.5 font-medium text-gray-900">{row.category}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">
                      {formatCurrency(row.budget_amount, loc)}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-emerald-800">
                      {formatCurrency(row.actual_amount, loc)}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-sky-800">
                      {formatCurrency(row.remaining_amount, loc)}
                    </td>
                    <td className="px-2 py-2.5">
                      <CollectionBar percent={row.collection_percent} status={row.status} />
                    </td>
                    <td className="px-2 py-2.5 text-center tabular-nums text-gray-700">
                      {row.transaction_count}
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(row.status)}`}
                      >
                        {statusLabel(row.status, en)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {selected ? (
        <CategoryDetailDrawer
          row={selected}
          transactions={drawerTxs}
          loading={drawerLoading}
          en={en}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </section>
  );
}
