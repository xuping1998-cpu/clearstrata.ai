import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight, Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useProperty } from '../contexts/PropertyContext';
import { fetchTaskTitleByInvoiceIds } from '../lib/invoiceTaskLinks';
import { supabase } from '../lib/supabase';
import { computeQuoteInvoiceVariance, isRedAlertVariance, type QuoteVarianceResult } from '../lib/quoteInvoiceVariance';

const STAFF_ROLES = new Set(['council', 'admin', 'manager', 'property_admin']);

/** 待审批队列：与发票审批操作一致 */
const PENDING_ALERT_STATUSES = ['pending_review'] as const;

export type RedAlertInvoiceRow = {
  id: string;
  vendor_name: string;
  titleLine: string;
  variance: QuoteVarianceResult;
  taskTitle?: string | null;
  taskId?: string | null;
};

export function DashboardRedAlertInvoicesCard() {
  const { language } = useLanguage();
  const en = language === 'en';
  const { currentPropertyId, roleInProperty } = useProperty();
  const visible = roleInProperty != null && STAFF_ROLES.has(roleInProperty);

  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [topRows, setTopRows] = useState<RedAlertInvoiceRow[]>([]);

  useEffect(() => {
    if (!visible || !currentPropertyId) {
      setLoading(false);
      setTotal(0);
      setTopRows([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const { data: invs, error } = await supabase
        .from('invoices')
        .select('id, vendor_name, total_amount, quote_id, status, file_name, invoice_number, created_at')
        .eq('property_id', currentPropertyId)
        .not('quote_id', 'is', null)
        .in('status', [...PENDING_ALERT_STATUSES])
        .order('created_at', { ascending: false });

      if (error || cancelled) {
        if (!cancelled) {
          setTotal(0);
          setTopRows([]);
          setLoading(false);
        }
        return;
      }

      const list = invs ?? [];
      if (list.length === 0) {
        if (!cancelled) {
          setTotal(0);
          setTopRows([]);
          setLoading(false);
        }
        return;
      }

      const quoteIds = [...new Set(list.map((i) => i.quote_id).filter(Boolean))] as string[];
      const { data: quotes } = await supabase.from('procurement_quotes').select('id, quoted_amount').in('id', quoteIds);
      if (cancelled) return;

      const qMap = new Map((quotes ?? []).map((q) => [q.id, Number(q.quoted_amount)]));
      const dangerRows: { inv: (typeof list)[0]; v: QuoteVarianceResult }[] = [];

      for (const inv of list) {
        if (!inv.quote_id) continue;
        const qa = qMap.get(inv.quote_id);
        const v = computeQuoteInvoiceVariance(qa, inv.total_amount);
        if (isRedAlertVariance(v)) {
          dangerRows.push({ inv, v });
        }
      }

      dangerRows.sort((a, b) => b.v.variancePercent - a.v.variancePercent);

      const mapped: RedAlertInvoiceRow[] = dangerRows.map(({ inv, v }) => ({
        id: inv.id,
        vendor_name: inv.vendor_name || '—',
        titleLine: inv.file_name || inv.invoice_number || inv.vendor_name || inv.id.slice(0, 8),
        variance: v,
      }));

      const topSlice = mapped.slice(0, 3);
      let enrichedTop = topSlice;
      if (topSlice.length > 0) {
        try {
          const taskMap = await fetchTaskTitleByInvoiceIds(
            currentPropertyId,
            topSlice.map((r) => r.id),
          );
          if (!cancelled) {
            enrichedTop = topSlice.map((r) => {
              const lt = taskMap.get(r.id);
              return {
                ...r,
                taskTitle: lt?.title ?? null,
                taskId: lt?.taskId ?? null,
              };
            });
          }
        } catch {
          if (!cancelled) enrichedTop = topSlice;
        }
      }

      if (!cancelled) {
        setTotal(mapped.length);
        setTopRows(enrichedTop);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, currentPropertyId]);

  if (!visible || !currentPropertyId) {
    return null;
  }

  return (
    <div className="mb-4 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 shadow-sm">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 shrink-0 text-red-600" size={22} aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-red-900">
            {en ? 'Red-alert invoices' : '红色预警发票'}
          </h2>
          {loading ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-800/80">
              <Loader2 className="h-4 w-4 animate-spin" />
              {en ? 'Loading…' : '加载中…'}
            </div>
          ) : total === 0 ? (
            <p className="mt-2 text-sm text-red-800/90">
              {en ? 'No red-alert invoices right now.' : '当前无红色预警发票'}
            </p>
          ) : (
            <>
              <p className="mt-1 text-sm font-medium text-red-900">
                {en ? `Total: ${total}` : `共 ${total} 张`}
              </p>
              <ul className="mt-3 space-y-2">
                {topRows.map((row) => {
                  const pct = row.variance.variancePercent * 100;
                  const sign = pct >= 0 ? '+' : '';
                  return (
                    <li key={row.id}>
                      <div className="group flex overflow-hidden rounded-lg border border-red-200 bg-white/90 shadow-sm transition hover:border-red-300 hover:shadow-md">
                        <Link
                          to={`/finance/invoices/${row.id}`}
                          className="flex min-w-0 flex-1 flex-col gap-1 px-3 py-2.5 text-sm outline-none ring-red-400 focus-visible:ring-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="min-w-0 font-medium text-red-950">
                              <span className="block truncate">{row.vendor_name}</span>
                              <span className="block truncate text-xs font-normal text-red-800/75">
                                {row.titleLine}
                              </span>
                            </span>
                            <span className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-red-700 group-hover:underline">
                              {en ? 'Details' : '查看详情'}
                              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                            </span>
                          </div>
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs">
                            <span className="font-semibold text-red-700">
                              {sign}
                              {pct.toFixed(1)}%
                            </span>
                            <span className="text-red-800/90">
                              {en ? 'Invoice' : '发票'} ${row.variance.invoiceAmount.toFixed(2)}
                            </span>
                            <span className="text-red-800/90">
                              {en ? 'Quote' : '报价'} ${row.variance.quoteAmount.toFixed(2)}
                            </span>
                          </div>
                          {row.taskTitle ? (
                            <div className="text-xs text-red-800/80">
                              {en ? 'Source: ' : '来源：'}
                              <span className="font-medium">{row.taskTitle}</span>
                            </div>
                          ) : null}
                        </Link>
                        {row.taskId ? (
                          <Link
                            to={`/property-admin/tasks/${row.taskId}`}
                            className="flex shrink-0 flex-col items-center justify-center border-l border-red-100 bg-red-50/70 px-2.5 py-2 text-center text-xs font-semibold text-[#1D9E75] transition hover:bg-red-100/90"
                            title={en ? 'View related task' : '查看关联任务'}
                          >
                            {en ? 'Task' : '查看任务'}
                          </Link>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3">
                <Link
                  to="/finance/invoices?filter=danger"
                  className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  {en ? 'View all' : '查看全部'}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
