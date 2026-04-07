/**
 * POST /api/reports/invoice-audit — 服务端生成 PDF（Vercel Node 函数 + Puppeteer）。
 * 本地 `vite` 无 /api 路由时，开发环境可回退为浏览器内生成（见 postInvoiceAuditReport）。
 */
import { supabase } from '../supabase';
import type { InvoiceAuditReportRequest } from '../pdf/invoiceAuditReportCore';

export const INVOICE_AUDIT_REPORT_API_PATH = '/api/reports/invoice-audit';

/** POST 发送已归档报告 PDF 邮件（Resend 或 SMTP） */
export const INVOICE_AUDIT_REPORT_SEND_EMAIL_PATH = '/api/reports/invoice-audit-send-email';

export type { InvoiceAuditReportRequest } from '../pdf/invoiceAuditReportCore';

export { downloadInvoiceAuditReportBlob } from '../pdf/exportInvoiceAuditReportPdf';

export async function postInvoiceAuditReport(body: InvoiceAuditReportRequest): Promise<Blob> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error('NO_SESSION');
  }

  const res = await fetch(INVOICE_AUDIT_REPORT_API_PATH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (res.ok) {
    return res.blob();
  }

  if (res.status === 404 && import.meta.env.DEV) {
    const { exportInvoiceAuditReportPdf } = await import('../pdf/exportInvoiceAuditReportPdf');
    return exportInvoiceAuditReportPdf(body);
  }

  const ct = res.headers.get('content-type');
  if (ct?.includes('application/json')) {
    const j = (await res.json()) as { error?: string };
    throw new Error(j.error ?? `HTTP ${res.status}`);
  }
  throw new Error(`HTTP ${res.status}`);
}
