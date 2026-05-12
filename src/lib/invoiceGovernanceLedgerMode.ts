/**
 * Compares bookkeeping month (calendar year/month) to property governance_start_date.
 * Undefined/invalid date ⇒ historical reconstruction + unset.
 */
export type LedgerGovernanceMode = 'historical' | 'formal';

export function resolveLedgerGovernanceMode(
  ledgerYear: number,
  ledgerMonth: number,
  governanceStartIso: string | null | undefined,
): { mode: LedgerGovernanceMode; governanceUnset: boolean } {
  if (governanceStartIso == null || String(governanceStartIso).trim() === '') {
    return { mode: 'historical', governanceUnset: true };
  }
  const iso = String(governanceStartIso).slice(0, 10).trim();
  const m = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(iso);
  if (!m) {
    return { mode: 'historical', governanceUnset: true };
  }
  const gY = Number(m[1]);
  const gM = Number(m[2]);
  if (!Number.isFinite(gY) || !Number.isFinite(gM) || gM < 1 || gM > 12) {
    return { mode: 'historical', governanceUnset: true };
  }

  const L = ledgerYear * 100 + ledgerMonth;
  const G = gY * 100 + gM;

  return L < G ? { mode: 'historical', governanceUnset: false } : { mode: 'formal', governanceUnset: false };
}
