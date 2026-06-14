/**
 * Phase 4B.1 — Invoice Boundary Detection (instrumentation only).
 *
 * A single uploaded PDF can contain MULTIPLE invoices, and one invoice can span
 * MULTIPLE pages. This module extracts per-page text (pdfjs, NO OCR / NO AI),
 * detects the invoice number printed on each page, and groups consecutive pages
 * by invoice number. It DOES NOT split the PDF, re-OCR, or touch any financial
 * total — it only records a boundary snapshot so the UI can warn the reviewer
 * when a package total may be incomplete. Real splitting is Phase 4B.2.
 */

export type BoundaryConfidence = 'high' | 'medium' | 'low';

export type PdfPageBoundary = {
  /** 0-based page index. */
  page_index: number;
  /** 1-based page number. */
  page_number: number;
  invoice_number: string | null;
  confidence: BoundaryConfidence;
  evidence: string[];
};

export type InvoicePageGroup = {
  group_id: string;
  invoice_number: string | null;
  /** 1-based page numbers belonging to this invoice. */
  pages: number[];
  confidence: BoundaryConfidence;
  reason: string;
};

export type BoundaryStatus =
  | 'single_invoice'
  | 'multi_invoice_grouped'
  | 'ambiguous'
  | 'failed';

export type PdfBoundarySnapshot = {
  source_file_name?: string | null;
  page_count: number;
  pages: PdfPageBoundary[];
  groups: InvoicePageGroup[];
  has_multiple_invoice_groups: boolean;
  has_multi_page_invoice: boolean;
  /** Optional hint: page text shows one invoice # but several totals blocks. */
  multiple_totals_detected?: boolean;
  boundary_status: BoundaryStatus;
};

const FAILED_SNAPSHOT: Omit<PdfBoundarySnapshot, 'source_file_name'> = {
  page_count: 0,
  pages: [],
  groups: [],
  has_multiple_invoice_groups: false,
  has_multi_page_invoice: false,
  boundary_status: 'failed',
};

export function failedBoundarySnapshot(sourceFileName?: string | null): PdfBoundarySnapshot {
  return { source_file_name: sourceFileName ?? null, ...FAILED_SNAPSHOT };
}

/** Tokens that look like an invoice id but are NOT (tax ids, property codes, phones). */
function isDisqualifiedNumber(value: string, contextBefore: string): boolean {
  const v = value.trim();
  if (!v) return true;
  // GST/HST/PST registration numbers.
  if (/\b(gst|hst|pst)\b/i.test(contextBefore) && /reg|no\.?|#/i.test(contextBefore)) return true;
  // Property / strata codes like BCS3736, BC53736.
  if (/^bc[s0-9]/i.test(v)) return true;
  // Phone numbers (10+ digits or NNN-NNN-NNNN).
  if (/^\d{3}[-.\s]?\d{3}[-.\s]?\d{4}$/.test(v)) return true;
  if (/^\d{10,}$/.test(v)) return true;
  // Pure dates (YYYY-MM-DD / MM/DD/YYYY).
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return true;
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(v)) return true;
  return false;
}

const HIGH_PATTERNS: RegExp[] = [
  /Invoice\s*#\s*[:#]?\s*([A-Z0-9][A-Z0-9-]{2,})/i,
  /Inv\.?\s*No\.?\s*[:#]?\s*([A-Z0-9][A-Z0-9-]{2,})/i,
  /Invoice\s+No\.?\s*[:#]?\s*([A-Z0-9][A-Z0-9-]{2,})/i,
  // "Invoice # <newline> <id>" columnar layout (Terms Date Invoice # / Net 30 ... 83127).
  /Invoice\s*#[^\n]*\n[^\n]*?\b(\d{4,})\b/i,
];

const MEDIUM_PATTERNS: RegExp[] = [
  /S\.?\s*O\.?\s*No\.?\s*[:#]?\s*([A-Z0-9][A-Z0-9-]{2,})/i,
  /Quote\s*#\s*[:#]?\s*([A-Z0-9][A-Z0-9-]{2,})/i,
  /Job\s*(?:No\.?|#)\s*[:#]?\s*([A-Z0-9][A-Z0-9-]{2,})/i,
];

function matchInvoiceNumber(
  text: string,
  patterns: RegExp[],
): { value: string; raw: string } | null {
  for (const re of patterns) {
    const m = re.exec(text);
    if (!m) continue;
    const value = (m[1] ?? '').trim();
    if (!value) continue;
    const idx = m.index;
    const contextBefore = text.slice(Math.max(0, idx - 24), idx + m[0].length);
    if (isDisqualifiedNumber(value, contextBefore)) continue;
    return { value, raw: m[0].replace(/\s+/g, ' ').trim() };
  }
  return null;
}

/**
 * Extract the invoice number printed on a single page of text. Priority:
 * Invoice # > Inv No > Invoice No (high) then S.O. No > Quote # > Job No (medium).
 */
export function extractInvoiceNumberFromPageText(text: string): {
  invoice_number: string | null;
  confidence: BoundaryConfidence;
  evidence: string[];
} {
  const cleaned = (text ?? '').replace(/\u00a0/g, ' ');
  const high = matchInvoiceNumber(cleaned, HIGH_PATTERNS);
  if (high) {
    return { invoice_number: high.value, confidence: 'high', evidence: [high.raw] };
  }
  const medium = matchInvoiceNumber(cleaned, MEDIUM_PATTERNS);
  if (medium) {
    return { invoice_number: medium.value, confidence: 'medium', evidence: [medium.raw] };
  }
  return { invoice_number: null, confidence: 'low', evidence: [] };
}

/** Lower of two confidence levels. */
function minConfidence(a: BoundaryConfidence, b: BoundaryConfidence): BoundaryConfidence {
  const rank: Record<BoundaryConfidence, number> = { high: 2, medium: 1, low: 0 };
  return rank[a] <= rank[b] ? a : b;
}

/**
 * Group consecutive pages by invoice number. Null-numbered pages attach to the
 * current open group (confidence degraded). A different number starts a new group.
 */
export function groupPdfPagesByInvoiceNumber(pages: PdfPageBoundary[]): InvoicePageGroup[] {
  const groups: InvoicePageGroup[] = [];
  if (pages.length === 0) return groups;

  let current: InvoicePageGroup | null = null;
  let groupCounter = 0;

  const startGroup = (page: PdfPageBoundary): InvoicePageGroup => {
    groupCounter += 1;
    return {
      group_id: `g${groupCounter}`,
      invoice_number: page.invoice_number,
      pages: [page.page_number],
      confidence: page.confidence,
      reason: page.invoice_number ? 'invoice_number_match' : 'no_invoice_number',
    };
  };

  for (const page of pages) {
    if (!current) {
      current = startGroup(page);
      continue;
    }

    if (page.invoice_number == null) {
      // Unlabeled page: continuation of the current invoice (degrade confidence).
      current.pages.push(page.page_number);
      current.confidence = minConfidence(current.confidence, 'medium');
      current.reason = 'continuation_unlabeled_page';
      continue;
    }

    if (current.invoice_number == null) {
      // Current group was unlabeled; adopt this number for it.
      current.invoice_number = page.invoice_number;
      current.pages.push(page.page_number);
      current.confidence = minConfidence(current.confidence, page.confidence);
      current.reason = 'adopted_invoice_number';
      continue;
    }

    if (page.invoice_number === current.invoice_number) {
      current.pages.push(page.page_number);
      current.confidence = minConfidence(current.confidence, page.confidence);
      continue;
    }

    // Different invoice number → close current group, open a new one.
    groups.push(current);
    current = startGroup(page);
  }

  if (current) groups.push(current);
  return groups;
}

/** Count totals-block signals on a page (used only for the multiple_totals hint). */
function countTotalsSignals(text: string): number {
  const m = text.match(/\b(balance\s+due|total\s+due|amount\s+due)\b/gi);
  return m ? m.length : 0;
}

function buildSnapshot(
  sourceFileName: string | null,
  pages: PdfPageBoundary[],
  pageTexts: string[],
): PdfBoundarySnapshot {
  const groups = groupPdfPagesByInvoiceNumber(pages);
  const labeledNumbers = new Set(
    groups.map((g) => g.invoice_number).filter((n): n is string => Boolean(n)),
  );

  const hasMultipleGroups = groups.length > 1;
  // Only a group with a recognized invoice number counts as a known multi-page invoice.
  const hasMultiPageInvoice = groups.some(
    (g) => g.invoice_number != null && g.pages.length > 1,
  );

  let boundary_status: BoundaryStatus;
  if (labeledNumbers.size === 0) {
    boundary_status = 'ambiguous';
  } else if (hasMultipleGroups && labeledNumbers.size > 1) {
    boundary_status = 'multi_invoice_grouped';
  } else {
    boundary_status = 'single_invoice';
  }

  // Hint: one invoice number but more than one totals block across the pages.
  const totalsSignals = pageTexts.reduce((acc, t) => acc + countTotalsSignals(t), 0);
  const multiple_totals_detected =
    boundary_status === 'single_invoice' && totalsSignals > 1 ? true : undefined;

  return {
    source_file_name: sourceFileName,
    page_count: pages.length,
    pages,
    groups,
    has_multiple_invoice_groups: hasMultipleGroups && labeledNumbers.size > 1,
    has_multi_page_invoice: hasMultiPageInvoice,
    ...(multiple_totals_detected ? { multiple_totals_detected } : {}),
    boundary_status,
  };
}

/** Build a snapshot directly from already-extracted page texts (used by tests). */
export function buildBoundarySnapshotFromPageTexts(
  pageTexts: string[],
  sourceFileName?: string | null,
): PdfBoundarySnapshot {
  if (pageTexts.length === 0) return failedBoundarySnapshot(sourceFileName);
  const pages: PdfPageBoundary[] = pageTexts.map((text, i) => {
    const ext = extractInvoiceNumberFromPageText(text);
    return {
      page_index: i,
      page_number: i + 1,
      invoice_number: ext.invoice_number,
      confidence: ext.confidence,
      evidence: ext.evidence,
    };
  });
  return buildSnapshot(sourceFileName ?? null, pages, pageTexts);
}

let pdfjsModulePromise: Promise<typeof import('pdfjs-dist')> | null = null;

async function loadPdfjs(): Promise<typeof import('pdfjs-dist')> {
  if (!pdfjsModulePromise) {
    pdfjsModulePromise = (async () => {
      const pdfjs = await import('pdfjs-dist');
      try {
        // Vite resolves the ?url suffix to a hashed asset URL for the worker.
        const workerUrl = (
          await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
        ).default as string;
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      } catch {
        /* If worker URL resolution fails, pdfjs falls back to the main thread. */
      }
      return pdfjs;
    })();
  }
  return pdfjsModulePromise;
}

function isPdfFile(file: File): boolean {
  const type = (file.type || '').toLowerCase();
  if (type.includes('pdf')) return true;
  return /\.pdf$/i.test(file.name || '');
}

/**
 * Detect invoice boundaries inside a PDF File. Returns `null` for non-PDF inputs
 * (e.g. images) where page boundaries are not applicable. NEVER throws — on any
 * failure it returns a `boundary_status: 'failed'` snapshot.
 *
 * This is pure instrumentation: it reads page text only, never OCRs, never
 * modifies financial figures.
 */
export async function detectPdfInvoiceBoundaries(
  file: File,
): Promise<PdfBoundarySnapshot | null> {
  if (!isPdfFile(file)) return null;

  try {
    const pdfjs = await loadPdfjs();
    const data = new Uint8Array(await file.arrayBuffer());
    const doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;

    const pageTexts: string[] = [];
    for (let i = 1; i <= doc.numPages; i += 1) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        .map((it) => (typeof (it as { str?: unknown }).str === 'string' ? (it as { str: string }).str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      pageTexts.push(text);
    }

    try {
      await doc.destroy();
    } catch {
      /* ignore */
    }

    if (pageTexts.length === 0) return failedBoundarySnapshot(file.name);
    return buildBoundarySnapshotFromPageTexts(pageTexts, file.name);
  } catch {
    return failedBoundarySnapshot(file.name);
  }
}
