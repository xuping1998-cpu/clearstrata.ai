/** bank_transactions.amount: positive = inflow, negative = outflow */

export type BankAmountColumns = {
  income: number | null;
  expense: number | null;
};

export function splitBankTransactionAmount(amount: number): BankAmountColumns {
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt === 0) {
    return { income: null, expense: null };
  }
  if (amt > 0) {
    return { income: amt, expense: null };
  }
  return { income: null, expense: Math.abs(amt) };
}

export function formatBankAmountCell(value: number | null): string {
  return value != null && value > 0 ? value.toFixed(2) : '';
}
