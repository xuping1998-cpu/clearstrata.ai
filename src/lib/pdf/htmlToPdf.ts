import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export { escapeHtml } from './escapeHtml';

/**
 * Renders HTML to one or more PDF pages (image slices). A4 portrait.
 * @param prependNewPage if true, first slice starts on a new page (use false for cover on empty doc).
 */
export async function appendHtmlToPdf(pdf: jsPDF, html: string, prependNewPage: boolean): Promise<void> {
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
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * pageW) / canvas.width;
    let y = 0;
    let firstSlice = true;
    while (y < imgH) {
      if (prependNewPage && firstSlice) {
        pdf.addPage();
      } else if (!firstSlice) {
        pdf.addPage();
      }
      pdf.addImage(imgData, 'PNG', 0, -y, imgW, imgH);
      y += pageH;
      firstSlice = false;
    }
  } finally {
    document.body.removeChild(host);
  }
}
