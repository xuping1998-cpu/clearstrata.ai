import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Loader2 } from 'lucide-react';
import {
  fetchInvoiceAuditReports,
  openInvoiceAuditReportPdf,
  type InvoiceAuditReportRow,
} from '../lib/invoiceAuditReports';

type Props = {
  propertyId: string;
  en: boolean;
  open: boolean;
};

export function InvoiceAuditReportHistoryPanel({ propertyId, en, open }: Props) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<InvoiceAuditReportRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await fetchInvoiceAuditReports(propertyId);
      setRows(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    if (!open || !propertyId) return;
    void load();
  }, [open, propertyId, load]);

  if (!open) {
    return null;
  }

  const fmt = (r: InvoiceAuditReportRow) => {
    const d = new Date(r.created_at);
    const dateStr = en ? d.toLocaleString('en-CA') : d.toLocaleString('zh-CN');
    const period = en ? `${r.fiscal_year}-${String(r.month).padStart(2, '0')}` : `${r.fiscal_year}年${r.month}月`;
    return { dateStr, period };
  };

  return (
    <div className="mt-3 rounded-lg border border-amber-200/80 bg-white/95 p-3 text-sm text-amber-950 shadow-inner">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-amber-950">
          {en ? 'Archived reports (PDF)' : '已归档报告（PDF）'}
        </p>
        <Link
          to="/finance/invoice-audit-reports"
          className="text-xs font-medium text-amber-900 underline hover:text-amber-950"
        >
          {en ? 'Full list & filters' : '完整列表与筛选'}
        </Link>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-amber-900/90">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {en ? 'Loading…' : '加载中…'}
        </div>
      ) : err ? (
        <p className="text-red-700">{err}</p>
      ) : rows.length === 0 ? (
        <p className="text-amber-900/85">{en ? 'No archived reports yet.' : '暂无归档报告。'}</p>
      ) : (
        <ul className="max-h-56 space-y-2 overflow-y-auto pr-1">
          {rows.map((r) => {
            const { dateStr, period } = fmt(r);
            const busy = openingId === r.id;
            return (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-100 bg-amber-50/50 px-2 py-1.5"
              >
                <span className="min-w-0 text-xs">
                  <span className="font-medium text-amber-950">{period}</span>
                  <span className="block text-[11px] text-amber-800/90">{dateStr}</span>
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setOpeningId(r.id);
                    void openInvoiceAuditReportPdf(r.storage_path)
                      .catch((e) => {
                        alert(en ? String(e) : `打开失败：${e}`);
                      })
                      .finally(() => setOpeningId(null));
                  }}
                  className="inline-flex shrink-0 items-center gap-1 rounded bg-slate-800 px-2 py-1 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-60"
                >
                  {busy ? (
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                  ) : (
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  )}
                  {en ? 'Open' : '打开'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
