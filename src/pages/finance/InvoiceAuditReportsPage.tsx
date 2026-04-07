import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ExternalLink, FileText, Loader2, Mail } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProperty } from '../../contexts/PropertyContext';
import {
  fetchInvoiceAuditReportYears,
  fetchInvoiceAuditReports,
  openInvoiceAuditReportPdf,
  postInvoiceAuditReportEmail,
  type InvoiceAuditReportRow,
} from '../../lib/invoiceAuditReports';

const STAFF = new Set(['council', 'admin', 'manager', 'property_admin']);

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function InvoiceAuditReportsPage() {
  const { language } = useLanguage();
  const en = language === 'en';
  const { currentPropertyId, roleInProperty, memberships } = useProperty();

  const [years, setYears] = useState<number[]>([]);
  const [fyFilter, setFyFilter] = useState<number | ''>('');
  const [monthFilter, setMonthFilter] = useState<number | ''>('');
  const [rows, setRows] = useState<InvoiceAuditReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [mailingId, setMailingId] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const allowed = roleInProperty != null && STAFF.has(roleInProperty);
  const propertyName =
    memberships.find((m) => m.propertyId === currentPropertyId)?.name ?? (en ? 'Property' : '物业');

  const loadYears = useCallback(async () => {
    if (!currentPropertyId) return;
    try {
      const y = await fetchInvoiceAuditReportYears(currentPropertyId);
      setYears(y);
    } catch {
      setYears([]);
    }
  }, [currentPropertyId]);

  const loadRows = useCallback(async () => {
    if (!currentPropertyId) return;
    setLoading(true);
    setErr(null);
    try {
      const data = await fetchInvoiceAuditReports(currentPropertyId, {
        fiscalYear: fyFilter === '' ? undefined : fyFilter,
        month: monthFilter === '' ? undefined : monthFilter,
      });
      setRows(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [currentPropertyId, fyFilter, monthFilter]);

  useEffect(() => {
    if (!allowed || !currentPropertyId) return;
    void loadYears();
  }, [allowed, currentPropertyId, loadYears]);

  useEffect(() => {
    if (!allowed || !currentPropertyId) return;
    void loadRows();
  }, [allowed, currentPropertyId, loadRows]);

  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 6500);
    return () => window.clearTimeout(t);
  }, [flash]);

  const yearOptions = useMemo(() => {
    const cy = new Date().getFullYear();
    const base = years.length > 0 ? years : [cy, cy - 1, cy - 2];
    return [...new Set(base)].sort((a, b) => b - a);
  }, [years]);

  if (!allowed) {
    return (
      <div className="p-6">
        <p className="text-gray-700">{en ? 'Access denied.' : '无权访问。'}</p>
        <Link to="/" className="mt-2 inline-block text-emerald-700 underline">
          {en ? 'Home' : '返回首页'}
        </Link>
      </div>
    );
  }

  if (!currentPropertyId) {
    return (
      <div className="p-6">
        <p className="text-gray-700">{en ? 'Select a property first.' : '请先选择物业。'}</p>
      </div>
    );
  }

  const periodLabel = (r: InvoiceAuditReportRow) =>
    en ? `${r.fiscal_year}-${String(r.month).padStart(2, '0')}` : `${r.fiscal_year}年${r.month}月`;

  const emailBadge = (r: InvoiceAuditReportRow) => {
    if (r.email_status === 'sent') {
      return (
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-900">
          {en ? 'Emailed' : '已发邮件'}
        </span>
      );
    }
    if (r.email_status === 'failed') {
      return (
        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-900">
          {en ? 'Email failed' : '邮件失败'}
        </span>
      );
    }
    if (r.email_status === 'pending') {
      return (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">
          {en ? 'Sending…' : '发送中…'}
        </span>
      );
    }
    return (
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
        {en ? 'Not emailed' : '未发邮件'}
      </span>
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        {en ? 'Back' : '返回'}
      </Link>

      {flash ? (
        <div
          role="status"
          className={`mb-4 rounded-xl border px-4 py-3 text-sm shadow-sm ${
            flash.kind === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
              : 'border-red-200 bg-red-50 text-red-900'
          }`}
        >
          {flash.text}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-amber-900/90">
            <FileText className="h-6 w-6 shrink-0" aria-hidden />
            <h1 className="text-2xl font-bold text-slate-900">
              {en ? 'Invoice audit reports' : '异常发票审计报告'}
            </h1>
          </div>
          <p className="mt-0.5 text-sm text-slate-600">
            {propertyName} ·{' '}
            {en
              ? 'Data month = latest invoice date in each report. Version increments per data month when re-exported.'
              : '「数据月份」= 报告内发票最新日期；同一数据月份多次导出会递增版本号。'}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 p-4 shadow-sm">
        <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {en ? 'Year' : '年份'}
          <select
            value={fyFilter === '' ? '' : String(fyFilter)}
            onChange={(e) => setFyFilter(e.target.value === '' ? '' : Number(e.target.value))}
            className="min-w-[140px] rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          >
            <option value="">{en ? 'All years' : '全部年份'}</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {en ? 'Month' : '月份'}
          <select
            value={monthFilter === '' ? '' : String(monthFilter)}
            onChange={(e) => setMonthFilter(e.target.value === '' ? '' : Number(e.target.value))}
            className="min-w-[140px] rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          >
            <option value="">{en ? 'All months' : '全部月份'}</option>
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {en ? m : `${m}月`}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
        {loading ? (
          <div className="flex items-center gap-2 p-8 text-slate-700">
            <Loader2 className="h-5 w-5 animate-spin text-amber-700" aria-hidden />
            {en ? 'Loading…' : '加载中…'}
          </div>
        ) : err ? (
          <p className="p-8 text-red-700">{err}</p>
        ) : rows.length === 0 ? (
          <p className="p-8 text-slate-600">{en ? 'No reports match the filters.' : '没有符合筛选的报告。'}</p>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/90">
                  <tr>
                    <th className="px-4 py-3.5 font-semibold text-slate-800">{en ? 'Data month' : '数据月份'}</th>
                    <th className="px-4 py-3.5 font-semibold text-slate-800">{en ? 'Ver.' : '版本'}</th>
                    <th className="px-4 py-3.5 font-semibold text-slate-800">{en ? 'Hash' : '哈希'}</th>
                    <th className="px-4 py-3.5 font-semibold text-slate-800">{en ? 'Generated' : '生成时间'}</th>
                    <th className="px-4 py-3.5 font-semibold text-slate-800">{en ? 'Email' : '邮件'}</th>
                    <th className="px-4 py-3.5 text-right font-semibold text-slate-800">{en ? 'Actions' : '操作'}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const d = new Date(r.created_at);
                    const dateStr = en ? d.toLocaleString('en-CA') : d.toLocaleString('zh-CN');
                    const busyOpen = openingId === r.id;
                    const busyMail = mailingId === r.id;
                    const hashShort =
                      r.content_hash && r.content_hash.length > 10
                        ? `${r.content_hash.slice(0, 10)}…`
                        : r.content_hash ?? '—';
                    return (
                      <tr key={r.id} className="border-b border-slate-100 transition hover:bg-amber-50/40">
                        <td className="px-4 py-3.5 font-medium text-slate-900">{periodLabel(r)}</td>
                        <td className="px-4 py-3.5 text-slate-700">v{r.report_version ?? 1}</td>
                        <td className="px-4 py-3.5 font-mono text-xs text-slate-600" title={r.content_hash ?? undefined}>
                          {hashShort}
                        </td>
                        <td className="px-4 py-3.5 text-slate-700">{dateStr}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col gap-1">
                            {emailBadge(r)}
                            {r.emailed_to ? (
                              <span className="max-w-[200px] truncate text-[11px] text-slate-500" title={r.emailed_to}>
                                {r.emailed_to}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Link
                              to={`/finance/invoice-audit-reports/${r.id}`}
                              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
                            >
                              {en ? 'Details' : '详情'}
                            </Link>
                            <button
                              type="button"
                              disabled={busyOpen}
                              onClick={() => {
                                setOpeningId(r.id);
                                void openInvoiceAuditReportPdf(r.storage_path)
                                  .catch((e) => setFlash({ kind: 'err', text: String(e) }))
                                  .finally(() => setOpeningId(null));
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                            >
                              {busyOpen ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                              ) : (
                                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                              )}
                              PDF
                            </button>
                            <button
                              type="button"
                              disabled={busyMail}
                              onClick={() => {
                                setMailingId(r.id);
                                void postInvoiceAuditReportEmail({
                                  reportId: r.id,
                                  propertyId: currentPropertyId,
                                  locale: en ? 'en' : 'zh',
                                })
                                  .then((out) => {
                                    const msg = out.resent
                                      ? en
                                        ? `Resent to ${out.emailedTo ?? 'recipients'}.`
                                        : `已重发至 ${out.emailedTo ?? '收件人'}。`
                                      : en
                                        ? `Sent to ${out.emailedTo ?? 'recipients'}.`
                                        : `已发送至 ${out.emailedTo ?? '收件人'}。`;
                                    setFlash({ kind: 'ok', text: msg });
                                    void loadRows();
                                  })
                                  .catch((e) => setFlash({ kind: 'err', text: String(e) }))
                                  .finally(() => setMailingId(null));
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-700 bg-white px-2.5 py-1.5 text-xs font-medium text-emerald-900 hover:bg-emerald-50 disabled:opacity-60"
                            >
                              {busyMail ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                              ) : (
                                <Mail className="h-3.5 w-3.5" aria-hidden />
                              )}
                              {en ? 'Email' : '邮件'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-slate-100 md:hidden">
              {rows.map((r) => {
                const d = new Date(r.created_at);
                const dateStr = en ? d.toLocaleString('en-CA') : d.toLocaleString('zh-CN');
                const busyOpen = openingId === r.id;
                const busyMail = mailingId === r.id;
                const hashShort =
                  r.content_hash && r.content_hash.length > 10
                    ? `${r.content_hash.slice(0, 10)}…`
                    : r.content_hash ?? '—';
                return (
                  <li key={r.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{periodLabel(r)}</p>
                        <p className="text-xs text-slate-500">
                          v{r.report_version ?? 1} · {hashShort}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">{dateStr}</p>
                        <div className="mt-2">{emailBadge(r)}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        to={`/finance/invoice-audit-reports/${r.id}`}
                        className="inline-flex flex-1 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800"
                      >
                        {en ? 'Details' : '详情'}
                      </Link>
                      <button
                        type="button"
                        disabled={busyOpen}
                        onClick={() => {
                          setOpeningId(r.id);
                          void openInvoiceAuditReportPdf(r.storage_path)
                            .catch((e) => setFlash({ kind: 'err', text: String(e) }))
                            .finally(() => setOpeningId(null));
                        }}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
                      >
                        {busyOpen ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
                        PDF
                      </button>
                      <button
                        type="button"
                        disabled={busyMail}
                        onClick={() => {
                          setMailingId(r.id);
                          void postInvoiceAuditReportEmail({
                            reportId: r.id,
                            propertyId: currentPropertyId,
                            locale: en ? 'en' : 'zh',
                          })
                            .then((out) => {
                              const msg = out.resent
                                ? en
                                  ? `Resent to ${out.emailedTo ?? 'recipients'}.`
                                  : `已重发至 ${out.emailedTo ?? '收件人'}。`
                                : en
                                  ? `Sent to ${out.emailedTo ?? 'recipients'}.`
                                  : `已发送至 ${out.emailedTo ?? '收件人'}。`;
                              setFlash({ kind: 'ok', text: msg });
                              void loadRows();
                            })
                            .catch((e) => setFlash({ kind: 'err', text: String(e) }))
                            .finally(() => setMailingId(null));
                        }}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-emerald-700 bg-white px-3 py-2 text-xs font-medium text-emerald-900"
                      >
                        <Mail className="h-3.5 w-3.5" aria-hidden />
                        {en ? 'Email' : '邮件'}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
