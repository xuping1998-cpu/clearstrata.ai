/**
 * POST /api/reports/invoice-audit-send-email
 * 将已归档的审计报告 PDF 邮件发送给业委会/管理员（默认），或 body.to 指定列表。
 * 邮件：优先 Resend（RESEND_API_KEY），否则 SMTP（SMTP_HOST 等）。
 */
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendInvoiceAuditPdfEmail } from '../_lib/invoiceAuditEmail';

const BUCKET = 'invoice-audit-reports';
const STAFF = new Set(['council', 'admin', 'manager', 'property_admin']);

function cors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
}

async function resolveRecipientEmails(
  admin: ReturnType<typeof createClient>,
  propertyId: string,
  override: string[] | undefined,
): Promise<string[]> {
  if (override && override.length > 0) {
    return [...new Set(override.map((e) => e.trim()).filter(Boolean))];
  }
  const { data: rows } = await admin
    .from('property_members')
    .select('user_id')
    .eq('property_id', propertyId)
    .eq('status', 'active')
    .in('role', ['council', 'admin']);

  const ids = (rows ?? []).map((r: { user_id: string }) => r.user_id).filter(Boolean);
  if (ids.length === 0) return [];

  const { data: profs } = await admin.from('profiles').select('email').in('id', ids);
  const emails = (profs ?? [])
    .map((p: { email: string | null }) => p.email?.trim())
    .filter((e): e is string => !!e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  return [...new Set(emails)];
}

function buildEmailHtml(propertyName: string, fiscalYear: number, month: number, locale: 'en' | 'zh'): string {
  const period =
    locale === 'zh' ? `${fiscalYear}年${month}月` : `${fiscalYear}-${String(month).padStart(2, '0')}`;
  if (locale === 'zh') {
    return `
<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="font-family:Segoe UI,Microsoft YaHei,sans-serif;line-height:1.6;color:#0f172a;">
  <p>您好，</p>
  <p>附件为物业「<strong>${escapeHtml(propertyName)}</strong>」异常发票审计报告（数据所属月份：<strong>${period}</strong>）。</p>
  <p style="color:#64748b;font-size:12px;">本邮件由 ClearStrata 系统自动发送。</p>
</body></html>`;
  }
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="font-family:Segoe UI,Roboto,sans-serif;line-height:1.6;color:#0f172a;">
  <p>Hello,</p>
  <p>Please find attached the invoice audit report for <strong>${escapeHtml(propertyName)}</strong> (data period: <strong>${period}</strong>).</p>
  <p style="color:#64748b;font-size:12px;">Sent by ClearStrata.</p>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

  let body: Record<string, unknown> = {};
  try {
    const raw = req.body;
    body =
      typeof raw === 'string' ? (JSON.parse(raw) as Record<string, unknown>) : (raw as Record<string, unknown>) || {};
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const reportId = typeof body.reportId === 'string' ? body.reportId.trim() : '';
  const propertyId = typeof body.propertyId === 'string' ? body.propertyId.trim() : '';
  const locale = body.locale === 'zh' || body.locale === 'en' ? body.locale : 'en';

  const toRaw = body.to;
  const toOverride = Array.isArray(toRaw)
    ? toRaw.filter((x): x is string => typeof x === 'string')
    : undefined;

  if (!reportId || !propertyId) {
    return res.status(400).json({ error: 'reportId and propertyId are required' });
  }

  const { data: pu } = await admin
    .from('property_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('property_id', propertyId)
    .eq('status', 'active')
    .maybeSingle();

  const pr = typeof pu?.role === 'string' ? pu.role : '';
  if (!pu || !STAFF.has(pr)) {
    return res.status(403).json({ error: 'Insufficient role' });
  }

  const { data: row, error: rowErr } = await admin
    .from('invoice_audit_reports')
    .select(
      'id, property_id, storage_path, fiscal_year, month, email_status, emailed_to, content_hash, report_version',
    )
    .eq('id', reportId)
    .eq('property_id', propertyId)
    .maybeSingle();

  if (rowErr || !row) {
    return res.status(404).json({ error: 'Report not found' });
  }

  const r = row as {
    id: string;
    property_id: string;
    storage_path: string;
    fiscal_year: number;
    month: number;
    email_status: string;
    emailed_to: string | null;
    content_hash: string | null;
    report_version: number;
  };

  const { data: profTrigger } = await admin.from('profiles').select('id').eq('id', user.id).maybeSingle();
  const triggeredBy = profTrigger?.id ?? null;

  const { data: prop } = await admin.from('properties').select('name').eq('id', propertyId).maybeSingle();
  const propertyName = (prop?.name as string | undefined)?.trim() || propertyId.slice(0, 8);

  let recipients: string[];
  try {
    recipients = await resolveRecipientEmails(admin, propertyId, toOverride);
  } catch (e) {
    console.error('invoice-audit-send-email recipients', e);
    return res.status(500).json({ error: 'Failed to resolve recipients' });
  }

  if (recipients.length === 0) {
    return res.status(400).json({ error: 'NO_RECIPIENTS', message: 'No council/admin emails or invalid `to` list' });
  }

  const { data: fileBlob, error: dlErr } = await admin.storage.from(BUCKET).download(r.storage_path);
  if (dlErr || !fileBlob) {
    console.error('invoice-audit-send-email download', dlErr);
    return res.status(500).json({ error: 'Failed to load PDF from storage' });
  }

  const ab = await fileBlob.arrayBuffer();
  const pdfBuffer = Buffer.from(ab);
  const pdfName = `invoice-audit-${r.fiscal_year}-${String(r.month).padStart(2, '0')}.pdf`;

  const subject =
    locale === 'zh'
      ? `【${propertyName}】异常发票审计报告 ${r.fiscal_year}-${String(r.month).padStart(2, '0')}`
      : `[${propertyName}] Invoice audit report ${r.fiscal_year}-${String(r.month).padStart(2, '0')}`;

  const html = buildEmailHtml(propertyName, r.fiscal_year, r.month, locale);

  try {
    const result = await sendInvoiceAuditPdfEmail({
      to: recipients,
      subject,
      html,
      pdfBuffer,
      pdfFilename: pdfName,
    });

    const emailedTo = recipients.join(', ');
    const sentAt = new Date().toISOString();

    const { error: logErr } = await admin.from('invoice_audit_report_email_logs').insert({
      report_id: reportId,
      property_id: propertyId,
      sent_at: sentAt,
      recipients,
      status: 'sent',
      provider: result.provider,
      provider_message_id: result.messageId ?? null,
      triggered_by: triggeredBy,
      report_version: r.report_version,
    });
    if (logErr) {
      console.error('invoice-audit-send-email log insert', logErr);
    }

    const { error: upErr } = await admin
      .from('invoice_audit_reports')
      .update({
        email_status: 'sent',
        emailed_at: sentAt,
        emailed_to: emailedTo,
      })
      .eq('id', reportId);

    if (upErr) {
      console.error('invoice-audit-send-email update row', upErr);
    }

    return res.status(200).json({
      ok: true,
      reportId: r.id,
      provider: result.provider,
      messageId: result.messageId,
      emailedTo,
      resent: r.email_status === 'sent',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('invoice-audit-send-email send', e);

    const { error: logFailErr } = await admin.from('invoice_audit_report_email_logs').insert({
      report_id: reportId,
      property_id: propertyId,
      recipients,
      status: 'failed',
      error_message: msg.slice(0, 2000),
      triggered_by: triggeredBy,
      report_version: r.report_version,
    });
    if (logFailErr) {
      console.error('invoice-audit-send-email failed log insert', logFailErr);
    }

    await admin.from('invoice_audit_reports').update({ email_status: 'failed' }).eq('id', reportId);
    return res.status(500).json({ error: 'SEND_FAILED', message: msg });
  }
}
