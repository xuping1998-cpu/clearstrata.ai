import { jsPDF } from 'jspdf';
import { supabase } from '../supabase';
import { appendHtmlToPdf, escapeHtml } from './htmlToPdf';
import { fetchTaskTitleByInvoiceIds } from '../invoiceTaskLinks';
import { computeQuoteInvoiceVariance, isRedAlertVariance, type QuoteVarianceResult } from '../quoteInvoiceVariance';

function money(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** 当月 [year, month 1–12] 的 invoice_date 字符串范围（本地日历） */
export function getLocalMonthInvoiceDateRange(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    start: `${year}-${pad(month)}-01`,
    end: `${year}-${pad(month)}-${pad(end.getDate())}`,
  };
}

function warningLevelLabel(v: QuoteVarianceResult, zh: boolean): string {
  if (v.belowQuote) return zh ? '低于报价' : 'Below quote';
  switch (v.warningLevel) {
    case 'danger':
      return zh ? '红色预警' : 'Red alert';
    case 'warning':
      return zh ? '偏高' : 'Elevated';
    default:
      return zh ? '正常' : 'Normal';
  }
}

function statusLabel(status: string, zh: boolean): string {
  const m: Record<string, [string, string]> = {
    pending_review: ['待审核', 'Pending review'],
    approved: ['已批准', 'Approved'],
    paid: ['已付款', 'Paid'],
    rejected: ['已拒绝', 'Rejected'],
    flagged: ['异常', 'Exception'],
    pending_upload: ['上传中', 'Uploading'],
    ai_processing: ['识别中', 'AI processing'],
    ai_extraction_failed: ['识别失败', 'Extraction failed'],
  };
  const pair = m[status];
  if (pair) return zh ? pair[0] : pair[1];
  return status;
}

type InvoiceRow = {
  id: string;
  vendor_name: string;
  file_name: string | null;
  invoice_number: string | null;
  invoice_date: string;
  total_amount: number;
  status: string;
  quote_id: string;
  related_task_id: string | null;
  approval_note?: string | null;
  review_notes?: string | null;
  verified_at?: string | null;
  verifier?: { full_name_en: string; full_name_zh?: string } | null;
};

async function fetchRecentTaskLogs(
  propertyId: string,
  taskId: string,
  limit: number,
): Promise<{ title: string | null; body: string; created_at: string }[]> {
  const { data } = await supabase
    .from('manager_logs')
    .select('title, body, created_at')
    .eq('task_id', taskId)
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => ({
    title: r.title != null ? String(r.title) : null,
    body: String(r.body ?? '').trim(),
    created_at: r.created_at as string,
  }));
}

function approverName(inv: InvoiceRow, zh: boolean): string {
  if (!inv.verifier) return zh ? '无' : 'None';
  return zh ? inv.verifier.full_name_zh || inv.verifier.full_name_en : inv.verifier.full_name_en;
}

function approvalNoteDisplay(inv: InvoiceRow): string {
  const a = inv.approval_note?.trim();
  if (a) return a;
  if (inv.status === 'approved' && inv.review_notes?.trim()) return inv.review_notes.trim();
  return '';
}

async function htmlToPdfSection(pdf: jsPDF, html: string, prependNewPage: boolean): Promise<void> {
  await appendHtmlToPdf(pdf, html, prependNewPage);
}

/**
 * 本月异常发票会议包（红色预警 / variance ≥ 20% 且不低于报价）。
 * 无数据时抛错，由调用方提示。
 */
export async function exportMonthlyAbnormalInvoicesMeetingPackPdf(opts: {
  zh: boolean;
  propertyId: string;
  propertyName: string;
  /** 默认当前本地年月 */
  year?: number;
  month?: number;
}): Promise<void> {
  const { zh, propertyId, propertyName } = opts;
  const now = new Date();
  const year = opts.year ?? now.getFullYear();
  const month = opts.month ?? now.getMonth() + 1;
  const { start, end } = getLocalMonthInvoiceDateRange(year, month);
  const exportedAt = new Date();
  const rangeLabel = zh
    ? `${year}年${month}月1日 — ${year}年${month}月${new Date(year, month, 0).getDate()}日`
    : `${start} — ${end}`;

  const { data: invsRaw, error } = await supabase
    .from('invoices')
    .select(
      'id, vendor_name, file_name, invoice_number, invoice_date, total_amount, status, quote_id, related_task_id, approval_note, review_notes, verified_at, verifier:profiles!invoices_verified_by_fkey(full_name_en, full_name_zh)',
    )
    .eq('property_id', propertyId)
    .not('quote_id', 'is', null)
    .gte('invoice_date', start)
    .lte('invoice_date', end);

  if (error) throw error;

  const list = (invsRaw ?? []) as InvoiceRow[];
  if (list.length === 0) {
    throw new Error('NO_ABNORMAL_IN_MONTH');
  }

  const quoteIds = [...new Set(list.map((i) => i.quote_id).filter(Boolean))] as string[];
  const { data: quotes } = await supabase
    .from('procurement_quotes')
    .select('id, quoted_amount')
    .eq('property_id', propertyId)
    .in('id', quoteIds);
  const qMap = new Map((quotes ?? []).map((q) => [q.id, Number(q.quoted_amount)]));

  const abnormal: { inv: InvoiceRow; v: QuoteVarianceResult }[] = [];
  for (const inv of list) {
    const qa = qMap.get(inv.quote_id);
    const v = computeQuoteInvoiceVariance(qa, inv.total_amount);
    if (v && isRedAlertVariance(v)) {
      abnormal.push({ inv, v });
    }
  }

  if (abnormal.length === 0) {
    throw new Error('NO_ABNORMAL_IN_MONTH');
  }

  abnormal.sort((a, b) => new Date(b.inv.invoice_date).getTime() - new Date(a.inv.invoice_date).getTime());

  const ids = abnormal.map((x) => x.inv.id);
  const taskTitleMap = await fetchTaskTitleByInvoiceIds(propertyId, ids);

  const logsByInvoiceId = new Map<string, { title: string | null; body: string; created_at: string }[]>();
  await Promise.all(
    abnormal.map(async ({ inv }) => {
      if (!inv.related_task_id) {
        logsByInvoiceId.set(inv.id, []);
        return;
      }
      const logs = await fetchRecentTaskLogs(propertyId, inv.related_task_id, 3);
      logsByInvoiceId.set(inv.id, logs);
    }),
  );

  const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });

  const coverTitle = zh ? 'ClearStrata 本月异常发票会议包' : 'ClearStrata — Monthly abnormal invoices (meeting pack)';
  const coverHtml = `
    <div style="font-family:'Segoe UI','Microsoft YaHei','PingFang SC','Noto Sans SC',sans-serif;color:#111;font-size:14px;line-height:1.6;min-height:900px;display:flex;flex-direction:column;justify-content:center;">
      <h1 style="font-size:22px;margin:0 0 24px;font-weight:700;text-align:center;border-bottom:2px solid #000;padding-bottom:16px;">${coverTitle}</h1>
      <p style="margin:12px 0;text-align:center;font-size:13px;">${zh ? '物业' : 'Property'}：${escapeHtml(propertyName)}</p>
      <p style="margin:12px 0;text-align:center;font-size:13px;">${zh ? '统计范围（发票日期）' : 'Period (invoice date)'}：${escapeHtml(rangeLabel)}</p>
      <p style="margin:12px 0;text-align:center;font-size:12px;color:#444;">${zh ? '导出时间' : 'Exported'}：${escapeHtml(exportedAt.toLocaleString(zh ? 'zh-CN' : 'en-CA'))}</p>
      <p style="margin:48px 0 0;text-align:center;font-size:12px;color:#666;">${zh ? `共 ${abnormal.length} 笔异常发票` : `${abnormal.length} abnormal invoice(s)`}</p>
    </div>
  `;

  await htmlToPdfSection(pdf, coverHtml, false);

  const summaryRows = abnormal
    .map(({ inv, v }, idx) => {
      const titleLine =
        [inv.vendor_name?.trim(), inv.file_name?.trim()].filter(Boolean).join(' · ') ||
        inv.invoice_number?.trim() ||
        '—';
      const pct = v.variancePercent * 100;
      return `<tr>
        <td style="padding:6px 8px;border:1px solid #333;text-align:center;">${idx + 1}</td>
        <td style="padding:6px 8px;border:1px solid #333;">${escapeHtml(titleLine)}</td>
        <td style="padding:6px 8px;border:1px solid #333;text-align:right;font-weight:600;">$${money(inv.total_amount)}</td>
        <td style="padding:6px 8px;border:1px solid #333;text-align:right;">$${money(v.quoteAmount)}</td>
        <td style="padding:6px 8px;border:1px solid #333;text-align:right;font-weight:700;">+${pct.toFixed(1)}%</td>
        <td style="padding:6px 8px;border:1px solid #333;">${escapeHtml(warningLevelLabel(v, zh))}</td>
        <td style="padding:6px 8px;border:1px solid #333;">${escapeHtml(statusLabel(inv.status, zh))}</td>
      </tr>`;
    })
    .join('');

  const summaryHtml = `
    <div style="font-family:'Segoe UI','Microsoft YaHei','PingFang SC',sans-serif;color:#111;font-size:11px;">
      <h2 style="font-size:16px;margin:0 0 12px;font-weight:700;">${zh ? '摘要' : 'Summary'}</h2>
      <table style="width:100%;border-collapse:collapse;font-size:10px;">
        <thead>
          <tr style="background:#f0f0f0;">
            <th style="padding:6px 4px;border:1px solid #333;width:6%;">#</th>
            <th style="padding:6px 4px;border:1px solid #333;">${zh ? '供应商 / 标题' : 'Vendor / title'}</th>
            <th style="padding:6px 4px;border:1px solid #333;width:12%;">${zh ? '发票金额' : 'Inv.'}</th>
            <th style="padding:6px 4px;border:1px solid #333;width:12%;">${zh ? '报价' : 'Quote'}</th>
            <th style="padding:6px 4px;border:1px solid #333;width:10%;">${zh ? '差异%' : 'Δ%'}</th>
            <th style="padding:6px 4px;border:1px solid #333;width:10%;">${zh ? '预警' : 'Alert'}</th>
            <th style="padding:6px 4px;border:1px solid #333;width:12%;">${zh ? '状态' : 'Status'}</th>
          </tr>
        </thead>
        <tbody>${summaryRows}</tbody>
      </table>
    </div>
  `;

  await htmlToPdfSection(pdf, summaryHtml, true);

  for (let i = 0; i < abnormal.length; i++) {
    const { inv, v } = abnormal[i];
    const lt = taskTitleMap.get(inv.id);
    const taskTitle = lt?.title?.trim() ? lt.title : null;
    const logs = logsByInvoiceId.get(inv.id) ?? [];
    const pct = v.variancePercent * 100;
    const noteText = approvalNoteDisplay(inv);
    const noteHtml = noteText
      ? escapeHtml(noteText)
      : zh
        ? '未填写'
        : 'Not provided';

    let logsBlock: string;
    if (!inv.related_task_id) {
      logsBlock = `<p style="margin:0;">${zh ? '无' : 'None'}</p>`;
    } else if (logs.length === 0) {
      logsBlock = `<p style="margin:0;">${zh ? '暂无数据' : 'No data'}</p>`;
    } else {
      logsBlock = logs
        .map(
          (lg, j) =>
            `<div style="margin-bottom:6px;padding:6px;border:1px solid #ccc;background:#fafafa;font-size:10px;">
              <div style="color:#666;margin-bottom:2px;">${j + 1}. ${escapeHtml(new Date(lg.created_at).toLocaleString(zh ? 'zh-CN' : 'en-CA'))}</div>
              ${lg.title?.trim() ? `<div style="font-weight:600;">${escapeHtml(lg.title.trim())}</div>` : ''}
              <div style="white-space:pre-wrap;">${escapeHtml(lg.body || (zh ? '（空）' : '(empty)'))}</div>
            </div>`,
        )
        .join('');
    }

    const detailHtml = `
      <div style="font-family:'Segoe UI','Microsoft YaHei','PingFang SC',sans-serif;color:#111;font-size:11px;">
        <h2 style="font-size:15px;margin:0 0 10px;font-weight:700;border-bottom:1px solid #000;padding-bottom:6px;">
          ${zh ? '明细' : 'Detail'} ${i + 1} / ${abnormal.length}
        </h2>
        <h3 style="font-size:12px;margin:12px 0 6px;font-weight:700;">${zh ? '1. 发票基本信息' : '1. Invoice'}</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
          <tr><td style="padding:4px 8px;border:1px solid #ccc;width:28%;">${zh ? '供应商' : 'Vendor'}</td><td style="padding:4px 8px;border:1px solid #ccc;font-weight:600;">${escapeHtml(inv.vendor_name || '—')}</td></tr>
          <tr><td style="padding:4px 8px;border:1px solid #ccc;">${zh ? '发票日期' : 'Date'}</td><td style="padding:4px 8px;border:1px solid #ccc;">${escapeHtml(new Date(inv.invoice_date).toLocaleDateString(zh ? 'zh-CN' : 'en-CA'))}</td></tr>
          <tr><td style="padding:4px 8px;border:1px solid #ccc;">${zh ? '发票编号' : 'Invoice #'}</td><td style="padding:4px 8px;border:1px solid #ccc;">${inv.invoice_number?.trim() ? escapeHtml(inv.invoice_number) : zh ? '无' : 'None'}</td></tr>
          <tr><td style="padding:4px 8px;border:1px solid #ccc;">${zh ? '发票金额' : 'Amount'}</td><td style="padding:4px 8px;border:1px solid #ccc;font-weight:700;font-size:12px;">$${money(inv.total_amount)}</td></tr>
        </table>

        <h3 style="font-size:12px;margin:12px 0 6px;font-weight:700;">${zh ? '2. 报价对比' : '2. Quote comparison'}</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
          <tr><td style="padding:4px 8px;border:1px solid #ccc;">${zh ? '报价金额' : 'Quote'}</td><td style="padding:4px 8px;border:1px solid #ccc;font-weight:600;">$${money(v.quoteAmount)}</td></tr>
          <tr><td style="padding:4px 8px;border:1px solid #ccc;">${zh ? '发票金额' : 'Invoice'}</td><td style="padding:4px 8px;border:1px solid #ccc;font-weight:600;">$${money(v.invoiceAmount)}</td></tr>
          <tr><td style="padding:4px 8px;border:1px solid #ccc;">${zh ? '差异金额' : 'Variance'}</td><td style="padding:4px 8px;border:1px solid #ccc;">$${money(v.varianceAmount)}</td></tr>
          <tr><td style="padding:4px 8px;border:1px solid #ccc;">${zh ? '差异比例' : 'Δ %'}</td><td style="padding:4px 8px;border:1px solid #ccc;font-weight:700;">+${pct.toFixed(1)}%</td></tr>
          <tr><td style="padding:4px 8px;border:1px solid #ccc;">${zh ? '预警等级' : 'Alert'}</td><td style="padding:4px 8px;border:1px solid #ccc;font-weight:700;">${escapeHtml(warningLevelLabel(v, zh))}</td></tr>
        </table>

        <h3 style="font-size:12px;margin:12px 0 6px;font-weight:700;">${zh ? '3. 来源任务与执行摘要' : '3. Source task & logs'}</h3>
        <p style="margin:0 0 6px;"><strong>${zh ? '任务标题' : 'Task'}：</strong>${taskTitle ? escapeHtml(taskTitle) : zh ? '无' : 'None'}</p>
        ${logsBlock}

        <h3 style="font-size:12px;margin:12px 0 6px;font-weight:700;">${zh ? '4. 审批信息' : '4. Approval'}</h3>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:4px 8px;border:1px solid #ccc;width:28%;">${zh ? '审批状态' : 'Status'}</td><td style="padding:4px 8px;border:1px solid #ccc;">${escapeHtml(statusLabel(inv.status, zh))}</td></tr>
          <tr><td style="padding:4px 8px;border:1px solid #ccc;">${zh ? '审批人' : 'Approver'}</td><td style="padding:4px 8px;border:1px solid #ccc;">${escapeHtml(approverName(inv, zh))}</td></tr>
          <tr><td style="padding:4px 8px;border:1px solid #ccc;">${zh ? '审批时间' : 'Time'}</td><td style="padding:4px 8px;border:1px solid #ccc;">${inv.verified_at ? escapeHtml(new Date(inv.verified_at).toLocaleString(zh ? 'zh-CN' : 'en-CA')) : zh ? '无' : 'None'}</td></tr>
          <tr><td style="padding:4px 8px;border:1px solid #ccc;vertical-align:top;">${zh ? '审批备注' : 'Note'}</td><td style="padding:4px 8px;border:1px solid #ccc;white-space:pre-wrap;">${noteHtml}</td></tr>
        </table>
        <p style="margin-top:12px;font-size:9px;color:#666;">ID: ${escapeHtml(inv.id)}</p>
      </div>
    `;

    await htmlToPdfSection(pdf, detailHtml, true);
  }

  const ym = `${year}-${String(month).padStart(2, '0')}`;
  pdf.save(`meeting-pack-abnormal-invoices-${ym}.pdf`);
}
