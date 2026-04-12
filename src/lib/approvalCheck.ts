export type ApprovalCheckInput = {
  total_amount: number | unknown;
  status: string;
  /** Set true when council/manager has formally approved (DB column). */
  approved?: boolean | null;
};

/**
 * Hard rule: payment executed without prior approval.
 * `paid` + not `approved` ⇒ process violation (bypass).
 */
export function checkApproval(invoice: ApprovalCheckInput): { bypassApproval: boolean } {
  const amt = Number(invoice.total_amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    return { bypassApproval: false };
  }
  const st = String(invoice.status || '').toLowerCase();
  const approved = invoice.approved === true;
  const bypassApproval = st === 'paid' && !approved;
  return { bypassApproval };
}
