/** bank_transactions.amount: positive = inflow, negative = outflow */

export type BankTxSortOrder = 'newest' | 'statement';

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

export function bankBalanceColumnLabel(order: BankTxSortOrder, en: boolean): string {
  if (order === 'statement') {
    return en ? 'Balance After Transaction' : '交易后余额';
  }
  return en ? 'Bank Balance' : '银行余额';
}

export function bankBalanceSortHint(order: BankTxSortOrder, en: boolean): string {
  if (order === 'statement') {
    return en
      ? 'Balances follow the bank statement order from top to bottom.'
      : '余额按银行月结单自上而下阅读。';
  }
  return en
    ? 'Balance is the bank balance after that transaction. In newest-first order, balances will not read continuously down the page.'
    : '余额为该笔交易后的银行余额；当前为最新在前，余额不会按页面顺序连续。';
}
