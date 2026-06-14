/**
 * Phase 3A — Dual OCR Verification.
 *
 * A single OCR path (totals_block_text) can still mis-transcribe individual digits
 * (e.g. 22,187.50 → 22,296.88). This module parses BOTH the dedicated totals-block
 * transcription and the full verbatim transcription, cross-checks them, and selects
 * the more internally consistent / complete set. It NEVER computes, corrects, or
 * invents amounts — it only chooses between two code-parsed results and surfaces
 * conflicts transparently. Balance Due priority is unchanged.
 */
import {
  parseFinancialTotalsFromRawText,
  type FinancialTotalsParseResult,
} from './financialTotalsParser';

export type FinancialTotalsParseSource = 'totals_block_text' | 'raw_text_original';

export type DualConflictField =
  | 'subtotal'
  | 'sales_tax'
  | 'payments_credits'
  | 'invoice_total'
  | 'total_due'
  | 'amount_due'
  | 'balance_due'
  | 'total_amount';

export type DualVerificationReason =
  | 'totals_block_only'
  | 'raw_text_only'
  | 'both_match'
  | 'selected_totals_block_consistent'
  | 'selected_raw_text_consistent'
  | 'selected_more_complete'
  | 'selected_balance_due'
  // Phase 4A.2 — explicit Due-label protection.
  | 'selected_explicit_due'
  | 'selected_matching_explicit_due'
  | 'selected_raw_due_conflict'
  | 'selected_totals_due_conflict'
  | 'no_financial_totals';

export type ExplicitDueField = 'balance_due' | 'amount_due' | 'total_due';

export type DualFinancialTotalsVerification = {
  selected: FinancialTotalsParseResult;
  selected_source: FinancialTotalsParseSource | 'none';
  totals_block_result: FinancialTotalsParseResult | null;
  raw_text_result: FinancialTotalsParseResult | null;
  conflict: boolean;
  conflict_fields: DualConflictField[];
  reason: DualVerificationReason;
};

const TOLERANCE = 1;

const COMPARE_FIELDS: DualConflictField[] = [
  'subtotal',
  'sales_tax',
  'payments_credits',
  'invoice_total',
  'total_due',
  'amount_due',
  'balance_due',
  'total_amount',
];

function fieldValue(r: FinancialTotalsParseResult, key: DualConflictField): number | null {
  if (key === 'sales_tax') return r.sales_tax ?? r.tax_amount ?? null;
  return (r[key] ?? null) as number | null;
}

function hasUsefulTotal(r: FinancialTotalsParseResult): boolean {
  return (
    r.total_amount != null ||
    r.balance_due != null ||
    r.amount_due != null ||
    r.total_due != null
  );
}

function dueAmount(r: FinancialTotalsParseResult): number | null {
  return r.balance_due ?? r.amount_due ?? r.total_due ?? r.total_amount ?? null;
}

function isPositive(v: number | null | undefined): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0;
}

/**
 * Phase 4A.2 — the strongest payment candidate is an EXPLICIT, positive Due label.
 * Priority: Balance Due > Amount Due > Total Due. A 0/negative due is not explicit.
 */
export function getExplicitDue(r: FinancialTotalsParseResult): {
  value: number | null;
  field: ExplicitDueField | null;
  sourceText?: string | null;
} {
  if (isPositive(r.balance_due)) {
    return { value: r.balance_due, field: 'balance_due', sourceText: r.field_sources?.balance_due ?? null };
  }
  if (isPositive(r.amount_due)) {
    return { value: r.amount_due, field: 'amount_due', sourceText: r.field_sources?.amount_due ?? null };
  }
  if (isPositive(r.total_due)) {
    return { value: r.total_due, field: 'total_due', sourceText: r.field_sources?.total_due ?? null };
  }
  return { value: null, field: null, sourceText: null };
}

export function hasExplicitPositiveDue(r: FinancialTotalsParseResult): boolean {
  return getExplicitDue(r).value != null;
}

/** True when `r.total_amount` is missing/zero or disagrees with `dueVal` beyond tolerance. */
function totalDiffersFromDue(r: FinancialTotalsParseResult, dueVal: number): boolean {
  const t = r.total_amount;
  if (t == null) return true;
  return Math.abs(t - dueVal) > TOLERANCE;
}

function completenessScore(r: FinancialTotalsParseResult): number {
  let score = 0;
  for (const key of COMPARE_FIELDS) {
    if (fieldValue(r, key) != null) score += 1;
  }
  if (r.field_sources && Object.keys(r.field_sources).length > 0) score += 1;
  return score;
}

/**
 * Internal consistency: subtotal + tax - payments ≈ due (within tolerance).
 * Returns true/false when verifiable, null when there is not enough data.
 */
function internalConsistency(r: FinancialTotalsParseResult): boolean | null {
  const subtotal = r.subtotal;
  const tax = r.sales_tax ?? r.tax_amount ?? null;
  const due = dueAmount(r);
  if (subtotal == null || tax == null || due == null) return null;
  const payments = r.payments_credits ?? 0;
  return Math.abs(subtotal + tax - payments - due) <= TOLERANCE;
}

function computeConflictFields(
  a: FinancialTotalsParseResult,
  b: FinancialTotalsParseResult,
): DualConflictField[] {
  const out: DualConflictField[] = [];
  for (const key of COMPARE_FIELDS) {
    const va = fieldValue(a, key);
    const vb = fieldValue(b, key);
    if (va == null || vb == null) continue; // only compare commonly present fields
    if (Math.abs(va - vb) > TOLERANCE) out.push(key);
  }
  return out;
}

export function verifyDualFinancialTotals(input: {
  totalsBlockText?: string | null;
  rawTextOriginal?: string | null;
}): DualFinancialTotalsVerification {
  const totalsText = (input.totalsBlockText ?? '').trim();
  const rawText = (input.rawTextOriginal ?? '').trim();

  const totalsBlockResult = totalsText ? parseFinancialTotalsFromRawText(totalsText) : null;
  const rawTextResult = rawText ? parseFinancialTotalsFromRawText(rawText) : null;

  const tbUseful = totalsBlockResult != null && hasUsefulTotal(totalsBlockResult);
  const rtUseful = rawTextResult != null && hasUsefulTotal(rawTextResult);

  const empty = (): FinancialTotalsParseResult =>
    totalsBlockResult ??
    rawTextResult ??
    parseFinancialTotalsFromRawText('');

  // D — neither path produced a usable total.
  if (!tbUseful && !rtUseful) {
    return {
      selected: empty(),
      selected_source: 'none',
      totals_block_result: totalsBlockResult,
      raw_text_result: rawTextResult,
      conflict: false,
      conflict_fields: [],
      reason: 'no_financial_totals',
    };
  }

  // A — only totals block usable.
  if (tbUseful && !rtUseful) {
    return {
      selected: totalsBlockResult!,
      selected_source: 'totals_block_text',
      totals_block_result: totalsBlockResult,
      raw_text_result: rawTextResult,
      conflict: false,
      conflict_fields: [],
      reason: 'totals_block_only',
    };
  }

  // B — only raw text usable.
  if (!tbUseful && rtUseful) {
    return {
      selected: rawTextResult!,
      selected_source: 'raw_text_original',
      totals_block_result: totalsBlockResult,
      raw_text_result: rawTextResult,
      conflict: false,
      conflict_fields: [],
      reason: 'raw_text_only',
    };
  }

  // C — both usable. Cross-check.
  const tb = totalsBlockResult!;
  const rt = rawTextResult!;
  const conflictFields = computeConflictFields(tb, rt);
  const hasConflict = conflictFields.length > 0;

  // C.0 — Due safety override (Phase 4A.2). An explicit, positive Due label is the
  // payment authority and must NEVER be overwritten by a 0, a non-due total,
  // subtotal/tax/payments, or a line-item amount. This runs BEFORE both_match /
  // completeness so a missing/zero/non-due figure can never win over a real Due.
  const tbDue = getExplicitDue(tb);
  const rawDue = getExplicitDue(rt);

  const withDueFields = (base: DualConflictField[]): DualConflictField[] => {
    const out = base.slice();
    for (const f of ['total_amount', tbDue.field, rawDue.field] as (DualConflictField | null)[]) {
      if (f && !out.includes(f)) out.push(f);
    }
    return out;
  };

  // C.0 Case 1 — only the totals block carries an explicit Due, and the raw side's
  // total is missing/zero or disagrees. Protect the totals-block Due.
  if (tbDue.value != null && rawDue.value == null && totalDiffersFromDue(rt, tbDue.value)) {
    return {
      selected: tb,
      selected_source: 'totals_block_text',
      totals_block_result: tb,
      raw_text_result: rt,
      conflict: true,
      conflict_fields: withDueFields(conflictFields),
      reason: 'selected_explicit_due',
    };
  }

  // C.0 Case 2 — only the raw text carries an explicit Due, and the totals-block side's
  // total is missing/zero or disagrees. Protect the raw-text Due (e.g. invoice 83127).
  if (rawDue.value != null && tbDue.value == null && totalDiffersFromDue(tb, rawDue.value)) {
    return {
      selected: rt,
      selected_source: 'raw_text_original',
      totals_block_result: tb,
      raw_text_result: rt,
      conflict: true,
      conflict_fields: withDueFields(conflictFields),
      reason: 'selected_explicit_due',
    };
  }

  // C.0 Case 3 & 4 — both sides carry an explicit positive Due.
  if (tbDue.value != null && rawDue.value != null) {
    const dueMatches = Math.abs(tbDue.value - rawDue.value) <= TOLERANCE;
    const tbOk = internalConsistency(tb);
    const rtOk = internalConsistency(rt);

    if (dueMatches) {
      // Case 3 — agreed payable. Keep the Due; choose the more trustworthy side for
      // context (subtotal/tax). total_amount equals the Due on either side, so the
      // payable is never changed; only subtotal/tax may be flagged as conflicting.
      const pickRaw =
        (rtOk === true && tbOk !== true) ||
        (rtOk === tbOk && completenessScore(rt) > completenessScore(tb));
      return {
        selected: pickRaw ? rt : tb,
        selected_source: pickRaw ? 'raw_text_original' : 'totals_block_text',
        totals_block_result: tb,
        raw_text_result: rt,
        conflict: hasConflict,
        conflict_fields: conflictFields,
        reason: 'selected_matching_explicit_due',
      };
    }

    // Case 4 — the two Due labels disagree: a hard conflict on the payable itself.
    // Pick the internally consistent side; if neither is consistent prefer raw_text
    // (fuller context). Either way total_amount = that side's explicit Due.
    if (tbOk === true && rtOk !== true) {
      return {
        selected: tb,
        selected_source: 'totals_block_text',
        totals_block_result: tb,
        raw_text_result: rt,
        conflict: true,
        conflict_fields: withDueFields(conflictFields),
        reason: 'selected_totals_due_conflict',
      };
    }
    return {
      selected: rt,
      selected_source: 'raw_text_original',
      totals_block_result: tb,
      raw_text_result: rt,
      conflict: true,
      conflict_fields: withDueFields(conflictFields),
      reason: 'selected_raw_due_conflict',
    };
  }

  // C.1 — all commonly present fields agree → trust totals block.
  if (!hasConflict) {
    return {
      selected: tb,
      selected_source: 'totals_block_text',
      totals_block_result: tb,
      raw_text_result: rt,
      conflict: false,
      conflict_fields: [],
      reason: 'both_match',
    };
  }

  const tbConsistent = internalConsistency(tb);
  const rtConsistent = internalConsistency(rt);

  // C.2 — exactly one is internally consistent → pick that one.
  if (tbConsistent === true && rtConsistent !== true) {
    return {
      selected: tb,
      selected_source: 'totals_block_text',
      totals_block_result: tb,
      raw_text_result: rt,
      conflict: true,
      conflict_fields: conflictFields,
      reason: 'selected_totals_block_consistent',
    };
  }
  if (rtConsistent === true && tbConsistent !== true) {
    return {
      selected: rt,
      selected_source: 'raw_text_original',
      totals_block_result: tb,
      raw_text_result: rt,
      conflict: true,
      conflict_fields: conflictFields,
      reason: 'selected_raw_text_consistent',
    };
  }

  // C.3 — both consistent → pick more complete (tie → totals block).
  if (tbConsistent === true && rtConsistent === true) {
    const tbScore = completenessScore(tb);
    const rtScore = completenessScore(rt);
    const pickRaw = rtScore > tbScore;
    return {
      selected: pickRaw ? rt : tb,
      selected_source: pickRaw ? 'raw_text_original' : 'totals_block_text',
      totals_block_result: tb,
      raw_text_result: rt,
      conflict: true,
      conflict_fields: conflictFields,
      reason: 'selected_more_complete',
    };
  }

  // C.4 — both inconsistent/unverifiable. If Balance Due agrees but subtotal/tax
  // disagree, keep the agreed payable and pick the more complete source.
  const tbBalance = dueAmount(tb);
  const rtBalance = dueAmount(rt);
  const balanceAgrees =
    tbBalance != null && rtBalance != null && Math.abs(tbBalance - rtBalance) <= TOLERANCE;

  if (balanceAgrees) {
    const tbScore = completenessScore(tb);
    const rtScore = completenessScore(rt);
    const pickRaw = rtScore > tbScore;
    return {
      selected: pickRaw ? rt : tb,
      selected_source: pickRaw ? 'raw_text_original' : 'totals_block_text',
      totals_block_result: tb,
      raw_text_result: rt,
      conflict: true,
      conflict_fields: conflictFields,
      reason: 'selected_balance_due',
    };
  }

  // C.5 — fall back to completeness (tie → totals block).
  const tbScore = completenessScore(tb);
  const rtScore = completenessScore(rt);
  const pickRaw = rtScore > tbScore;
  return {
    selected: pickRaw ? rt : tb,
    selected_source: pickRaw ? 'raw_text_original' : 'totals_block_text',
    totals_block_result: tb,
    raw_text_result: rt,
    conflict: true,
    conflict_fields: conflictFields,
    reason: 'selected_more_complete',
  };
}
