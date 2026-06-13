/**
 * Phase 3 — Werner DHW golden fixtures (dev-only).
 *
 * The three Werner DHW invoices (79985-1/2/3) have historically been mis-read by
 * OCR inside the totals block (e.g. Subtotal 44,500 / GST 2,225 / Payments 3,246.75).
 * These fixtures pin the CORRECT verbatim totals blocks and the expected output of
 * `parseFinancialTotalsFromRawText`, so we can prove the code-based parser is right
 * regardless of OCR noise. Not wired into CI — call `runWernerGoldenTest()` manually
 * (e.g. via `npx tsx src/lib/procurement/__fixtures__/wernerDhwGolden.ts`).
 */
import {
  parseFinancialTotalsFromRawText,
  type FinancialTotalsParseResult,
} from '../financialTotalsParser';

export interface WernerGoldenCase {
  id: string;
  /** Verbatim totals block exactly as printed on the invoice. */
  totalsBlockText: string;
  expected: {
    subtotal: number;
    tax_amount: number;
    payments_credits: number;
    balance_due: number;
    total_amount: number;
    total_source: FinancialTotalsParseResult['total_source'];
  };
}

export const WERNER_DHW_GOLDEN: WernerGoldenCase[] = [
  {
    id: '79985-1',
    totalsBlockText: [
      'Subtotal $44,375.00',
      'Sales Tax $2,218.75',
      'Payments/Credits $0.00',
      'Balance Due $46,593.75',
    ].join('\n'),
    expected: {
      subtotal: 44375,
      tax_amount: 2218.75,
      payments_credits: 0,
      balance_due: 46593.75,
      total_amount: 46593.75,
      total_source: 'balance_due',
    },
  },
  {
    id: '79985-2',
    totalsBlockText: [
      'Subtotal $22,187.50',
      'Sales Tax $1,109.38',
      'Payments/Credits $0.00',
      'Balance Due $23,296.88',
    ].join('\n'),
    expected: {
      subtotal: 22187.5,
      tax_amount: 1109.38,
      payments_credits: 0,
      balance_due: 23296.88,
      total_amount: 23296.88,
      total_source: 'balance_due',
    },
  },
  {
    id: '79985-3',
    totalsBlockText: [
      'Subtotal $22,187.50',
      'Sales Tax $1,109.38',
      'Payments/Credits $0.00',
      'Balance Due $23,296.88',
    ].join('\n'),
    expected: {
      subtotal: 22187.5,
      tax_amount: 1109.38,
      payments_credits: 0,
      balance_due: 23296.88,
      total_amount: 23296.88,
      total_source: 'balance_due',
    },
  },
];

/**
 * Layout variants A–D for invoice 79985-1. All must parse to the same numbers; this
 * is the regression guard for the Phase 3 parser layout support.
 */
export const LAYOUT_VARIANTS_79985_1: Record<string, string> = {
  // A — standard one-per-line.
  standard: [
    'Subtotal $44,375.00',
    'Sales Tax $2,218.75',
    'Payments/Credits $0.00',
    'Balance Due $46,593.75',
  ].join('\n'),
  // B — OCR compressed onto a single line.
  inline: 'Subtotal $44,375.00 Sales Tax $2,218.75 Payments/Credits $0.00 Balance Due $46,593.75',
  // C — amounts first, then labels (columnar, values above labels).
  valuesThenLabels: [
    '$44,375.00',
    '$2,218.75',
    '$0.00',
    '$46,593.75',
    'Subtotal',
    'Sales Tax',
    'Payments/Credits',
    'Balance Due',
  ].join('\n'),
  // D — table rows split (label line, then amount line).
  labelThenAmount: [
    'Subtotal',
    '$44,375.00',
    'Sales Tax',
    '$2,218.75',
    'Payments/Credits',
    '$0.00',
    'Balance Due',
    '$46,593.75',
  ].join('\n'),
};

function approxEq(a: number | null, b: number, eps = 0.005): boolean {
  return a != null && Math.abs(a - b) <= eps;
}

export interface GoldenCheck {
  label: string;
  pass: boolean;
  details: string;
}

export function runWernerGoldenTest(): GoldenCheck[] {
  const checks: GoldenCheck[] = [];

  for (const c of WERNER_DHW_GOLDEN) {
    const r = parseFinancialTotalsFromRawText(c.totalsBlockText);
    const pass =
      approxEq(r.subtotal, c.expected.subtotal) &&
      approxEq(r.tax_amount, c.expected.tax_amount) &&
      approxEq(r.payments_credits, c.expected.payments_credits) &&
      approxEq(r.balance_due, c.expected.balance_due) &&
      approxEq(r.total_amount, c.expected.total_amount) &&
      r.total_source === c.expected.total_source;
    checks.push({
      label: `invoice ${c.id}`,
      pass,
      details: `subtotal=${r.subtotal} tax=${r.tax_amount} payments=${r.payments_credits} balance_due=${r.balance_due} total=${r.total_amount} source=${r.total_source}`,
    });
  }

  for (const [name, text] of Object.entries(LAYOUT_VARIANTS_79985_1)) {
    const r = parseFinancialTotalsFromRawText(text);
    const pass =
      approxEq(r.subtotal, 44375) &&
      approxEq(r.tax_amount, 2218.75) &&
      approxEq(r.payments_credits, 0) &&
      approxEq(r.balance_due, 46593.75) &&
      approxEq(r.total_amount, 46593.75) &&
      r.total_source === 'balance_due';
    checks.push({
      label: `layout ${name}`,
      pass,
      details: `subtotal=${r.subtotal} tax=${r.tax_amount} payments=${r.payments_credits} balance_due=${r.balance_due} total=${r.total_amount} source=${r.total_source}`,
    });
  }

  // Package total = sum of Balance Due across the 3 invoices.
  const pkg = WERNER_DHW_GOLDEN.reduce(
    (sum, c) => sum + parseFinancialTotalsFromRawText(c.totalsBlockText).balance_due!,
    0,
  );
  checks.push({
    label: 'package total (sum of Balance Due)',
    pass: approxEq(pkg, 93187.51),
    details: `sum=${Math.round(pkg * 100) / 100}`,
  });

  return checks;
}

// Allow direct execution via `npx tsx <thisFile>` without affecting the bundle.
declare const process: { argv?: string[] } | undefined;
const isDirectRun =
  typeof process !== 'undefined' &&
  Array.isArray(process?.argv) &&
  process!.argv!.some((a) => a.includes('wernerDhwGolden'));
if (isDirectRun) {
  const results = runWernerGoldenTest();
  let allPass = true;
  for (const r of results) {
    if (!r.pass) allPass = false;
    // eslint-disable-next-line no-console
    console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.label}\n      ${r.details}`);
  }
  // eslint-disable-next-line no-console
  console.log(allPass ? '\nALL GOLDEN CHECKS PASSED' : '\nSOME GOLDEN CHECKS FAILED');
}
