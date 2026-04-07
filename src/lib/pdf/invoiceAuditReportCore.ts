import type { SupabaseClient } from '@supabase/supabase-js';
import { INVOICE_AUDIT_RULE_CODES } from '../audit/invoiceAuditRules';
import { escapeHtml } from './escapeHtml';

/**
 * 与 POST /api/reports/invoice-audit 请求体一致。
 * meta 预留：邮件发送、归档、幂等与审计日志关联。
 */
export type InvoiceAuditReportRequest = {
  propertyId: string;
  propertyName: string;
  monthsBack?: number;
  locale: 'en' | 'zh';
  includeAiNarrative?: boolean;
  meta?: {
    clientRequestId?: string;
    /** 预留：异步任务、仅生成链接不返回流 */
    preferSignedUrl?: boolean;
    /** 是否归档到 Storage + invoice_audit_reports；默认 true（服务端仍受 INVOICE_AUDIT_REPORTS_ARCHIVE 环境变量约束） */
    archive?: boolean;
    /** 会议/呈报附说明，写入 PDF 与归档 meeting_notes */
    meetingNotes?: string;
    /** 正式会议材料标题；PDF 封面主标题优先使用 */
    reportTitle?: string;
  };
};

export type InvoiceRow = {
  id: string;
  vendor_name: string;
  file_name: string | null;
  invoice_number: string | null;
  invoice_date: string;
  total_amount: number;
  status: string;
  audit_summary: Record<string, unknown> | null;
};

export type AnomalyRow = {
  id: string;
  invoice_id: string;
  rule_code: string;
  severity: string;
  message_en: string;
  message_zh: string;
  details: Record<string, unknown> | null;
};

export type InvoiceAuditReportData = {
  invoices: InvoiceRow[];
  anomalies: AnomalyRow[];
  byInvoice: Map<string, AnomalyRow[]>;
  byMonth: Map<string, { count: number; total: number }>;
  byRule: Record<string, number>;
  monthKeys: string[];
  sumTotal: number;
  startStr: string;
  exportedAt: Date;
};

/**
 * 报告数据所属「日历年/月」：取本批异常发票中 **invoice_date 最新** 的一张（ISO 日期字符串比较即可）。
 * 用于归档表 fiscal_year / month，而非导出时的 UTC 时钟。
 */
export function computeReportDataCalendarPeriod(invoices: InvoiceRow[]): { fiscalYear: number; month: number } {
  if (invoices.length === 0) {
    const n = new Date();
    return { fiscalYear: n.getUTCFullYear(), month: n.getUTCMonth() + 1 };
  }
  let maxDate = invoices[0].invoice_date;
  for (const inv of invoices) {
    if (inv.invoice_date > maxDate) maxDate = inv.invoice_date;
  }
  const y = Number.parseInt(maxDate.slice(0, 4), 10);
  const m = Number.parseInt(maxDate.slice(5, 7), 10);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    const n = new Date();
    return { fiscalYear: n.getUTCFullYear(), month: n.getUTCMonth() + 1 };
  }
  return { fiscalYear: y, month: m };
}

/** 归档快照：异常发票笔数、金额合计、高危规则命中条数 */
export function computeArchiveSummaryStats(data: InvoiceAuditReportData): {
  summaryInvoiceCount: number;
  summaryTotalAmount: number;
  summaryHighRiskCount: number;
} {
  return {
    summaryInvoiceCount: data.invoices.length,
    summaryTotalAmount: data.sumTotal,
    summaryHighRiskCount: data.anomalies.filter((a) => a.severity === 'high').length,
  };
}

export type InvoiceAuditPreviewAnomalyItem = {
  rule_code: string;
  severity: string;
  message_zh: string;
  message_en: string;
};

/**
 * 异常摘要 JSON 的 schema 版本（与表列 preview_anomalies_schema_version 一致）。
 * 当前固定为 1；JSON 体为 { items: [...] }（历史可有裸数组或带 schema 字段的旧对象）。
 */
export const INVOICE_AUDIT_PREVIEW_ANOMALIES_SCHEMA_VERSION = 1 as const;
/** @deprecated 使用 INVOICE_AUDIT_PREVIEW_ANOMALIES_SCHEMA_VERSION */
export const INVOICE_AUDIT_PREVIEW_ANOMALIES_SCHEMA = INVOICE_AUDIT_PREVIEW_ANOMALIES_SCHEMA_VERSION;

export type InvoiceAuditPreviewPayloadV1 = {
  items: InvoiceAuditPreviewAnomalyItem[];
};

/** @deprecated 使用 InvoiceAuditPreviewPayloadV1 */
export type InvoiceAuditPreviewAnomaliesV1 = InvoiceAuditPreviewPayloadV1;

/** 审计结论文案来源（归档 audit_conclusion_source） */
export type AuditConclusionSource = 'rule' | 'ai' | 'manual';

function money(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * 未提供 report_title 时：与归档/PDF 一致的默认正式标题。
 * 中文：{年}年{月}月异常发票审计报告；英文：Invoice Audit Report - MM/YYYY
 */
export function buildDefaultInvoiceAuditReportTitle(
  fiscalYear: number,
  month: number,
  locale: 'en' | 'zh',
): string {
  const mm = String(month).padStart(2, '0');
  if (locale === 'zh') {
    return `${fiscalYear}年${month}月异常发票审计报告`;
  }
  return `Invoice Audit Report - ${mm}/${fiscalYear}`;
}

/** 由摘要统计生成结论文案（回填脚本与规则引擎共用） */
export function buildAuditConclusionFromSummaries(
  invoiceCount: number,
  sumTotal: number,
  highSeverityRuleHits: number,
  totalRuleHits: number,
  locale: 'en' | 'zh',
): string {
  const zh = locale === 'zh';
  const n = invoiceCount;
  const total = sumTotal;
  const high = highSeverityRuleHits;
  const hits = totalRuleHits;
  if (zh) {
    return `本报告共收录 ${n} 笔审计异常发票，涉及金额合计 $${money(total)}；规则命中高危 ${high} 条，规则命中总次数 ${hits} 次（单笔可含多条）。请在会议中结合附件与供应商说明逐项核对。`;
  }
  return `This report lists ${n} audit-flagged invoice(s) totaling $${money(total)}. High-severity rule hits: ${high}; total rule hits: ${hits} (multiple rules per invoice possible). Please review with supporting documents in the meeting.`;
}

/** 归档与详情页：会议可读的一句话审计结论（来源 rule） */
export function buildAuditConclusionText(data: InvoiceAuditReportData, locale: 'en' | 'zh'): string {
  return buildAuditConclusionFromSummaries(
    data.invoices.length,
    data.sumTotal,
    data.anomalies.filter((a) => a.severity === 'high').length,
    data.anomalies.length,
    locale,
  );
}

/**
 * 仅基于归档 summary_* 字段的规则版结论（旧数据回填与 DB 脚本对齐，不含「规则命中总次数」）。
 */
export function buildAuditConclusionFromReportSummaryFields(
  summaryInvoiceCount: number,
  summaryTotalAmount: number,
  summaryHighRiskCount: number,
  locale: 'en' | 'zh',
): string {
  const zh = locale === 'zh';
  const n = summaryInvoiceCount;
  const total = summaryTotalAmount;
  const high = summaryHighRiskCount;
  if (zh) {
    return `本报告共收录 ${n} 笔审计异常发票，涉及金额合计 $${money(total)}；高危规则命中 ${high} 条。请在会议中结合附件与供应商说明逐项核对。`;
  }
  return `This report covers ${n} audit-flagged invoice(s) totaling $${money(total)}. High-severity rule hits: ${high}. Please review with supporting documents in the meeting.`;
}

const sevRank = (s: string) => (s === 'high' ? 0 : s === 'medium' ? 1 : 2);

function topPreviewAnomalyItems(data: InvoiceAuditReportData): InvoiceAuditPreviewAnomalyItem[] {
  const sorted = [...data.anomalies].sort((a, b) => {
    const d = sevRank(a.severity) - sevRank(b.severity);
    if (d !== 0) return d;
    return a.id.localeCompare(b.id);
  });
  return sorted.slice(0, 3).map((a) => ({
    rule_code: a.rule_code,
    severity: a.severity,
    message_zh: a.message_zh,
    message_en: a.message_en,
  }));
}

/** 归档与详情：按严重度优先取前 3 条（JSON 仅含 items；版本见 preview_anomalies_schema_version 列） */
export function buildPreviewAnomaliesSnapshot(data: InvoiceAuditReportData): InvoiceAuditPreviewPayloadV1 {
  return {
    items: topPreviewAnomalyItems(data),
  };
}

/** @deprecated 使用 buildPreviewAnomaliesSnapshot；保留别名供旧 import */
export const buildPreviewAnomaliesJson = buildPreviewAnomaliesSnapshot;

function statusLabel(status: string, zh: boolean): string {
  const m: Record<string, [string, string]> = {
    pending_review: ['待审核', 'Pending review'],
    approved: ['已批准', 'Approved'],
    paid: ['已付款', 'Paid'],
    rejected: ['已拒绝', 'Rejected'],
    flagged: ['异常', 'Exception'],
  };
  const pair = m[status];
  if (pair) return zh ? pair[0] : pair[1];
  return status;
}

export function ruleLabel(code: string, zh: boolean): string {
  const labels: Record<string, [string, string]> = {
    [INVOICE_AUDIT_RULE_CODES.NO_QUOTE]: ['无关联报价', 'No linked quote'],
    [INVOICE_AUDIT_RULE_CODES.AMOUNT_GT_QUOTE_110]: ['金额超报价>10%', '>10% over quote'],
    [INVOICE_AUDIT_RULE_CODES.NO_BUDGET_CATEGORY]: ['预算科目/预算行', 'Budget category / line'],
    [INVOICE_AUDIT_RULE_CODES.DUPLICATE_INVOICE]: ['可能重复', 'Possible duplicate'],
    [INVOICE_AUDIT_RULE_CODES.VENDOR_PRICE_SPIKE]: ['供应商金额偏高', 'Vendor price spike'],
  };
  const p = labels[code];
  if (p) return zh ? p[0] : p[1];
  return code;
}

function narrativeForInvoice(anoms: AnomalyRow[], zh: boolean): string {
  if (anoms.length === 0) return zh ? '无规则记录。' : 'No rule records.';
  const highs = anoms.filter((a) => a.severity === 'high');
  const parts = anoms.map((a) => (zh ? a.message_zh : a.message_en));
  if (highs.length > 0) {
    return (
      (zh
        ? `结论：命中 ${highs.length} 条高危规则，建议在会议中优先讨论并核对支撑文件。`
        : `Conclusion: ${highs.length} high-severity rule(s) — prioritize review in the meeting.`) +
      ' ' +
      (zh ? '要点：' : 'Points: ') +
      parts.slice(0, 4).join('；')
    );
  }
  return (
    (zh ? '结论：以中低风险规则为主，建议按科目与供应商补充说明。' : 'Conclusion: medium/low risk — document by category and vendor.') +
    ' ' +
    parts.slice(0, 4).join(zh ? '；' : '; ')
  );
}

/**
 * 从 Supabase 拉取异常发票 + 异常明细（与浏览器端相同查询）。
 */
export async function loadInvoiceAuditReportData(
  supabase: SupabaseClient,
  opts: InvoiceAuditReportRequest,
): Promise<InvoiceAuditReportData> {
  const monthsBack = opts.monthsBack ?? 12;
  const exportedAt = new Date();

  const start = new Date();
  start.setMonth(start.getMonth() - monthsBack);
  const startStr = start.toISOString().slice(0, 10);

  const { data: invsRaw, error: invErr } = await supabase
    .from('invoices')
    .select(
      'id, vendor_name, file_name, invoice_number, invoice_date, total_amount, status, audit_summary',
    )
    .eq('property_id', opts.propertyId)
    .eq('is_abnormal', true)
    .gte('invoice_date', startStr)
    .order('invoice_date', { ascending: false });

  if (invErr) throw invErr;
  const invoices = (invsRaw ?? []) as InvoiceRow[];
  if (invoices.length === 0) {
    throw new Error('NO_AUDIT_INVOICES');
  }

  const ids = invoices.map((i) => i.id);
  const { data: anomsRaw, error: anErr } = await supabase
    .from('invoice_anomalies')
    .select('id, invoice_id, rule_code, severity, message_en, message_zh, details')
    .eq('property_id', opts.propertyId)
    .in('invoice_id', ids);

  if (anErr) throw anErr;
  const anomalies = (anomsRaw ?? []) as AnomalyRow[];

  const byInvoice = new Map<string, AnomalyRow[]>();
  for (const a of anomalies) {
    const list = byInvoice.get(a.invoice_id) ?? [];
    list.push(a);
    byInvoice.set(a.invoice_id, list);
  }

  const byMonth = new Map<string, { count: number; total: number }>();
  const byRule: Record<string, number> = {};
  let sumTotal = 0;
  for (const inv of invoices) {
    sumTotal += Number(inv.total_amount) || 0;
    const ym = inv.invoice_date?.slice(0, 7) || 'unknown';
    const cur = byMonth.get(ym) ?? { count: 0, total: 0 };
    cur.count += 1;
    cur.total += Number(inv.total_amount) || 0;
    byMonth.set(ym, cur);
    for (const a of byInvoice.get(inv.id) ?? []) {
      byRule[a.rule_code] = (byRule[a.rule_code] ?? 0) + 1;
    }
  }

  const monthKeys = [...byMonth.keys()].sort();

  return {
    invoices,
    anomalies,
    byInvoice,
    byMonth,
    byRule,
    monthKeys,
    sumTotal,
    startStr,
    exportedAt,
  };
}

/**
 * 与原先 jsPDF 分段渲染顺序一致：封面 → 摘要 → 清单 → 趋势 → 逐张分析。
 */
export function buildInvoiceAuditReportSectionHtmls(
  data: InvoiceAuditReportData,
  opts: InvoiceAuditReportRequest,
): string[] {
  const zh = opts.locale === 'zh';
  const monthsBack = opts.monthsBack ?? 12;
  const { invoices, byInvoice, byMonth, byRule, monthKeys, sumTotal, startStr, exportedAt } = data;

  const trendRows = monthKeys
    .map((ym) => {
      const v = byMonth.get(ym)!;
      return `<tr>
        <td style="padding:6px 8px;border:1px solid #333;">${escapeHtml(ym)}</td>
        <td style="padding:6px 8px;border:1px solid #333;text-align:right;">${v.count}</td>
        <td style="padding:6px 8px;border:1px solid #333;text-align:right;font-weight:600;">$${money(v.total)}</td>
      </tr>`;
    })
    .join('');

  const ruleRows = Object.entries(byRule)
    .sort((a, b) => b[1] - a[1])
    .map(
      ([code, n]) =>
        `<tr><td style="padding:6px 8px;border:1px solid #333;">${escapeHtml(ruleLabel(code, zh))}</td>
        <td style="padding:6px 8px;border:1px solid #333;text-align:right;">${n}</td></tr>`,
    )
    .join('');

  const periodLabel = zh
    ? `最近 ${monthsBack} 个月（发票日期 ≥ ${startStr}）`
    : `Last ${monthsBack} months (invoice date ≥ ${startStr})`;

  const docTypeTitle = zh ? '异常发票审计报告' : 'Invoice audit — abnormal invoices report';
  const { fiscalYear: coverFy, month: coverMo } = computeReportDataCalendarPeriod(invoices);
  const formalTitle = opts.meta?.reportTitle?.trim();
  const defaultFormalTitle = buildDefaultInvoiceAuditReportTitle(coverFy, coverMo, opts.locale);
  const coverMainTitle =
    formalTitle && formalTitle.length > 0 ? formalTitle : defaultFormalTitle;
  const coverSubtitle =
    formalTitle && formalTitle.length > 0
      ? `<p style="margin:10px 0 0;font-size:12px;color:#64748b;font-weight:500;">${escapeHtml(docTypeTitle)}</p>`
      : '';

  const coverHtml = `
    <div style="font-family:'Segoe UI','Microsoft YaHei','PingFang SC','Noto Sans SC',sans-serif;color:#0f172a;font-size:14px;line-height:1.6;min-height:880px;display:flex;flex-direction:column;justify-content:center;">
      <div style="text-align:center;border-bottom:3px solid #0f172a;padding-bottom:20px;margin-bottom:24px;">
        <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;margin-bottom:8px;">ClearStrata</div>
        <h1 style="font-size:24px;margin:0;font-weight:700;">${escapeHtml(coverMainTitle)}</h1>
        ${coverSubtitle}
      </div>
      <p style="margin:10px 0;text-align:center;font-size:13px;"><strong>${zh ? '物业' : 'Property'}：</strong>${escapeHtml(opts.propertyName)}</p>
      <p style="margin:10px 0;text-align:center;font-size:13px;"><strong>${zh ? '统计范围' : 'Period'}：</strong>${escapeHtml(periodLabel)}</p>
      <p style="margin:10px 0;text-align:center;font-size:12px;color:#475569;">${zh ? '导出时间' : 'Generated'}：${escapeHtml(exportedAt.toLocaleString(zh ? 'zh-CN' : 'en-CA'))}</p>
      <p style="margin:36px 0 0;text-align:center;font-size:13px;font-weight:600;">${zh ? `共 ${invoices.length} 笔异常发票 · 合计 $${money(sumTotal)}` : `${invoices.length} invoice(s) · Total $${money(sumTotal)}`}</p>
    </div>`;

  const execSummary = zh
    ? `<p style="margin:0 0 12px;">本报告汇总规则引擎标记的异常发票，用于业委会 / 物业例会审议。摘要基于系统规则命中次数与按月的金额分布，不代表最终会计或法律意见。</p>
       <ul style="margin:0;padding-left:18px;line-height:1.7;">
         <li>异常发票总数：<strong>${invoices.length}</strong></li>
         <li>涉及金额合计：<strong>$${money(sumTotal)}</strong></li>
         <li>规则命中总次数：<strong>${data.anomalies.length}</strong>（单笔可命中多条规则）</li>
         <li>覆盖月份数：<strong>${monthKeys.length}</strong></li>
       </ul>`
    : `<p style="margin:0 0 12px;">This report aggregates audit-flagged invoices for council / management review. Figures are system rule hits and monthly amounts — not legal or final accounting advice.</p>
       <ul style="margin:0;padding-left:18px;line-height:1.7;">
         <li>Abnormal invoices: <strong>${invoices.length}</strong></li>
         <li>Total amount: <strong>$${money(sumTotal)}</strong></li>
         <li>Total rule hits: <strong>${data.anomalies.length}</strong> (multiple rules per invoice possible)</li>
         <li>Months covered: <strong>${monthKeys.length}</strong></li>
       </ul>`;

  const meetingNotes = opts.meta?.meetingNotes?.trim();
  const meetingNotesBlock = meetingNotes
    ? zh
      ? `<div style="margin:14px 0;padding:12px 14px;border-left:4px solid #b45309;background:#fffbeb;border-radius:4px;">
           <h3 style="font-size:12px;margin:0 0 8px;font-weight:700;color:#92400e;">会议备注</h3>
           <p style="margin:0;white-space:pre-wrap;font-size:10px;line-height:1.55;color:#1c1917;">${escapeHtml(meetingNotes)}</p>
         </div>`
      : `<div style="margin:14px 0;padding:12px 14px;border-left:4px solid #b45309;background:#fffbeb;border-radius:4px;">
           <h3 style="font-size:12px;margin:0 0 8px;font-weight:700;color:#92400e;">Meeting notes</h3>
           <p style="margin:0;white-space:pre-wrap;font-size:10px;line-height:1.55;color:#1c1917;">${escapeHtml(meetingNotes)}</p>
         </div>`
    : '';

  const summaryHtml = `
    <div style="font-family:'Segoe UI','Microsoft YaHei','PingFang SC',sans-serif;color:#0f172a;font-size:11px;">
      <h2 style="font-size:17px;margin:0 0 14px;font-weight:700;border-left:4px solid #b45309;padding-left:10px;">${zh ? '一、执行摘要' : '1. Executive summary'}</h2>
      ${execSummary}
      ${meetingNotesBlock}
      <h3 style="font-size:13px;margin:18px 0 8px;font-weight:700;">${zh ? '规则命中分布' : 'Rules hit'}</h3>
      <table style="width:100%;border-collapse:collapse;font-size:10px;">
        <thead><tr style="background:#f8fafc;"><th style="padding:6px;border:1px solid #334155;text-align:left;">${zh ? '规则' : 'Rule'}</th><th style="padding:6px;border:1px solid #334155;width:18%;">${zh ? '次数' : 'Hits'}</th></tr></thead>
        <tbody>${ruleRows}</tbody>
      </table>
    </div>`;

  const tableRows = invoices
    .map((inv, idx) => {
      const rules = (byInvoice.get(inv.id) ?? []).map((a) => ruleLabel(a.rule_code, zh)).join(', ');
      const titleLine =
        [inv.vendor_name?.trim(), inv.file_name?.trim()].filter(Boolean).join(' · ') ||
        inv.invoice_number?.trim() ||
        '—';
      return `<tr>
        <td style="padding:5px 6px;border:1px solid #334155;">${idx + 1}</td>
        <td style="padding:5px 6px;border:1px solid #334155;">${escapeHtml(titleLine)}</td>
        <td style="padding:5px 6px;border:1px solid #334155;">${escapeHtml(inv.invoice_date)}</td>
        <td style="padding:5px 6px;border:1px solid #334155;text-align:right;">$${money(Number(inv.total_amount))}</td>
        <td style="padding:5px 6px;border:1px solid #334155;font-size:9px;">${escapeHtml(rules || '—')}</td>
        <td style="padding:5px 6px;border:1px solid #334155;">${escapeHtml(statusLabel(inv.status, zh))}</td>
      </tr>`;
    })
    .join('');

  const tableHtml = `
    <div style="font-family:'Segoe UI','Microsoft YaHei','PingFang SC',sans-serif;color:#0f172a;font-size:10px;">
      <h2 style="font-size:17px;margin:0 0 12px;font-weight:700;border-left:4px solid #b45309;padding-left:10px;">${zh ? '二、异常发票清单' : '2. Abnormal invoice register'}</h2>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#1e293b;color:#fff;">
            <th style="padding:6px 4px;border:1px solid #334155;width:5%;">#</th>
            <th style="padding:6px 4px;border:1px solid #334155;">${zh ? '供应商 / 文件' : 'Vendor / file'}</th>
            <th style="padding:6px 4px;border:1px solid #334155;width:12%;">${zh ? '日期' : 'Date'}</th>
            <th style="padding:6px 4px;border:1px solid #334155;width:12%;">${zh ? '金额' : 'Amount'}</th>
            <th style="padding:6px 4px;border:1px solid #334155;width:28%;">${zh ? '规则摘要' : 'Rules'}</th>
            <th style="padding:6px 4px;border:1px solid #334155;width:12%;">${zh ? '状态' : 'Status'}</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>`;

  const trendHtml = `
    <div style="font-family:'Segoe UI','Microsoft YaHei','PingFang SC',sans-serif;color:#0f172a;font-size:11px;">
      <h2 style="font-size:17px;margin:0 0 12px;font-weight:700;border-left:4px solid #b45309;padding-left:10px;">${zh ? '三、趋势分析（按发票月份）' : '3. Trend analysis (by invoice month)'}</h2>
      <p style="margin:0 0 10px;color:#475569;font-size:10px;">${zh ? '按发票开具月份汇总笔数与金额，用于观察异常是否集中爆发。' : 'Count and amount by invoice month to spot concentration.'}</p>
      <table style="width:100%;border-collapse:collapse;font-size:10px;">
        <thead><tr style="background:#f1f5f9;">
          <th style="padding:6px 8px;border:1px solid #334155;">${zh ? '月份' : 'Month'}</th>
          <th style="padding:6px 8px;border:1px solid #334155;">${zh ? '笔数' : 'Count'}</th>
          <th style="padding:6px 8px;border:1px solid #334155;">${zh ? '金额' : 'Amount'}</th>
        </tr></thead>
        <tbody>${trendRows}</tbody>
      </table>
    </div>`;

  const sections: string[] = [coverHtml, summaryHtml, tableHtml, trendHtml];

  for (let i = 0; i < invoices.length; i++) {
    const inv = invoices[i];
    const anoms = byInvoice.get(inv.id) ?? [];
    const rulesBlock = anoms
      .map(
        (a) =>
          `<tr>
            <td style="padding:4px 8px;border:1px solid #cbd5e1;">${escapeHtml(ruleLabel(a.rule_code, zh))}</td>
            <td style="padding:4px 8px;border:1px solid #cbd5e1;">${escapeHtml(a.severity)}</td>
            <td style="padding:4px 8px;border:1px solid #cbd5e1;font-size:9px;">${escapeHtml(zh ? a.message_zh : a.message_en)}</td>
          </tr>`,
      )
      .join('');

    const narrative =
      opts.includeAiNarrative !== false ? narrativeForInvoice(anoms, zh) : '';

    const detailHtml = `
      <div style="font-family:'Segoe UI','Microsoft YaHei','PingFang SC',sans-serif;color:#0f172a;font-size:11px;">
        <h2 style="font-size:16px;margin:0 0 10px;font-weight:700;">${zh ? '四、单条分析' : '4. Invoice analysis'} (${i + 1}/${invoices.length})</h2>
        <h3 style="font-size:12px;margin:12px 0 6px;font-weight:700;">${zh ? '基本信息' : 'Basics'}</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:8px;font-size:10px;">
          <tr><td style="padding:4px 8px;border:1px solid #cbd5e1;width:26%;">${zh ? '供应商' : 'Vendor'}</td><td style="padding:4px 8px;border:1px solid #cbd5e1;font-weight:600;">${escapeHtml(inv.vendor_name || '—')}</td></tr>
          <tr><td style="padding:4px 8px;border:1px solid #cbd5e1;">${zh ? '发票日期' : 'Date'}</td><td style="padding:4px 8px;border:1px solid #cbd5e1;">${escapeHtml(inv.invoice_date)}</td></tr>
          <tr><td style="padding:4px 8px;border:1px solid #cbd5e1;">${zh ? '金额' : 'Amount'}</td><td style="padding:4px 8px;border:1px solid #cbd5e1;font-weight:700;">$${money(Number(inv.total_amount))}</td></tr>
          <tr><td style="padding:4px 8px;border:1px solid #cbd5e1;">${zh ? '状态' : 'Status'}</td><td style="padding:4px 8px;border:1px solid #cbd5e1;">${escapeHtml(statusLabel(inv.status, zh))}</td></tr>
        </table>
        <h3 style="font-size:12px;margin:12px 0 6px;font-weight:700;">${zh ? '规则命中' : 'Rule hits'}</h3>
        <table style="width:100%;border-collapse:collapse;font-size:9px;">
          <thead><tr style="background:#f8fafc;"><th style="padding:4px 6px;border:1px solid #94a3b8;">${zh ? '规则' : 'Rule'}</th><th style="padding:4px 6px;border:1px solid #94a3b8;width:10%;">Sev.</th><th style="padding:4px 6px;border:1px solid #94a3b8;">${zh ? '说明' : 'Detail'}</th></tr></thead>
          <tbody>${rulesBlock || `<tr><td colspan="3" style="padding:6px;border:1px solid #cbd5e1;">${zh ? '无' : 'None'}</td></tr>`}</tbody>
        </table>
        ${narrative ? `<h3 style="font-size:12px;margin:14px 0 6px;font-weight:700;">${zh ? '分析结论（系统摘要）' : 'Analysis (system summary)'}</h3><p style="margin:0;line-height:1.65;font-size:10px;color:#334155;">${escapeHtml(narrative)}</p>` : ''}
        <p style="margin-top:12px;font-size:8px;color:#94a3b8;">ID: ${escapeHtml(inv.id)}</p>
      </div>`;

    sections.push(detailHtml);
  }

  return sections;
}

/** 服务端 Puppeteer：整份 HTML，章节间强制分页。 */
export function wrapInvoiceAuditReportHtmlForPrint(sections: string[]): string {
  const inner = sections
    .map(
      (s) =>
        `<div class="print-section" style="page-break-after:always;break-after:page;">${s}</div>`,
    )
    .join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; background: #fff; color: #0f172a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .print-section:last-child { page-break-after: auto; break-after: auto; }
  table { page-break-inside: auto; }
  tr { page-break-inside: avoid; page-break-after: auto; }
  @page { size: A4 portrait; margin: 10mm; }
</style></head><body>${inner}</body></html>`;
}
