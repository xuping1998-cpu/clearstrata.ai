/**
 * 服务端发送审计报告 PDF：优先 Resend，其次 SMTP（nodemailer）。
 * 环境变量：
 * - Resend: RESEND_API_KEY, RESEND_FROM_EMAIL | RESEND_FROM
 * - SMTP: SMTP_HOST, SMTP_PORT (587), SMTP_SECURE (true|false), SMTP_USER, SMTP_PASS, SMTP_FROM
 */
import { Resend } from 'resend';
import nodemailer from 'nodemailer';

export type EmailSendResult = { provider: 'resend' | 'smtp'; messageId?: string };

export async function sendInvoiceAuditPdfEmail(opts: {
  to: string[];
  subject: string;
  html: string;
  pdfBuffer: Buffer;
  pdfFilename: string;
}): Promise<EmailSendResult> {
  const to = opts.to.filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()));
  if (to.length === 0) {
    throw new Error('NO_VALID_RECIPIENTS');
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    const resend = new Resend(resendKey);
    const from =
      process.env.RESEND_FROM_EMAIL?.trim() ||
      process.env.RESEND_FROM?.trim() ||
      'onboarding@resend.dev';
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: opts.subject,
      html: opts.html,
      attachments: [{ filename: opts.pdfFilename, content: opts.pdfBuffer }],
    });
    if (error) {
      const msg = 'message' in error ? String((error as { message: string }).message) : String(error);
      throw new Error(msg);
    }
    return { provider: 'resend', messageId: data?.id };
  }

  const host = process.env.SMTP_HOST?.trim();
  if (!host) {
    throw new Error('No email provider: set RESEND_API_KEY or SMTP_HOST');
  }

  const port = Number(process.env.SMTP_PORT || '587');
  const secure = process.env.SMTP_SECURE === 'true';
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS ?? '';

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
  });

  const fromAddr =
    process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim() || 'noreply@localhost';

  const info = await transporter.sendMail({
    from: fromAddr,
    to: to.join(', '),
    subject: opts.subject,
    html: opts.html,
    attachments: [{ filename: opts.pdfFilename, content: opts.pdfBuffer }],
  });
  return { provider: 'smtp', messageId: info.messageId };
}
