/**
 * Vercel serverless: POST /api/reports/invoice-audit
 * 服务端生成 PDF（Puppeteer + Chromium），与浏览器报告章节结构一致。
 *
 * 扩展预留：
 * - 将 meta.clientRequestId 写入审计表 / 对象存储后再返回流
 * - preferSignedUrl：改为上传 PDF 后返回 JSON { url, reportId }
 * - 邮件：队列任务引用同一 reportId
 * - 权限：当前校验物业成员角色；后续可接细粒度 finance:reports:export
 */
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { createHash, randomUUID } from 'node:crypto';
import {
  buildAuditConclusionText,
  buildDefaultInvoiceAuditReportTitle,
  buildInvoiceAuditReportSectionHtmls,
  buildPreviewAnomaliesSnapshot,
  computeArchiveSummaryStats,
  computeReportDataCalendarPeriod,
  loadInvoiceAuditReportData,
  wrapInvoiceAuditReportHtmlForPrint,
  type InvoiceAuditReportRequest,
} from '../../src/lib/pdf/invoiceAuditReportCore';

const STAFF_ROLES = new Set(['council', 'admin', 'manager', 'property_admin']);
const BUCKET = 'invoice-audit-reports';

function cors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
}

function parseBody(req: VercelRequest): Record<string, unknown> {
  const raw = req.body;
  if (raw == null) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return raw as Record<string, unknown>;
}

function parseRequest(body: Record<string, unknown>): InvoiceAuditReportRequest | null {
  const propertyId = typeof body.propertyId === 'string' ? body.propertyId.trim() : '';
  const propertyName = typeof body.propertyName === 'string' ? body.propertyName.trim() : '';
  const locale = body.locale === 'en' || body.locale === 'zh' ? body.locale : null;
  if (!propertyId || !propertyName || !locale) return null;

  const monthsBack =
    typeof body.monthsBack === 'number' && Number.isFinite(body.monthsBack) && body.monthsBack > 0
      ? Math.min(120, Math.floor(body.monthsBack))
      : undefined;

  const includeAiNarrative =
    typeof body.includeAiNarrative === 'boolean' ? body.includeAiNarrative : undefined;

  const topMeetingNotes =
    typeof body.meetingNotes === 'string' ? body.meetingNotes.trim().slice(0, 8000) : undefined;

  const topReportTitle =
    typeof body.reportTitle === 'string' ? body.reportTitle.trim().slice(0, 500) : undefined;

  const metaRaw = body.meta;
  let meta: InvoiceAuditReportRequest['meta'];
  if (metaRaw && typeof metaRaw === 'object' && !Array.isArray(metaRaw)) {
    const m = metaRaw as Record<string, unknown>;
    const clientRequestId =
      typeof m.clientRequestId === 'string' ? m.clientRequestId.trim() : undefined;
    const preferSignedUrl = typeof m.preferSignedUrl === 'boolean' ? m.preferSignedUrl : undefined;
    const archive = typeof m.archive === 'boolean' ? m.archive : undefined;
    const fromMeta =
      typeof m.meetingNotes === 'string' ? m.meetingNotes.trim().slice(0, 8000) : undefined;
    const meetingNotes = fromMeta ?? topMeetingNotes;
    const fromMetaTitle =
      typeof m.reportTitle === 'string' ? m.reportTitle.trim().slice(0, 500) : undefined;
    const reportTitle = fromMetaTitle ?? topReportTitle;
    if (
      clientRequestId ||
      preferSignedUrl !== undefined ||
      archive !== undefined ||
      meetingNotes ||
      reportTitle
    ) {
      meta = { clientRequestId, preferSignedUrl, archive, meetingNotes, reportTitle };
    }
  } else if (topMeetingNotes || topReportTitle) {
    meta = { meetingNotes: topMeetingNotes, reportTitle: topReportTitle };
  }

  return {
    propertyId,
    propertyName,
    locale,
    monthsBack,
    includeAiNarrative,
    meta,
  };
}

async function pdfBufferFromHtml(html: string): Promise<Buffer> {
  const executablePath =
    process.env.VERCEL === '1' || process.env.VERCEL === 'true'
      ? await chromium.executablePath()
      : process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH || (await chromium.executablePath());

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: chromium.headless,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    const buf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
    });
    return Buffer.from(buf);
  } finally {
    await browser.close();
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('invoice-audit: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const accessToken = authHeader.slice('Bearer '.length).trim();
  if (!accessToken) {
    return res.status(401).json({ error: 'Missing access token' });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userErr,
  } = await admin.auth.getUser(accessToken);

  if (userErr || !user) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  const body = parseBody(req);
  const parsed = parseRequest(body);
  if (!parsed) {
    return res.status(400).json({ error: 'propertyId, propertyName, and locale (en|zh) are required' });
  }

  const { data: pu, error: puErr } = await admin
    .from('property_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('property_id', parsed.propertyId)
    .eq('status', 'active')
    .maybeSingle();

  if (puErr || !pu) {
    return res.status(403).json({ error: 'No access to this property' });
  }

  const pr = typeof pu.role === 'string' ? pu.role : '';
  if (!STAFF_ROLES.has(pr)) {
    return res.status(403).json({ error: 'Insufficient role to export invoice audit reports' });
  }

  let reportData;
  try {
    reportData = await loadInvoiceAuditReportData(admin, parsed);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'NO_AUDIT_INVOICES') {
      return res.status(400).json({ error: 'NO_AUDIT_INVOICES' });
    }
    console.error('invoice-audit load', e);
    return res.status(500).json({ error: msg || 'query failed' });
  }

  const sections = buildInvoiceAuditReportSectionHtmls(reportData, parsed);
  const html = wrapInvoiceAuditReportHtmlForPrint(sections);

  let pdfBuf: Buffer;
  try {
    pdfBuf = await pdfBufferFromHtml(html);
  } catch (e) {
    console.error('invoice-audit pdf', e);
    return res.status(500).json({ error: 'PDF generation failed' });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const name = `invoice-audit-report-${parsed.propertyId.slice(0, 8)}-${stamp}.pdf`;

  const archiveEnabled =
    process.env.INVOICE_AUDIT_REPORTS_ARCHIVE !== 'false' && parsed.meta?.archive !== false;

  let reportRowId: string | null = null;
  if (archiveEnabled) {
    const { fiscalYear, month: monthNum } = computeReportDataCalendarPeriod(reportData.invoices);
    const reportId = randomUUID();
    const storagePath = `${parsed.propertyId}/${fiscalYear}/${String(monthNum).padStart(2, '0')}/${reportId}.pdf`;

    const { error: upErr } = await admin.storage.from(BUCKET).upload(storagePath, pdfBuf, {
      contentType: 'application/pdf',
      upsert: false,
    });

    if (upErr) {
      console.error('invoice-audit storage upload', upErr);
    } else {
      const { data: prof } = await admin.from('profiles').select('id').eq('id', user.id).maybeSingle();
      const generatedBy = prof?.id ?? null;

      const contentHash = createHash('sha256').update(pdfBuf).digest('hex');
      const { summaryInvoiceCount, summaryTotalAmount, summaryHighRiskCount } =
        computeArchiveSummaryStats(reportData);
      const meetingNotes = parsed.meta?.meetingNotes?.trim().slice(0, 8000) || null;
      const reportTitle =
        parsed.meta?.reportTitle?.trim().slice(0, 500) ||
        buildDefaultInvoiceAuditReportTitle(fiscalYear, monthNum, parsed.locale);
      const auditConclusionText = buildAuditConclusionText(reportData, parsed.locale);
      const previewAnomaliesJson = buildPreviewAnomaliesSnapshot(reportData);

      const { data: maxRow } = await admin
        .from('invoice_audit_reports')
        .select('report_version')
        .eq('property_id', parsed.propertyId)
        .eq('fiscal_year', fiscalYear)
        .eq('month', monthNum)
        .order('report_version', { ascending: false })
        .limit(1)
        .maybeSingle();

      const maxVer =
        maxRow && typeof (maxRow as { report_version: unknown }).report_version === 'number'
          ? (maxRow as { report_version: number }).report_version
          : 0;
      const reportVersion = maxVer + 1;

      const { data: inserted, error: insErr } = await admin
        .from('invoice_audit_reports')
        .insert({
          id: reportId,
          property_id: parsed.propertyId,
          fiscal_year: fiscalYear,
          month: monthNum,
          generated_by: generatedBy,
          client_request_id: parsed.meta?.clientRequestId?.trim() || null,
          storage_path: storagePath,
          content_hash: contentHash,
          report_version: reportVersion,
          summary_invoice_count: summaryInvoiceCount,
          summary_total_amount: summaryTotalAmount,
          summary_high_risk_count: summaryHighRiskCount,
          meeting_notes: meetingNotes,
          report_title: reportTitle,
          audit_conclusion_text: auditConclusionText,
          audit_conclusion_source: 'rule',
          preview_anomalies_schema_version: 1,
          preview_anomalies_json: previewAnomaliesJson,
        })
        .select('id')
        .single();

      if (insErr) {
        console.error('invoice-audit_reports insert', insErr);
      } else if (inserted?.id) {
        reportRowId = inserted.id;
      }
    }
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
  if (parsed.meta?.clientRequestId) {
    res.setHeader('X-Client-Request-Id', parsed.meta.clientRequestId);
  }
  if (reportRowId) {
    res.setHeader('X-Report-Id', reportRowId);
  }
  return res.status(200).send(pdfBuf);
}
