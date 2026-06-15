/**
 * Phase 4B.2 — PDF page splitting / merging for multi-invoice scanned PDFs.
 *
 * A single scanned PDF (no text layer) can hold several invoices, and the Edge
 * `invoice-ocr` only reads ONE invoice per document call. To read them all we
 * split the PDF into single-page PDFs, OCR each page, then re-merge the pages
 * that belong to the same invoice number before a final group OCR.
 *
 * Uses pdf-lib (already a dependency). Never throws on bad input — callers
 * fall back to a single whole-PDF OCR when splitting is not possible.
 */
import { PDFDocument } from 'pdf-lib';

export type SinglePageFile = {
  /** 1-based page number within the original PDF. */
  page_number: number;
  file: File;
  /** Human-readable origin, e.g. "original.pdf#page=1". */
  source_label: string;
};

function isPdfFile(file: File): boolean {
  const type = (file.type || '').toLowerCase();
  if (type.includes('pdf')) return true;
  return /\.pdf$/i.test(file.name || '');
}

function baseName(name: string): string {
  return (name || 'quote.pdf').replace(/\.pdf$/i, '');
}

/**
 * Split a PDF File into one File per page. Returns [] for non-PDF input or on
 * any failure (caller should fall back to whole-file OCR).
 */
export async function splitPdfIntoSinglePageFiles(file: File): Promise<SinglePageFile[]> {
  if (!isPdfFile(file)) return [];

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pageCount = src.getPageCount();
    if (pageCount <= 0) return [];

    const out: SinglePageFile[] = [];
    const original = baseName(file.name);
    for (let i = 0; i < pageCount; i += 1) {
      const single = await PDFDocument.create();
      const [copied] = await single.copyPages(src, [i]);
      single.addPage(copied);
      const pageBytes = await single.save();
      const pageNumber = i + 1;
      const pageFile = new File([pageBytes], `${original}__page_${pageNumber}.pdf`, {
        type: 'application/pdf',
      });
      out.push({
        page_number: pageNumber,
        file: pageFile,
        source_label: `${file.name}#page=${pageNumber}`,
      });
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Merge several PDF Files (each typically one page) into a single PDF File.
 * Returns null on failure so the caller can fall back to a last-page strategy.
 */
export async function mergePdfPageFiles(files: File[], outputName: string): Promise<File | null> {
  if (files.length === 0) return null;
  if (files.length === 1) return files[0]!;

  try {
    const merged = await PDFDocument.create();
    for (const f of files) {
      const bytes = new Uint8Array(await f.arrayBuffer());
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const indices = doc.getPageIndices();
      const copied = await merged.copyPages(doc, indices);
      copied.forEach((p) => merged.addPage(p));
    }
    const out = await merged.save();
    const name = outputName.endsWith('.pdf') ? outputName : `${outputName}.pdf`;
    return new File([out], name, { type: 'application/pdf' });
  } catch {
    return null;
  }
}
