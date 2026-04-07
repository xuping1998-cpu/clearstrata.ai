import { jsPDF } from 'jspdf';
import { supabase } from '../supabase';
import { appendHtmlToPdf } from './htmlToPdf';
import {
  buildInvoiceAuditReportSectionHtmls,
  loadInvoiceAuditReportData,
  type InvoiceAuditReportRequest,
} from './invoiceAuditReportCore';

export type { InvoiceAuditReportRequest } from './invoiceAuditReportCore';

/**
 * 浏览器内回退：与 POST /api/reports/invoice-audit 内容一致（jsPDF + html2canvas）。
 */
export async function exportInvoiceAuditReportPdf(opts: InvoiceAuditReportRequest): Promise<Blob> {
  const data = await loadInvoiceAuditReportData(supabase, opts);
  const sections = buildInvoiceAuditReportSectionHtmls(data, opts);
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });

  for (let i = 0; i < sections.length; i++) {
    await appendHtmlToPdf(pdf, sections[i], i > 0);
  }

  return pdf.output('blob') as Blob;
}

export function downloadInvoiceAuditReportBlob(blob: Blob, propertyId: string): void {
  const stamp = new Date().toISOString().slice(0, 10);
  const name = `invoice-audit-report-${propertyId.slice(0, 8)}-${stamp}.pdf`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
