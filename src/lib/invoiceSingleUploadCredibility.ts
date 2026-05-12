/** Match invoice-ocr extracted text only (credit adjustments). */
export const CREDIT_NOTE_OR_MEMO_TEXT_RE = /\b(credit\s*note|credit\s*memo)\b/i;

const UNKNOWN_VENDOR_EN = 'Unknown vendor';
const UNKNOWN_VENDOR_ZH = '未知供应商';

/** True when vendor looks like OCR placeholder empty. */
export function isRealVendorName(vendor: string, langEn: boolean): boolean {
  const t = vendor.trim();
  if (!t) return false;
  if (langEn) return t !== UNKNOWN_VENDOR_EN;
  return t !== UNKNOWN_VENDOR_ZH;
}

/**
 * Single-upload / OCR pre-fill trust gate (aligned with payable-package tight gate intent).
 */
export function ocrPrefillCredibility(opts: {
  vendorName: string;
  invoiceNumber: string | null | undefined;
  totalAmount: number;
  langEn: boolean;
  combinedTextHint: string;
}): boolean {
  const { vendorName, invoiceNumber, totalAmount: raw, langEn, combinedTextHint } = opts;
  const inv = (invoiceNumber ?? '').trim();
  const amt = Number(raw);
  const finite = Number.isFinite(amt);
  const nonZero = finite && Math.abs(amt) > 0;
  const negative = finite && amt < 0;
  const vendorOk = isRealVendorName(vendorName, langEn);
  const creditHint = CREDIT_NOTE_OR_MEMO_TEXT_RE.test(combinedTextHint);
  return (
    (vendorOk && nonZero) ||
    (Boolean(inv) && nonZero) ||
    (creditHint && negative)
  );
}
