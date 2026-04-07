import { supabase } from './supabase';
import { INVOICE_AUDIT_REPORT_SEND_EMAIL_PATH } from './api/invoiceAuditReport';
import {
  INVOICE_AUDIT_PREVIEW_ANOMALIES_SCHEMA_VERSION,
  type InvoiceAuditPreviewAnomalyItem,
} from './pdf/invoiceAuditReportCore';

const BUCKET = 'invoice-audit-reports';

export type InvoiceAuditEmailStatus = 'none' | 'pending' | 'sent' | 'failed';

export type InvoiceAuditReportRow = {
  id: string;
  fiscal_year: number;
  month: number;
  storage_path: string;
  created_at: string;
  email_status: InvoiceAuditEmailStatus;
  emailed_at: string | null;
  emailed_to: string | null;
  content_hash: string | null;
  report_version: number;
  summary_invoice_count: number | null;
  summary_total_amount: number | null;
  summary_high_risk_count: number | null;
  meeting_notes: string | null;
  /** 正式会议材料标题；PDF 封面主标题优先使用 */
  report_title: string | null;
  /** 生成时快照：审计结论 */
  audit_conclusion_text: string | null;
  /** 结论文案来源：规则模板 / AI / 人工 */
  audit_conclusion_source: 'rule' | 'ai' | 'manual' | null;
  /** 与 preview_anomalies_json 配套的 schema 版本；缺省按 1 解析 */
  preview_anomalies_schema_version: number | null;
  /** 生成时快照：至多 3 条异常摘要（JSON 结构依 preview_anomalies_schema_version） */
  preview_anomalies_json: unknown;
};

export type InvoiceAuditReportFilters = {
  fiscalYear?: number;
  month?: number;
};

export type InvoiceAuditReportEmailLogRow = {
  id: string;
  sent_at: string;
  recipients: string[];
  status: 'sent' | 'failed';
  provider: string | null;
  provider_message_id: string | null;
  error_message: string | null;
  created_at: string;
  report_version: number | null;
};

export function normalizeRecipientsJson(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === 'string');
  }
  if (typeof raw === 'string') {
    try {
      const j = JSON.parse(raw) as unknown;
      return Array.isArray(j) ? j.filter((x): x is string => typeof x === 'string') : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapPreviewItemRecords(arr: unknown[]): InvoiceAuditPreviewAnomalyItem[] {
  return arr
    .filter((x): x is Record<string, unknown> => x != null && typeof x === 'object' && !Array.isArray(x))
    .slice(0, 3)
    .map((x) => ({
      rule_code: typeof x.rule_code === 'string' ? x.rule_code : '',
      severity: typeof x.severity === 'string' ? x.severity : '',
      message_zh: typeof x.message_zh === 'string' ? x.message_zh : '',
      message_en: typeof x.message_en === 'string' ? x.message_en : '',
    }));
}

function parsePreviewPayloadVersion1(raw: unknown): InvoiceAuditPreviewAnomalyItem[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return mapPreviewItemRecords(raw);
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.items)) {
      return mapPreviewItemRecords(o.items);
    }
  }
  return [];
}

/**
 * 先根据 preview_anomalies_schema_version（缺省为 1）再解析 JSON。
 * 旧行无版本列时传入 null/undefined，按 v1 兼容。
 */
export function parsePreviewAnomaliesJson(
  raw: unknown,
  schemaVersion?: number | null,
  reportId?: string | null,
): InvoiceAuditPreviewAnomalyItem[] {
  const v =
    schemaVersion == null || Number.isNaN(Number(schemaVersion))
      ? INVOICE_AUDIT_PREVIEW_ANOMALIES_SCHEMA_VERSION
      : Math.floor(Number(schemaVersion));
  if (v !== INVOICE_AUDIT_PREVIEW_ANOMALIES_SCHEMA_VERSION) {
    console.warn(
      '[invoice audit] Unknown preview_anomalies_schema_version; reportId:',
      reportId ?? '(unknown)',
      'expected',
      INVOICE_AUDIT_PREVIEW_ANOMALIES_SCHEMA_VERSION,
      'got',
      schemaVersion,
    );
    return [];
  }
  return parsePreviewPayloadVersion1(raw);
}

export async function fetchInvoiceAuditReports(
  propertyId: string,
  filters?: InvoiceAuditReportFilters,
): Promise<InvoiceAuditReportRow[]> {
  let q = supabase
    .from('invoice_audit_reports')
    .select(
      'id, fiscal_year, month, storage_path, created_at, email_status, emailed_at, emailed_to, content_hash, report_version, summary_invoice_count, summary_total_amount, summary_high_risk_count, meeting_notes, report_title, audit_conclusion_text, audit_conclusion_source, preview_anomalies_schema_version, preview_anomalies_json',
    )
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (filters?.fiscalYear != null) {
    q = q.eq('fiscal_year', filters.fiscalYear);
  }
  if (filters?.month != null) {
    q = q.eq('month', filters.month);
  }

  const { data, error } = await q;

  if (error) throw error;
  return (data ?? []) as InvoiceAuditReportRow[];
}

export async function fetchInvoiceAuditReport(
  reportId: string,
  propertyId: string,
): Promise<InvoiceAuditReportRow | null> {
  const { data, error } = await supabase
    .from('invoice_audit_reports')
    .select(
      'id, fiscal_year, month, storage_path, created_at, email_status, emailed_at, emailed_to, content_hash, report_version, summary_invoice_count, summary_total_amount, summary_high_risk_count, meeting_notes, report_title, audit_conclusion_text, audit_conclusion_source, preview_anomalies_schema_version, preview_anomalies_json',
    )
    .eq('id', reportId)
    .eq('property_id', propertyId)
    .maybeSingle();

  if (error) throw error;
  return (data as InvoiceAuditReportRow) ?? null;
}

export async function fetchInvoiceAuditReportEmailLogs(
  reportId: string,
  propertyId: string,
): Promise<InvoiceAuditReportEmailLogRow[]> {
  const { data, error } = await supabase
    .from('invoice_audit_report_email_logs')
    .select('id, sent_at, recipients, status, provider, provider_message_id, error_message, created_at, report_version')
    .eq('report_id', reportId)
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      sent_at: r.sent_at as string,
      recipients: normalizeRecipientsJson(r.recipients),
      status: r.status as 'sent' | 'failed',
      provider: (r.provider as string | null) ?? null,
      provider_message_id: (r.provider_message_id as string | null) ?? null,
      error_message: (r.error_message as string | null) ?? null,
      created_at: r.created_at as string,
      report_version: typeof r.report_version === 'number' ? r.report_version : null,
    };
  });
}

/** 用于筛选器：该物业出现过的年份（降序） */
export async function fetchInvoiceAuditReportYears(propertyId: string): Promise<number[]> {
  const { data, error } = await supabase
    .from('invoice_audit_reports')
    .select('fiscal_year')
    .eq('property_id', propertyId)
    .order('fiscal_year', { ascending: false });

  if (error) throw error;
  const set = new Set<number>();
  for (const r of data ?? []) {
    const y = (r as { fiscal_year: number }).fiscal_year;
    if (Number.isFinite(y)) set.add(y);
  }
  return [...set].sort((a, b) => b - a);
}

/** 桶内路径 → 短期签名 URL 新窗口打开 */
export async function openInvoiceAuditReportPdf(storagePath: string): Promise<void> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 3600);
  if (error || !data?.signedUrl) {
    throw error ?? new Error('Signed URL failed');
  }
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
}

export type SendInvoiceAuditEmailBody = {
  reportId: string;
  propertyId: string;
  locale?: 'en' | 'zh';
  /** 覆盖默认收件人（业委会+管理员）；否则从成员表解析 */
  to?: string[];
};

export async function postInvoiceAuditReportEmail(body: SendInvoiceAuditEmailBody): Promise<{
  ok: boolean;
  emailedTo?: string;
  provider?: string;
  messageId?: string;
  resent?: boolean;
  error?: string;
  message?: string;
}> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error('NO_SESSION');
  }

  const res = await fetch(INVOICE_AUDIT_REPORT_SEND_EMAIL_PATH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    const err = typeof json.error === 'string' ? json.error : res.statusText;
    const msg = typeof json.message === 'string' ? json.message : '';
    throw new Error(msg ? `${err}: ${msg}` : err);
  }

  return json as {
    ok: boolean;
    emailedTo?: string;
    provider?: string;
    messageId?: string;
    resent?: boolean;
  };
}
