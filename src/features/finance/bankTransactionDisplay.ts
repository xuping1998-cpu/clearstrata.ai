/** bank_transactions.amount: positive = inflow, negative = outflow */

export type BankAmountColumns = {
  income: number | null;
  expense: number | null;
};

export function splitBankTransactionAmount(amount: number | string | null | undefined): BankAmountColumns {
  const numericAmount =
    typeof amount === 'number' ? amount : Number(amount ?? 0);

  if (!Number.isFinite(numericAmount) || numericAmount === 0) {
    return { income: null, expense: null };
  }

  return {
    income: numericAmount > 0 ? numericAmount : null,
    expense: numericAmount < 0 ? Math.abs(numericAmount) : null,
  };
}

export function formatBankAmountCell(value: number | null): string {
  return value != null && value > 0 ? value.toFixed(2) : '';
}
