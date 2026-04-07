import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertOctagon, ChevronRight, FileDown, Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useProperty } from '../contexts/PropertyContext';
import { supabase } from '../lib/supabase';
import type { InvoiceAuditSummary } from '../lib/audit/invoiceAuditRules';
import { postInvoiceAuditReport, downloadInvoiceAuditReportBlob } from '../lib/api/invoiceAuditReport';
import { InvoiceAuditReportHistoryPanel } from './InvoiceAuditReportHistoryPanel';

const STAFF_ROLES = new Set(['council', 'admin', 'manager', 'property_admin']);

type Row = {
  id: string;
  vendor_name: string;
  file_name: string | null;
  invoice_number: string | null;
  total_amount: number;
  audit_summary: InvoiceAuditSummary | null;
};

export function DashboardAbnormalInvoicesCard() {
  const { language } = useLanguage();
  const en = language === 'en';
  const { currentPropertyId, roleInProperty, memberships } = useProperty();
  const visible = roleInProperty != null && STAFF_ROLES.has(roleInProperty);

  const [loading, setLoading] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [meetingNotes, setMeetingNotes] = useState('');
  const [reportTitle, setReportTitle] = useState('');
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!visible || !currentPropertyId) {
      setLoading(false);
      setTotal(0);
      setRows([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const { data, count, error } = await supabase
        .from('invoices')
        .select('id, vendor_name, file_name, invoice_number, total_amount, audit_summary', {
          count: 'exact',
        })
        .eq('property_id', currentPropertyId)
        .eq('is_abnormal', true)
        .order('updated_at', { ascending: false })
        .range(0, 4);

      if (cancelled) return;
      if (error) {
        setTotal(0);
        setRows([]);
        setLoading(false);
        return;
      }
      setRows((data as Row[]) ?? []);
      setTotal(count ?? (data?.length ?? 0));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, currentPropertyId]);

  if (!visible || !currentPropertyId) {
    return null;
  }

  const summaryHint = (r: Row): string => {
    const codes = r.audit_summary?.rule_codes;
    if (Array.isArray(codes) && codes.length > 0) {
      return codes.slice(0, 3).join(', ');
    }
    return en ? 'Rule audit' : '规则审计';
  };

  const propertyName =
    memberships.find((m) => m.propertyId === currentPropertyId)?.name ??
    (en ? 'Property' : '物业');

  const handleGeneratePdf = async () => {
    if (!currentPropertyId || pdfBusy) return;
    setPdfBusy(true);
    try {
      const meta =
        meetingNotes.trim() || reportTitle.trim()
          ? {
              ...(meetingNotes.trim() ? { meetingNotes: meetingNotes.trim() } : {}),
              ...(reportTitle.trim() ? { reportTitle: reportTitle.trim().slice(0, 500) } : {}),
            }
          : undefined;
      const blob = await postInvoiceAuditReport({
        propertyId: currentPropertyId,
        propertyName,
        monthsBack: 12,
        locale: en ? 'en' : 'zh',
        includeAiNarrative: true,
        meta,
      });
      downloadInvoiceAuditReportBlob(blob, currentPropertyId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === 'NO_SESSION') {
        alert(en ? 'Please sign in again.' : '请重新登录后再试。');
      } else if (msg === 'NO_AUDIT_INVOICES') {
        alert(en ? 'No audit-flagged invoices in the selected period.' : '所选期间无审计异常发票。');
      } else {
        alert(en ? `Could not generate PDF: ${msg}` : `无法生成 PDF：${msg}`);
      }
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 shadow-sm">
      <div className="flex items-start gap-2">
        <AlertOctagon className="mt-0.5 shrink-0 text-amber-800" size={22} aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-amber-950">
            {en ? 'Audit-flagged invoices' : '审计异常发票'}
          </h2>
          <p className="mt-0.5 text-xs text-amber-900/85">
            {en
              ? 'Automatic rules: quote variance, missing quote/category, duplicates, vendor spikes.'
              : '自动规则：报价差异、无报价/无预算科目、重复发票、供应商金额异常等。'}
          </p>
          {loading ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-amber-900/90">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {en ? 'Loading…' : '加载中…'}
            </div>
          ) : total === 0 ? (
            <p className="mt-2 text-sm text-amber-900/90">
              {en ? 'No audit-flagged invoices right now.' : '当前无审计异常发票'}
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm font-medium text-amber-950">
                {en ? `Total: ${total}` : `共 ${total} 张`}
              </p>
              <ul className="mt-3 space-y-2">
                {rows.map((r) => (
                  <li key={r.id}>
                    <Link
                      to={`/finance/invoices/${r.id}`}
                      className="flex items-start justify-between gap-2 rounded-lg border border-amber-200 bg-white/90 px-3 py-2 text-sm text-amber-950 shadow-sm transition hover:border-amber-300"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{r.vendor_name || '—'}</span>
                        <span className="block truncate text-xs text-amber-900/80">
                          {r.file_name || r.invoice_number || r.id.slice(0, 8)}
                        </span>
                        <span className="mt-0.5 block text-xs text-amber-800/90">{summaryHint(r)}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-amber-900">
                        ${Number(r.total_amount).toFixed(2)}
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
          {!loading && (
            <>
              <details className="mt-3 rounded-lg border border-amber-200/80 bg-white/60 px-3 py-2">
                <summary className="cursor-pointer text-xs font-medium text-amber-950">
                  {en
                    ? 'Formal title & meeting notes (PDF & archive)'
                    : '正式标题与会议备注（可选，写入 PDF 与归档）'}
                </summary>
                <label className="mt-2 block text-[11px] font-medium text-amber-900/90">
                  {en ? 'Formal meeting title (PDF cover)' : '正式会议标题（PDF 封面主标题）'}
                  <input
                    type="text"
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    maxLength={500}
                    placeholder={en ? 'e.g. Q4 strata council — invoice audit' : '例如：业委会第四季度 · 异常发票专项汇报'}
                    className="mt-1 w-full rounded-md border border-amber-200 bg-white px-2 py-1.5 text-sm text-amber-950 placeholder:text-amber-900/40 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </label>
                <label className="mt-2 block text-[11px] font-medium text-amber-900/90">
                  {en ? 'Meeting notes' : '会议备注'}
                  <textarea
                    value={meetingNotes}
                    onChange={(e) => setMeetingNotes(e.target.value)}
                    maxLength={8000}
                    rows={3}
                    placeholder={en ? 'e.g. agenda item, discussion points…' : '例如：会议议题、讨论要点…'}
                    className="mt-1 w-full resize-y rounded-md border border-amber-200 bg-white px-2 py-1.5 text-sm text-amber-950 placeholder:text-amber-900/40 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                </label>
              </details>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleGeneratePdf()}
                  disabled={pdfBusy}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {pdfBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <FileDown className="h-4 w-4" aria-hidden />
                  )}
                  {en ? 'Generate PDF report' : '生成 PDF 报告'}
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryOpen((v) => !v)}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-600 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                >
                  {en ? 'Archived reports' : '查看历史报告'}
                </button>
                <Link
                  to="/finance/invoices?filter=audit"
                  className="inline-flex items-center justify-center rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
                >
                  {en ? 'View all' : '查看全部'}
                </Link>
              </div>
              <InvoiceAuditReportHistoryPanel
                propertyId={currentPropertyId}
                en={en}
                open={historyOpen}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
