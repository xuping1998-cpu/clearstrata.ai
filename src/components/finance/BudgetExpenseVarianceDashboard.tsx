import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { formatCurrency } from '../../lib/budget/dashboardApi';
import {
  countActiveBudgetMappings,
  countExpenseBudgetLines,
  fetchMappedExpenseInvoices,
  listBudgetExpenseVariance,
  summarizeBudgetExpenseVariance,
  type BudgetExpenseVariance,
  type BudgetExpenseVarianceStatus,
  type MappedExpenseInvoice,
} from '../../features/finance/budgetVarianceApi';

type Props = {
  propertyId: string;
  fiscalYear: number;
  en: boolean;
};

type EmptyReason = 'no_budget' | 'no_mapping' | 'no_invoices' | null;

function statusEmoji(status: BudgetExpenseVarianceStatus): string {
  if (status === 'red') return '🔴';
  if (status === 'yellow') return '🟡';
  return '🟢';
}

function barColor(status: BudgetExpenseVarianceStatus): string {
  if (status === 'red') return 'bg-red-500';
  if (status === 'yellow') return 'bg-amber-400';
  return 'bg-emerald-500';
}

function VarianceBar({ percent, status }: { percent: number | null; status: BudgetExpenseVarianceStatus }) {
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
          <div
            className="absolute inset-y-0 right-0 w-1 rounded-r-full bg-red-700"
            title="Over budget"
          />
        ) : null}
      </div>
    </div>
  );
}

function CategoryDetailDrawer({
  row,
  invoices,
  loading,
  en,
  onClose,
}: {
  row: BudgetExpenseVariance;
  invoices: MappedExpenseInvoice[];
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
          <h4 className="text-base font-semibold text-gray-900">{row.budget_category}</h4>
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
            <div className="text-gray-500">{en ? 'Actual' : '实际'}</div>
            <div className="mt-0.5 font-bold tabular-nums">{formatCurrency(row.actual_amount, loc)}</div>
          </div>
          <div>
            <div className="text-gray-500">{en ? 'Remaining' : '结余'}</div>
            <div
              className={`mt-0.5 font-bold tabular-nums ${row.remaining_budget < 0 ? 'text-red-700' : 'text-emerald-800'}`}
            >
              {formatCurrency(row.remaining_budget, loc)}
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <h5 className="text-sm font-semibold text-gray-800">
            {en ? 'Mapped invoices' : '已映射发票'}
          </h5>
          {loading ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {en ? 'Loading…' : '加载中…'}
            </div>
          ) : invoices.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">
              {en ? 'No mapped invoices for this category.' : '该科目暂无已映射发票。'}
            </p>
          ) : (
            <table className="mt-3 w-full text-left text-sm">
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
                    <td className="py-2 text-right tabular-nums">{formatCurrency(inv.total_amount, loc)}</td>
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

export function BudgetExpenseVarianceDashboard({ propertyId, fiscalYear, en }: Props) {
  const loc = en ? 'en' : 'zh';
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<BudgetExpenseVariance[]>([]);
  const [emptyReason, setEmptyReason] = useState<EmptyReason>(null);
  const [selected, setSelected] = useState<BudgetExpenseVariance | null>(null);
  const [drawerInvoices, setDrawerInvoices] = useState<MappedExpenseInvoice[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [budgetCount, mappingCount, variance] = await Promise.all([
      countExpenseBudgetLines(propertyId, fiscalYear),
      countActiveBudgetMappings(propertyId, fiscalYear),
      listBudgetExpenseVariance(propertyId, fiscalYear),
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

    const totalInvoices = variance.reduce((s, r) => s + r.invoice_count, 0);
    if (totalInvoices === 0) {
      setEmptyReason('no_invoices');
    } else {
      setEmptyReason(null);
    }

    setRows(variance);
    setLoading(false);
  }, [propertyId, fiscalYear]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => summarizeBudgetExpenseVariance(rows), [rows]);

  const openDetail = async (row: BudgetExpenseVariance) => {
    setSelected(row);
    setDrawerLoading(true);
    const invoices = await fetchMappedExpenseInvoices(propertyId, fiscalYear, row.budget_category);
    setDrawerInvoices(invoices);
    setDrawerLoading(false);
  };

  if (loading) {
    return (
      <section className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-500 shadow-sm">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        {en ? 'Loading expense variance…' : '正在加载支出差异…'}
      </section>
    );
  }

  if (emptyReason === 'no_budget') {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950 shadow-sm">
        {en ? 'Please approve an AGM budget first.' : '请先批准 AGM 预算。'}
      </section>
    );
  }

  if (emptyReason === 'no_mapping') {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950 shadow-sm">
        {en ? 'Please configure budget category mappings first.' : '请先配置预算科目映射。'}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-base font-semibold text-gray-900">
          {en ? 'Expense Variance' : '支出差异'}
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          {en
            ? 'AGM expense budget vs approved mapped invoices (invoices only).'
            : 'AGM 支出预算 vs 已批准映射发票（仅发票，不含银行流水）。'}
        </p>
      </div>

      {emptyReason === 'no_invoices' ? (
        <p className="mt-4 text-sm text-gray-500">
          {en ? 'No mapped expense data yet.' : '尚无已映射支出数据。'}
        </p>
      ) : null}

      {rows.length > 0 ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
              <div className="text-xs font-medium text-gray-500">{en ? 'Budget' : '预算'}</div>
              <div className="mt-0.5 text-lg font-bold tabular-nums text-gray-900">
                {formatCurrency(summary.totalBudget, loc)}
              </div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
              <div className="text-xs font-medium text-gray-500">{en ? 'Actual' : '实际'}</div>
              <div className="mt-0.5 text-lg font-bold tabular-nums text-gray-900">
                {formatCurrency(summary.totalActual, loc)}
              </div>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2">
              <div className="text-xs font-medium text-emerald-800">{en ? 'Remaining' : '结余'}</div>
              <div
                className={`mt-0.5 text-lg font-bold tabular-nums ${summary.totalRemaining < 0 ? 'text-red-700' : 'text-emerald-900'}`}
              >
                {formatCurrency(summary.totalRemaining, loc)}
              </div>
            </div>
            <div className="rounded-xl border border-red-100 bg-red-50/50 px-3 py-2">
              <div className="text-xs font-medium text-red-800">
                {en ? 'Over Budget' : '超支科目'}
              </div>
              <div className="mt-0.5 text-lg font-bold tabular-nums text-red-900">
                {summary.overBudgetCount}
              </div>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-2 py-2 font-medium">{en ? 'Category' : '科目'}</th>
                  <th className="px-2 py-2 text-right font-medium">{en ? 'Budget' : '预算'}</th>
                  <th className="px-2 py-2 text-right font-medium">{en ? 'Actual' : '实际'}</th>
                  <th className="px-2 py-2 text-right font-medium">{en ? 'Remaining' : '结余'}</th>
                  <th className="px-2 py-2 font-medium">{en ? 'Variance %' : '差异 %'}</th>
                  <th className="px-2 py-2 text-center font-medium">{en ? 'Invoices' : '发票'}</th>
                  <th className="px-2 py-2 text-center font-medium">{en ? 'Status' : '状态'}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.budget_category}
                    className="cursor-pointer border-b border-gray-100 hover:bg-sky-50/50"
                    onClick={() => void openDetail(row)}
                  >
                    <td className="px-2 py-2.5 font-medium text-gray-900">{row.budget_category}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">
                      {formatCurrency(row.budget_amount, loc)}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums">
                      {formatCurrency(row.actual_amount, loc)}
                    </td>
                    <td
                      className={`px-2 py-2.5 text-right tabular-nums ${row.remaining_budget < 0 ? 'text-red-700' : ''}`}
                    >
                      {formatCurrency(row.remaining_budget, loc)}
                    </td>
                    <td className="px-2 py-2.5">
                      <VarianceBar percent={row.variance_percent} status={row.status} />
                    </td>
                    <td className="px-2 py-2.5 text-center tabular-nums text-gray-700">
                      {row.invoice_count}
                    </td>
                    <td className="px-2 py-2.5 text-center text-base" title={row.status}>
                      {statusEmoji(row.status)}
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
          invoices={drawerInvoices}
          loading={drawerLoading}
          en={en}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </section>
  );
}
