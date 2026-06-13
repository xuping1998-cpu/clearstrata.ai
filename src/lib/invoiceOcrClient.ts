export type InvoiceOcrLineItem = { description: string; amount: number };

export type InvoiceOcrExtractedForDb = {
  vendor_name: string;
  invoice_number: string | null;
  invoice_date: string;
  due_date: string | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  /** Explicit payment-block figures from invoice-ocr (Phase 2A.11). */
  balance_due: number | null;
  amount_due: number | null;
  sales_tax: number | null;
  payments_credits: number | null;
  invoice_total: number | null;
  hst_number: string | null;
  currency: string;
  category: string;
  description: string | null;
  line_items: InvoiceOcrLineItem[];
  has_anomalies: boolean;
  anomaly_notes: string;
  raw_text: string;
  /** Verbatim OCR transcription of the document (Phase 2A.11). */
  raw_text_original: string;
};

export type InvoiceOcrInvokeResult = {
  extracted: InvoiceOcrExtractedForDb;
  structured: {
    vendor?: string;
    amount?: string | number;
    date?: string;
    items?: Array<{ description?: string; amount?: string | number }>;
  };
  fiscalYear: number;
  /** From invoice-ocr extracted.confidence when present. */
  confidence: number | null;
};

function normalizeOcrConfidence(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.max(0, Math.min(1, v));
  if (typeof v === 'string' && v.trim() !== '') {
    const n = parseFloat(v);
    if (Number.isFinite(n)) return Math.max(0, Math.min(1, n));
  }
  return null;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = () => reject(new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

function parseAmount(s: unknown): number {
  if (typeof s === 'number' && Number.isFinite(s)) return s;
  if (typeof s !== 'string') return 0;
  const cleaned = s.replace(/[^\d.-]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Calls Edge `invoice-ocr` with a local or fetched file; does not touch the database.
 */
export async function invokeInvoiceOcrFromFile(file: File, langEn: boolean): Promise<InvoiceOcrInvokeResult> {
  const fileBase64 = await readFileAsBase64(file);
  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invoice-ocr`;
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileBase64,
      mimeType: file.type || 'application/pdf',
    }),
  });

  const data = await response.json();
  if (!data.success || !data.extracted) {
    const err = data as {
      message?: string;
      message_zh?: string;
      error?: string;
    };
    const msgEn = typeof err.message === 'string' ? err.message.trim() : '';
    const msgZh = typeof err.message_zh === 'string' ? err.message_zh.trim() : '';

    let hint = '';
    if (langEn) {
      if (msgEn) hint = msgEn;
      else if (msgZh) hint = msgZh;
    } else {
      if (msgZh) hint = msgZh;
      else if (msgEn) hint = msgEn;
    }

    if (!hint) {
      if (err.error === 'PDF_OCR_UNAVAILABLE') {
        hint = langEn
          ? 'PDF OCR is not enabled yet. Please upload an image instead.'
          : '当前暂不支持直接识别 PDF，请先上传 JPG 或 PNG 图片。';
      } else if (err.error === 'AI_QUOTA_EXCEEDED') {
        hint = langEn
          ? 'AI recognition is temporarily unavailable. Please check service quota and try again.'
          : 'AI 识别暂时不可用，请检查服务额度后再试。';
      } else if (err.error === 'AI_OCR_FAILED') {
        hint = langEn
          ? 'AI recognition is temporarily unavailable. Please try again later.'
          : 'AI 识别暂时不可用，请稍后再试。';
      } else {
        hint = langEn ? 'Could not process this file.' : '无法处理该文件。';
      }
    }
    throw new Error(hint);
  }

  const ex = data.extracted as {
    vendor?: string;
    invoice_number?: string;
    invoice_date?: string;
    total_amount?: string;
    tax_amount?: string;
    subtotal?: string;
    sales_tax?: string;
    payments_credits?: string;
    invoice_total?: string;
    balance_due?: string;
    amount_due?: string;
    currency?: string;
    summary?: string;
    description?: string;
    raw_text?: string;
    confidence?: number | string;
    items?: Array<{ description?: string; amount?: string }>;
  };

  const structured = data.structured as InvoiceOcrInvokeResult['structured'] | undefined;

  const positive = (n: number): number | null => (Number.isFinite(n) && n > 0 ? n : null);
  const balanceDue = positive(parseAmount(ex.balance_due));
  const amountDue = positive(parseAmount(ex.amount_due));
  const invoiceTotal = positive(parseAmount(ex.invoice_total));
  const paymentsCredits = positive(parseAmount(ex.payments_credits));
  const salesTax = positive(parseAmount(ex.sales_tax));

  // Payable total priority: Balance Due > Amount Due > model total > Invoice Total.
  const total =
    balanceDue ?? amountDue ?? positive(parseAmount(ex.total_amount)) ?? invoiceTotal ?? 0;
  const tax = positive(parseAmount(ex.tax_amount)) ?? salesTax ?? 0;
  const explicitSubtotal = positive(parseAmount(ex.subtotal));
  const subtotal = explicitSubtotal ?? Math.max(0, total - tax);

  const line_items: InvoiceOcrLineItem[] = Array.isArray(ex.items)
    ? ex.items.map((it) => ({
        description: String(it?.description ?? ''),
        amount: parseAmount(it?.amount),
      }))
    : [];

  const rawText = ex.raw_text || '';

  const extracted: InvoiceOcrExtractedForDb = {
    vendor_name: ex.vendor || (langEn ? 'Unknown vendor' : '未知供应商'),
    invoice_number: ex.invoice_number || null,
    invoice_date: ex.invoice_date || new Date().toISOString().split('T')[0],
    due_date: null,
    subtotal,
    tax_amount: tax,
    total_amount: total,
    balance_due: balanceDue,
    amount_due: amountDue,
    sales_tax: salesTax,
    payments_credits: paymentsCredits,
    invoice_total: invoiceTotal,
    hst_number: null,
    currency: ex.currency || 'CAD',
    category: 'general',
    description: (ex.description ?? ex.summary) || null,
    line_items,
    has_anomalies: false,
    anomaly_notes: '',
    raw_text: rawText,
    raw_text_original: rawText,
  };

  const invDateStr = extracted.invoice_date || new Date().toISOString().split('T')[0];
  const fiscalYear = parseInt(String(invDateStr).slice(0, 4), 10) || new Date().getFullYear();

  return {
    extracted,
    structured:
      structured ??
      ({
        vendor: extracted.vendor_name,
        amount: extracted.total_amount,
        date: extracted.invoice_date,
        items: line_items.map((x) => ({ description: x.description, amount: x.amount })),
      } as InvoiceOcrInvokeResult['structured']),
    fiscalYear,
    confidence: normalizeOcrConfidence(ex.confidence),
  };
}

/** Build a File from a public document URL (same-origin / CORS-permitted fetch). */
export async function fetchUrlAsInvoiceFile(documentUrl: string, fileNameHint: string): Promise<File> {
  const res = await fetch(documentUrl);
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  const blob = await res.blob();
  const mime = blob.type || 'application/octet-stream';
  const name = fileNameHint?.trim() || 'invoice';
  return new File([blob], name, { type: mime });
}
