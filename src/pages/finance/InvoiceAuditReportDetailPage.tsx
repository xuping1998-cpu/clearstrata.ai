import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, Download, Loader2, Mail } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProperty } from '../../contexts/PropertyContext';
import {
  fetchInvoiceAuditReport,
  fetchInvoiceAuditReportEmailLogs,
  openInvoiceAuditReportPdf,
  parsePreviewAnomaliesJson,
  postInvoiceAuditReportEmail,
  type InvoiceAuditReportEmailLogRow,
  type InvoiceAuditReportRow,
} from '../../lib/invoiceAuditReports';

const STAFF = new Set(['council', 'admin', 'manager', 'property_admin']);

function formatMoney(n: number | null | undefined, _localeEn: boolean): string {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function InvoiceAuditReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const { language } = useLanguage();
  const en = language === 'en';
  const { currentPropertyId, roleInProperty, memberships } = useProperty();

  const [row, setRow] = useState<InvoiceAuditReportRow | null>(null);
  const [logs, setLogs] = useState<InvoiceAuditReportEmailLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [mailBusy, setMailBusy] = useState(false);
  const [flash, setFlash] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const allowed = roleInProperty != null && STAFF.has(roleInProperty);
  const propertyName =
    memberships.find((m) => m.propertyId === currentPropertyId)?.name ?? (en ? 'Property' : '物业');

  const load = useCallback(async () => {
    if (!reportId || !currentPropertyId) return;
    setLoading(true);
    setErr(null);
    try {
      const [r, l] = await Promise.all([
        fetchInvoiceAuditReport(reportId, currentPropertyId),
        fetchInvoiceAuditReportEmailLogs(reportId, currentPropertyId),
      ]);
      setRow(r);
      setLogs(l);
      if (!r) setErr(en ? 'Report not found.' : '未找到该报告。');
      else setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setRow(null);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [reportId, currentPropertyId, en]);

  useEffect(() => {
    if (!allowed || !currentPropertyId || !reportId) return;
    void load();
  }, [allowed, currentPropertyId, reportId, load]);

  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 6000);
    return () => window.clearTimeout(t);
  }, [flash]);

  if (!allowed) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-gray-700">{en ? 'Access denied.' : '无权访问。'}</p>
        <Link to="/finance/invoice-audit-reports" className="mt-2 inline-block text-emerald-700 underline">
          {en ? 'Back to list' : '返回列表'}
        </Link>
      </div>
    );
  }

  if (!currentPropertyId || !reportId) {
    return (
      <div className="p-6">
        <p className="text-gray-600">{en ? 'Missing report or property.' : '缺少报告或物业。'}</p>
      </div>
    );
  }

  const periodLabel = (r: InvoiceAuditReportRow) =>
    en ? `${r.fiscal_year}-${String(r.month).padStart(2, '0')}` : `${r.fiscal_year}年${r.month}月`;

  const emailStatusLine = (r: InvoiceAuditReportRow) => {
    if (r.email_status === 'sent') {
      return en ? 'Sent' : '已发送';
    }
    if (r.email_status === 'failed') {
      return en ? 'Last send failed' : '上次发送失败';
    }
    return en ? 'Not sent' : '未发送';
  };

  const previewAnomalies = row
    ? parsePreviewAnomaliesJson(
        row.preview_anomalies_json,
        row.preview_anomalies_schema_version,
        row.id,
      )
    : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
      <Link
        to="/finance/invoice-audit-reports"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        {en ? 'All reports' : '全部报告'}
      </Link>

      {flash ? (
        <div
          role="status"
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            flash.kind === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
              : 'border-red-200 bg-red-50 text-red-900'
          }`}
        >
          {flash.text}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-gray-700">
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
          {en ? 'Loading…' : '加载中…'}
        </div>
      ) : err || row === null ? (
        <p className="text-red-700">{err ?? (en ? 'Not found.' : '未找到。')}</p>
      ) : (
        <>
          <header className="border-b border-slate-200 pb-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800/90">
              {en ? 'Invoice audit report' : '异常发票审计报告'}
            </p>
            {row.report_title?.trim() ? (
              <>
                <h1 className="mt-1 text-2xl font-bold text-slate-900">{row.report_title.trim()}</h1>
                <p className="mt-1 text-base font-medium text-slate-600">
                  {propertyName} · {periodLabel(row)}
                </p>
              </>
            ) : (
              <h1 className="mt-1 text-2xl font-bold text-slate-900">
                {propertyName} · {periodLabel(row)}
              </h1>
            )}
          </header>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">
              {en ? 'Summary preview' : '摘要预览'}
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xs font-semibold uppercase text-slate-500">
                    {en ? 'Audit conclusion' : '审计结论'}
                  </h3>
                  {row.audit_conclusion_source ? (
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${
                        row.audit_conclusion_source === 'ai'
                          ? 'border-violet-300 bg-violet-50 text-violet-900'
                          : row.audit_conclusion_source === 'manual'
                            ? 'border-amber-300 bg-amber-50 text-amber-950'
                            : 'border-slate-300 bg-slate-100 text-slate-800'
                      }`}
                      title={
                        en
                          ? `${row.audit_conclusion_source === 'rule' ? 'Rule-generated' : row.audit_conclusion_source === 'ai' ? 'AI-generated' : 'Manually edited'}`
                          : '结论文案来源'
                      }
                    >
                      {row.audit_conclusion_source === 'rule'
                        ? '规则生成'
                        : row.audit_conclusion_source === 'ai'
                          ? 'AI 生成'
                          : '人工修改'}
                    </span>
                  ) : (
                    <span
                      className="inline-flex rounded-full border border-dashed border-slate-300 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-500"
                      title={en ? 'Source not recorded' : '未记录来源'}
                    >
                      {en ? 'source n/a' : '来源未标注'}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-800">
                  {row.audit_conclusion_text?.trim() || (en ? '—' : '—')}
                </p>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase text-slate-500">
                  {en ? 'Top anomaly summaries (up to 3)' : '异常摘要（至多 3 条）'}
                </h3>
                {previewAnomalies.length === 0 ? (
                  <p className="mt-1.5 text-sm text-slate-500">{en ? '—' : '—'}</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {previewAnomalies.map((a, i) => (
                      <li
                        key={`${a.rule_code}-${i}`}
                        className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm text-slate-800"
                      >
                        <span className="mr-2 font-mono text-xs text-slate-500">{a.rule_code}</span>
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${
                            a.severity === 'high'
                              ? 'bg-red-100 text-red-900'
                              : a.severity === 'medium'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-slate-200 text-slate-800'
                          }`}
                        >
                          {a.severity}
                        </span>
                        <p className="mt-1 leading-snug">{en ? a.message_en || a.message_zh : a.message_zh || a.message_en}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase text-slate-500">
                  {en ? 'Meeting notes' : '会议备注'}
                </h3>
                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                  {row.meeting_notes?.trim() || (en ? '—' : '—')}
                </p>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase text-slate-500">
                  {en ? 'Latest send' : '最近发送'}
                </h3>
                {logs[0] ? (
                  <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          logs[0].status === 'sent' ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900'
                        }`}
                      >
                        {logs[0].status === 'sent' ? (en ? 'Sent' : '成功') : en ? 'Failed' : '失败'}
                      </span>
                      {logs[0].report_version != null ? (
                        <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[11px] font-medium text-slate-800">
                          v{logs[0].report_version}
                        </span>
                      ) : null}
                      <span className="text-xs text-slate-500">
                        {new Date(logs[0].created_at).toLocaleString(en ? 'en-CA' : 'zh-CN')}
                      </span>
                    </div>
                    <p className="mt-2 break-all text-slate-800">{logs[0].recipients.join(', ')}</p>
                  </div>
                ) : (
                  <p className="mt-1.5 text-sm text-slate-800">
                    {emailStatusLine(row)}
                    {row.emailed_at ? (
                      <span className="mt-0.5 block text-xs text-slate-600">
                        {new Date(row.emailed_at).toLocaleString(en ? 'en-CA' : 'zh-CN')}
                        {row.emailed_to ? ` · ${row.emailed_to}` : ''}
                      </span>
                    ) : null}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-white p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wide text-amber-900/90">
              {en ? 'Report snapshot' : '报告摘要'}
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-white/80 bg-white/90 px-3 py-3 shadow-sm">
                <p className="text-[11px] font-medium uppercase text-slate-500">
                  {en ? 'Abnormal invoices' : '异常发票数'}
                </p>
                <p className="mt-1 text-xl font-bold text-slate-900">
                  {row.summary_invoice_count ?? '—'}
                </p>
              </div>
              <div className="rounded-xl border border-white/80 bg-white/90 px-3 py-3 shadow-sm">
                <p className="text-[11px] font-medium uppercase text-slate-500">
                  {en ? 'Abnormal amount' : '异常金额'}
                </p>
                <p className="mt-1 text-xl font-bold text-slate-900">
                  {formatMoney(row.summary_total_amount, en)}
                </p>
              </div>
              <div className="rounded-xl border border-white/80 bg-white/90 px-3 py-3 shadow-sm">
                <p className="text-[11px] font-medium uppercase text-slate-500">
                  {en ? 'High-risk hits' : '高风险数'}
                </p>
                <p className="mt-1 text-xl font-bold text-slate-900">
                  {row.summary_high_risk_count ?? '—'}
                </p>
              </div>
              <div className="rounded-xl border border-white/80 bg-white/90 px-3 py-3 shadow-sm">
                <p className="text-[11px] font-medium uppercase text-slate-500">
                  {en ? 'Version' : '当前版本'}
                </p>
                <p className="mt-1 text-xl font-bold text-slate-900">v{row.report_version ?? 1}</p>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-xs font-semibold uppercase text-slate-500">
                {en ? 'Generated' : '生成时间'}
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {en
                  ? new Date(row.created_at).toLocaleString('en-CA')
                  : new Date(row.created_at).toLocaleString('zh-CN')}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-2">
              <h2 className="text-xs font-semibold uppercase text-slate-500">
                {en ? 'Content hash (SHA-256)' : '内容哈希（SHA-256）'}
              </h2>
              <p className="mt-1 break-all font-mono text-xs text-slate-800">{row.content_hash ?? '—'}</p>
            </div>
          </section>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={pdfBusy}
              onClick={() => {
                setPdfBusy(true);
                void openInvoiceAuditReportPdf(row.storage_path)
                  .catch((e) => setFlash({ kind: 'err', text: String(e) }))
                  .finally(() => setPdfBusy(false));
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-slate-800 disabled:opacity-60"
            >
              {pdfBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
              {en ? 'Open PDF' : '打开 PDF'}
            </button>
            <button
              type="button"
              disabled={mailBusy}
              onClick={() => {
                setMailBusy(true);
                void postInvoiceAuditReportEmail({
                  reportId: row.id,
                  propertyId: currentPropertyId,
                  locale: en ? 'en' : 'zh',
                })
                  .then((out) => {
                    const msg = out.resent
                      ? en
                        ? `Email sent again to ${out.emailedTo ?? 'recipients'}.`
                        : `已再次发送至 ${out.emailedTo ?? '收件人'}。`
                      : en
                        ? `Email sent to ${out.emailedTo ?? 'recipients'}.`
                        : `已发送至 ${out.emailedTo ?? '收件人'}。`;
                    setFlash({ kind: 'ok', text: msg });
                    void load();
                  })
                  .catch((e) => setFlash({ kind: 'err', text: String(e) }))
                  .finally(() => setMailBusy(false));
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-700 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-900 shadow-sm hover:bg-emerald-50 disabled:opacity-60"
            >
              {mailBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Mail className="h-4 w-4" aria-hidden />}
              {en ? 'Send / resend email' : '发送 / 重发邮件'}
            </button>
          </div>

          <section className="mt-10">
            <h2 className="text-lg font-bold text-slate-900">
              {en ? 'Email log' : '邮件发送记录'}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {en ? 'Per-send history (replaces comma-only storage long term).' : '按次记录（长期替代逗号分隔收件人）。'}
            </p>
            {logs.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">{en ? 'No sends yet.' : '暂无发送记录。'}</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {logs.map((log) => (
                  <li
                    key={log.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            log.status === 'sent' ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900'
                          }`}
                        >
                          {log.status === 'sent' ? (en ? 'Sent' : '成功') : en ? 'Failed' : '失败'}
                        </span>
                        {log.report_version != null ? (
                          <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[11px] font-medium text-slate-800">
                            v{log.report_version}
                          </span>
                        ) : null}
                      </div>
                      <span className="text-xs text-slate-500">
                        {new Date(log.created_at).toLocaleString(en ? 'en-CA' : 'zh-CN')}
                      </span>
                    </div>
                    <p className="mt-2 break-all text-slate-800">{log.recipients.join(', ')}</p>
                    {log.provider ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {log.provider}
                        {log.provider_message_id ? ` · ${log.provider_message_id}` : ''}
                      </p>
                    ) : null}
                    {log.error_message ? (
                      <p className="mt-2 text-xs text-red-800">{log.error_message}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
