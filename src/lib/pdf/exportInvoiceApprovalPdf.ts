import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '../supabase';
import type { QuoteVarianceResult } from '../quoteInvoiceVariance';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function money(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    approved: ['已通过', 'Approved'],
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

export type InvoiceApprovalPdfInvoice = {
  id: string;
  vendor_name: string;
  total_amount: number;
  invoice_date: string;
  invoice_number: string | null;
  status: string;
  related_task_id: string | null;
  approval_note?: string | null;
  review_notes?: string | null;
  verified_at?: string | null;
  verifier?: { full_name_en: string; full_name_zh?: string } | null;
};

export async function exportInvoiceApprovalPdf(opts: {
  zh: boolean;
  propertyName: string;
  propertyId: string | null;
  invoice: InvoiceApprovalPdfInvoice;
  quoteVariance: QuoteVarianceResult | null;
  sourceTaskTitle: string | null;
  approverDisplayName: string | null;
}): Promise<void> {
  const { zh, propertyName, propertyId, invoice, quoteVariance, sourceTaskTitle, approverDisplayName } = opts;
  const exportedAt = new Date();

  let taskLogs: { title: string | null; body: string; created_at: string }[] = [];
  if (invoice.related_task_id && propertyId) {
    const { data } = await supabase
      .from('manager_logs')
      .select('title, body, created_at')
      .eq('task_id', invoice.related_task_id)
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })
      .limit(3);
    taskLogs = (data ?? []).map((r) => ({
      title: r.title != null ? String(r.title) : null,
      body: String(r.body ?? '').trim(),
      created_at: r.created_at as string,
    }));
  }

  const hasQuote = Boolean(quoteVariance);
  const approvalNoteText =
    invoice.approval_note?.trim() ||
    (invoice.status === 'approved' && invoice.review_notes?.trim() ? invoice.review_notes.trim() : '') ||
    '';

  const title = zh ? 'ClearStrata 审批记录' : 'ClearStrata approval record';
  const propLine = zh ? `物业：${escapeHtml(propertyName)}` : `Property: ${escapeHtml(propertyName)}`;
  const timeLine = zh
    ? `导出时间：${escapeHtml(exportedAt.toLocaleString('zh-CN'))}`
    : `Exported: ${escapeHtml(exportedAt.toLocaleString('en-CA'))}`;

  const secBasic = zh ? '发票基本信息' : 'Invoice';
  const secQuote = zh ? '报价对比' : 'Quote comparison';
  const secApproval = zh ? '审批信息' : 'Approval';
  const secLogs = zh ? '相关执行摘要（最近任务日志）' : 'Recent task logs';

  const supplier = escapeHtml(invoice.vendor_name || '—');
  const invNo = invoice.invoice_number?.trim()
    ? escapeHtml(invoice.invoice_number)
    : zh
      ? '—'
      : '—';
  const invDate = escapeHtml(new Date(invoice.invoice_date).toLocaleDateString(zh ? 'zh-CN' : 'en-CA'));
  const amountStr = `$${money(Number(invoice.total_amount))}`;
  const taskTitle =
    invoice.related_task_id && sourceTaskTitle?.trim()
      ? escapeHtml(sourceTaskTitle.trim())
      : zh
        ? '无'
        : 'None';

  let quoteBlock: string;
  if (!hasQuote) {
    quoteBlock = zh
      ? '<p style="margin:0;color:#333;">暂无报价对比数据</p>'
      : '<p style="margin:0;color:#333;">No quote comparison data</p>';
  } else {
    const v = quoteVariance!;
    const pct = v.variancePercent * 100;
    const pctSign = pct >= 0 ? '+' : '';
    quoteBlock = `
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <tr><td style="padding:4px 8px;border:1px solid #ccc;">${zh ? '报价金额' : 'Quote'}</td><td style="padding:4px 8px;border:1px solid #ccc;font-weight:700;">$${money(v.quoteAmount)}</td></tr>
        <tr><td style="padding:4px 8px;border:1px solid #ccc;">${zh ? '发票金额' : 'Invoice'}</td><td style="padding:4px 8px;border:1px solid #ccc;font-weight:700;">$${money(v.invoiceAmount)}</td></tr>
        <tr><td style="padding:4px 8px;border:1px solid #ccc;">${zh ? '差异金额' : 'Variance ($)'}</td><td style="padding:4px 8px;border:1px solid #ccc;font-weight:700;">$${money(v.varianceAmount)}</td></tr>
        <tr><td style="padding:4px 8px;border:1px solid #ccc;">${zh ? '差异比例' : 'Variance (%)'}</td><td style="padding:4px 8px;border:1px solid #ccc;font-weight:700;">${pctSign}${pct.toFixed(1)}%</td></tr>
        <tr><td style="padding:4px 8px;border:1px solid #ccc;">${zh ? '预警等级' : 'Alert level'}</td><td style="padding:4px 8px;border:1px solid #ccc;font-weight:700;">${escapeHtml(warningLevelLabel(v, zh))}</td></tr>
      </table>`;
  }

  const resultLabel = escapeHtml(statusLabel(invoice.status, zh));
  const approver =
    approverDisplayName?.trim() ? escapeHtml(approverDisplayName.trim()) : zh ? '—' : '—';
  const verifiedAtStr = invoice.verified_at
    ? escapeHtml(new Date(invoice.verified_at).toLocaleString(zh ? 'zh-CN' : 'en-CA'))
    : zh
      ? '—'
      : '—';
  const noteDisplay =
    approvalNoteText.length > 0
      ? escapeHtml(approvalNoteText)
      : zh
        ? '未填写审批备注'
        : 'No approval note';

  let logsBlock: string;
  if (!invoice.related_task_id) {
    logsBlock = zh
      ? '<p style="margin:0;color:#666;">—</p>'
      : '<p style="margin:0;color:#666;">—</p>';
  } else if (taskLogs.length === 0) {
    logsBlock = zh
      ? '<p style="margin:0;color:#666;">暂无任务日志</p>'
      : '<p style="margin:0;color:#666;">No task logs</p>';
  } else {
    logsBlock = taskLogs
      .map(
        (lg, i) =>
          `<div style="margin-bottom:8px;padding:8px;border:1px solid #ddd;background:#fafafa;">
            <div style="font-size:10px;color:#666;margin-bottom:4px;">${i + 1}. ${escapeHtml(new Date(lg.created_at).toLocaleString(zh ? 'zh-CN' : 'en-CA'))}</div>
            ${lg.title?.trim() ? `<div style="font-weight:600;margin-bottom:4px;">${escapeHtml(lg.title.trim())}</div>` : ''}
            <div style="white-space:pre-wrap;word-break:break-word;">${escapeHtml(lg.body || (zh ? '（空）' : '(empty)'))}</div>
          </div>`,
      )
      .join('');
  }

  const html = `
    <div style="font-family:'Segoe UI','Microsoft YaHei','PingFang SC','Noto Sans SC',sans-serif;color:#111;font-size:12px;line-height:1.45;">
      <h1 style="font-size:18px;margin:0 0 12px;font-weight:700;border-bottom:2px solid #000;padding-bottom:8px;">${title}</h1>
      <p style="margin:4px 0;">${propLine}</p>
      <p style="margin:4px 0 20px;">${timeLine}</p>

      <h2 style="font-size:14px;margin:16px 0 8px;font-weight:700;">${secBasic}</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
        <tr><td style="padding:4px 8px;border:1px solid #ccc;width:28%;">${zh ? '供应商' : 'Vendor'}</td><td style="padding:4px 8px;border:1px solid #ccc;font-weight:600;">${supplier}</td></tr>
        <tr><td style="padding:4px 8px;border:1px solid #ccc;">${zh ? '发票金额' : 'Amount'}</td><td style="padding:4px 8px;border:1px solid #ccc;font-weight:700;font-size:13px;">${amountStr}</td></tr>
        <tr><td style="padding:4px 8px;border:1px solid #ccc;">${zh ? '发票日期' : 'Invoice date'}</td><td style="padding:4px 8px;border:1px solid #ccc;">${invDate}</td></tr>
        <tr><td style="padding:4px 8px;border:1px solid #ccc;">${zh ? '发票编号' : 'Invoice #'}</td><td style="padding:4px 8px;border:1px solid #ccc;">${invNo}</td></tr>
        <tr><td style="padding:4px 8px;border:1px solid #ccc;">${zh ? '来源任务' : 'Source task'}</td><td style="padding:4px 8px;border:1px solid #ccc;">${taskTitle}</td></tr>
      </table>

      <h2 style="font-size:14px;margin:16px 0 8px;font-weight:700;">${secQuote}</h2>
      ${quoteBlock}

      <h2 style="font-size:14px;margin:16px 0 8px;font-weight:700;">${secApproval}</h2>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:4px 8px;border:1px solid #ccc;width:28%;">${zh ? '审批结果' : 'Result'}</td><td style="padding:4px 8px;border:1px solid #ccc;font-weight:700;">${resultLabel}</td></tr>
        <tr><td style="padding:4px 8px;border:1px solid #ccc;">${zh ? '审批人' : 'Approver'}</td><td style="padding:4px 8px;border:1px solid #ccc;">${approver}</td></tr>
        <tr><td style="padding:4px 8px;border:1px solid #ccc;">${zh ? '审批时间' : 'Approved at'}</td><td style="padding:4px 8px;border:1px solid #ccc;">${verifiedAtStr}</td></tr>
        <tr><td style="padding:4px 8px;border:1px solid #ccc;vertical-align:top;">${zh ? '审批备注' : 'Note'}</td><td style="padding:4px 8px;border:1px solid #ccc;white-space:pre-wrap;word-break:break-word;font-weight:600;">${noteDisplay}</td></tr>
      </table>

      <h2 style="font-size:14px;margin:16px 0 8px;font-weight:700;">${secLogs}</h2>
      ${logsBlock}

      <p style="margin-top:24px;font-size:10px;color:#666;">${zh ? `发票 ID：${escapeHtml(invoice.id)}` : `Invoice ID: ${escapeHtml(invoice.id)}`}</p>
    </div>
  `;

  const host = document.createElement('div');
  host.style.cssText =
    'position:fixed;left:0;top:0;width:720px;padding:28px 32px;background:#ffffff;z-index:-1;opacity:0;pointer-events:none;';
  host.innerHTML = html;
  document.body.appendChild(host);

  try {
    const canvas = await html2canvas(host, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png', 1.0);
    const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * pageW) / canvas.width;
    let y = 0;
    while (y < imgH) {
      if (y > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, -y, imgW, imgH);
      y += pageH;
    }

    pdf.save(`approval-record-${invoice.id}.pdf`);
  } finally {
    document.body.removeChild(host);
  }
}
