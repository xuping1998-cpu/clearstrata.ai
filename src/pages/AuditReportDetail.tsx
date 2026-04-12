import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, Download, Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useProperty } from '../contexts/PropertyContext';
import { exportReportToPDF } from '../lib/exportPdf';
import { supabase } from '../lib/supabase';

type AuditReportRow = {
  id: string;
  title: string;
  content: string;
  recommendations: string;
  created_at: string;
  invoice_id: string | null;
  invoices: {
    vendor_name: string | null;
    total_amount: number | null;
    invoice_number: string | null;
    invoice_date: string | null;
  } | null;
};

function formatMoney(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function AuditReportDetail() {
  const { reportId } = useParams<{ reportId: string }>();
  const { language } = useLanguage();
  const en = language === 'en';
  const { currentPropertyId } = useProperty();

  const [row, setRow] = useState<AuditReportRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  const load = useCallback(async () => {
    if (!reportId || !currentPropertyId) return;
    setLoading(true);
    setErr(null);
    try {
      const { data, error } = await supabase
        .from('audit_reports')
        .select(
          `
          id,
          title,
          content,
          recommendations,
          created_at,
          invoice_id,
          invoices (
            vendor_name,
            total_amount,
            invoice_number,
            invoice_date
          )
        `,
        )
        .eq('id', reportId)
        .eq('property_id', currentPropertyId)
        .maybeSingle();

      if (error) {
        setErr(error.message);
        setRow(null);
        return;
      }
      if (!data) {
        setErr(en ? 'Report not found.' : '未找到该报告。');
        setRow(null);
        return;
      }
      setRow(data as unknown as AuditReportRow);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setRow(null);
    } finally {
      setLoading(false);
    }
  }, [reportId, currentPropertyId, en]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleExportPdf() {
    setPdfBusy(true);
    try {
      await exportReportToPDF('report-container', 'council-audit-report.pdf');
    } catch (e) {
      console.error(e);
      window.alert(en ? 'Could not export PDF.' : '导出 PDF 失败。');
    } finally {
      setPdfBusy(false);
    }
  }

  if (!currentPropertyId || !reportId) {
    return (
      <div className="p-6">
        <p className="text-gray-600">{en ? 'Missing report or property.' : '缺少报告或物业。'}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-gray-600">
        <Loader2 className="size-6 animate-spin" aria-hidden />
        <span>{en ? 'Loading…' : '加载中…'}</span>
      </div>
    );
  }

  if (err || !row) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-red-700">{err ?? (en ? 'Not found.' : '未找到。')}</p>
        <Link to="/" className="mt-3 inline-flex items-center gap-1 text-emerald-700 hover:underline">
          <ChevronLeft className="size-4" />
          {en ? 'Home' : '返回首页'}
        </Link>
      </div>
    );
  }

  const inv = row.invoices;
  const bodyParagraphs = row.content.split(/\n+/).filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-emerald-800 hover:underline">
          <ChevronLeft className="size-4" />
          {en ? 'Home' : '首页'}
        </Link>
        <button
          type="button"
          onClick={() => void handleExportPdf()}
          disabled={pdfBusy}
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
        >
          {pdfBusy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          {en ? 'Export meeting PDF' : '导出会议 PDF'}
        </button>
      </div>

      <div
        id="report-container"
        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm print:shadow-none"
      >
        <p className="text-xs uppercase tracking-wide text-gray-400">
          {en ? 'Council review report' : '业委会质疑报告'}
        </p>
        <h1 className="mt-2 text-2xl font-bold leading-tight text-gray-900 sm:text-3xl">{row.title}</h1>
        <p className="mt-2 text-xs text-gray-500">
          {en ? 'Generated' : '生成时间'}
          {': '}
          {new Date(row.created_at).toLocaleString(en ? 'en-CA' : 'zh-CN', {
            dateStyle: 'short',
            timeStyle: 'short',
          })}
        </p>

        {inv ? (
          <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50/90 p-4 text-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {en ? 'Linked invoice' : '关联发票'}
            </h2>
            <dl className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-gray-500">{en ? 'Vendor' : '供应商'}</dt>
                <dd className="font-medium text-gray-900">{inv.vendor_name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">{en ? 'Amount' : '金额'}</dt>
                <dd className="font-medium text-gray-900">{formatMoney(inv.total_amount)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">{en ? 'Invoice #' : '发票号'}</dt>
                <dd className="font-medium text-gray-900">{inv.invoice_number ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">{en ? 'Date' : '日期'}</dt>
                <dd className="font-medium text-gray-900">
                  {inv.invoice_date
                    ? new Date(inv.invoice_date).toLocaleDateString(en ? 'en-CA' : 'zh-CN')
                    : '—'}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}

        <div className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">{en ? 'Body' : '正文'}</h2>
          {bodyParagraphs.map((p, i) => (
            <p key={i} className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
              {p}
            </p>
          ))}
        </div>

        {row.recommendations ? (
          <div className="mt-8 rounded-xl border-2 border-amber-200 bg-amber-50/90 p-4">
            <h2 className="text-sm font-semibold text-amber-950">{en ? 'Recommendations' : '建议'}</h2>
            <p className="mt-2 text-sm leading-relaxed text-amber-950 whitespace-pre-wrap">{row.recommendations}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default AuditReportDetail;
