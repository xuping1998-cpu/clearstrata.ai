/*
  # bank_transactions — statement line order (Phase P2B-3C)

  Preserves original row order from bank statement PDF/CSV within each transaction_date.
*/

BEGIN;

ALTER TABLE public.bank_transactions
  ADD COLUMN IF NOT EXISTS statement_line_no integer;

CREATE INDEX IF NOT EXISTS idx_bank_transactions_statement_order
  ON public.bank_transactions(property_id, transaction_date, statement_line_no);

COMMENT ON COLUMN public.bank_transactions.statement_line_no IS
  '1-based row order from bank statement within import batch; used for statement-order display.';

COMMIT;

NOTIFY pgrst, 'reload schema';
