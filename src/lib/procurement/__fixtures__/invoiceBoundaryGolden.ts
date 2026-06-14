/**
 * Phase 4B.1 — Invoice Boundary Detection golden fixtures (dev-only).
 *
 * Pins the expected output of per-page invoice-number extraction and page
 * grouping for the real Water Feature scenarios:
 *   - Werner 81276 spanning two pages  -> single multi-page invoice.
 *   - A 4-page PDF holding three invoices -> multi_invoice_grouped.
 *   - Pages with no recognizable invoice number -> ambiguous.
 *
 * Not wired into CI. Run manually:
 *   npx tsx src/lib/procurement/__fixtures__/invoiceBoundaryGolden.ts
 */
import {
  buildBoundarySnapshotFromPageTexts,
  extractInvoiceNumberFromPageText,
  type BoundaryStatus,
} from '../pdfInvoiceBoundary';

export interface BoundaryGoldenCase {
  id: string;
  /** One string per PDF page, in order. */
  pageTexts: string[];
  expected: {
    page_count: number;
    boundary_status: BoundaryStatus;
    has_multiple_invoice_groups: boolean;
    has_multi_page_invoice: boolean;
    /** Group invoice numbers, in order. */
    groups: Array<{ invoice_number: string | null; pages: number[] }>;
  };
}

export const BOUNDARY_GOLDEN: BoundaryGoldenCase[] = [
  {
    // Werner 81276 — one invoice across two pages.
    id: 'werner-81276-two-page',
    pageTexts: [
      'Werner Pool & Spa Services Invoice # 81276 Date 2025-11-03 ' +
        'Water feature pump replacement Page 1 of 2',
      'Werner Pool & Spa Services Invoice # 81276 (continued) ' +
        'Subtotal $1,200.00 Sales Tax $60.00 Balance Due $1,260.00 Page 2 of 2',
    ],
    expected: {
      page_count: 2,
      boundary_status: 'single_invoice',
      has_multiple_invoice_groups: false,
      has_multi_page_invoice: true,
      groups: [{ invoice_number: '81276', pages: [1, 2] }],
    },
  },
  {
    // Three invoices in one PDF; 81276 spans pages 1-2.
    id: 'water-2025-08-three-invoices',
    pageTexts: [
      'Invoice # 81276 Page 1 Water feature repairs Subtotal $1,000.00',
      'Invoice # 81276 Page 2 Balance Due $1,050.00',
      'Invoice No. 81277 Pond liner patch Balance Due $480.00',
      'Inv No: 81278 Pump motor Balance Due $920.00',
    ],
    expected: {
      page_count: 4,
      boundary_status: 'multi_invoice_grouped',
      has_multiple_invoice_groups: true,
      has_multi_page_invoice: true,
      groups: [
        { invoice_number: '81276', pages: [1, 2] },
        { invoice_number: '81277', pages: [3] },
        { invoice_number: '81278', pages: [4] },
      ],
    },
  },
  {
    // Unlabeled middle page attaches to the surrounding invoice group.
    id: 'unlabeled-middle-page',
    pageTexts: [
      'Invoice # 90001 Subtotal $500.00',
      'continuation page (no header) line items only',
      'Invoice # 90001 Balance Due $600.00',
    ],
    expected: {
      page_count: 3,
      boundary_status: 'single_invoice',
      has_multiple_invoice_groups: false,
      has_multi_page_invoice: true,
      groups: [{ invoice_number: '90001', pages: [1, 2, 3] }],
    },
  },
  {
    // No recognizable invoice number anywhere -> ambiguous, one catch-all group.
    id: 'ambiguous-no-invoice-number',
    pageTexts: [
      'Statement of work Pool maintenance GST No. 123456789 RT0001',
      'Property BCS3736 Phone 604-555-1212 Total $300.00',
    ],
    expected: {
      page_count: 2,
      boundary_status: 'ambiguous',
      has_multiple_invoice_groups: false,
      has_multi_page_invoice: false,
      groups: [{ invoice_number: null, pages: [1, 2] }],
    },
  },
];

/** Page-text disqualification cases: these must NOT be read as invoice numbers. */
export const NON_INVOICE_NUMBER_CASES: string[] = [
  'GST No. 123456789 RT0001',
  'HST Reg No: 887766554',
  'Phone: 604-555-1212',
  'Date 2025-11-03',
  'Property code BCS3736',
];

export interface GoldenCheck {
  label: string;
  pass: boolean;
  details: string;
}

function sameGroups(
  actual: Array<{ invoice_number: string | null; pages: number[] }>,
  expected: Array<{ invoice_number: string | null; pages: number[] }>,
): boolean {
  if (actual.length !== expected.length) return false;
  return actual.every((g, i) => {
    const e = expected[i]!;
    return (
      g.invoice_number === e.invoice_number &&
      g.pages.length === e.pages.length &&
      g.pages.every((p, j) => p === e.pages[j])
    );
  });
}

export function runBoundaryGoldenTest(): GoldenCheck[] {
  const checks: GoldenCheck[] = [];

  for (const c of BOUNDARY_GOLDEN) {
    const snap = buildBoundarySnapshotFromPageTexts(c.pageTexts, `${c.id}.pdf`);
    const actualGroups = snap.groups.map((g) => ({
      invoice_number: g.invoice_number,
      pages: g.pages,
    }));
    const pass =
      snap.page_count === c.expected.page_count &&
      snap.boundary_status === c.expected.boundary_status &&
      snap.has_multiple_invoice_groups === c.expected.has_multiple_invoice_groups &&
      snap.has_multi_page_invoice === c.expected.has_multi_page_invoice &&
      sameGroups(actualGroups, c.expected.groups);
    checks.push({
      label: `boundary ${c.id}`,
      pass,
      details:
        `status=${snap.boundary_status} pages=${snap.page_count} ` +
        `multiGroups=${snap.has_multiple_invoice_groups} multiPage=${snap.has_multi_page_invoice} ` +
        `groups=${actualGroups.map((g) => `${g.invoice_number ?? 'null'}[${g.pages.join('-')}]`).join(' ')}`,
    });
  }

  for (const text of NON_INVOICE_NUMBER_CASES) {
    const ext = extractInvoiceNumberFromPageText(text);
    checks.push({
      label: `reject non-invoice "${text.slice(0, 28)}"`,
      pass: ext.invoice_number === null,
      details: `invoice_number=${ext.invoice_number} confidence=${ext.confidence}`,
    });
  }

  return checks;
}

declare const process: { argv?: string[] } | undefined;
const isDirectRun =
  typeof process !== 'undefined' &&
  Array.isArray(process?.argv) &&
  process!.argv!.some((a) => a.includes('invoiceBoundaryGolden'));
if (isDirectRun) {
  const results = runBoundaryGoldenTest();
  let allPass = true;
  for (const r of results) {
    if (!r.pass) allPass = false;
    // eslint-disable-next-line no-console
    console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.label}\n      ${r.details}`);
  }
  // eslint-disable-next-line no-console
  console.log(allPass ? '\nALL BOUNDARY CHECKS PASSED' : '\nSOME BOUNDARY CHECKS FAILED');
}
