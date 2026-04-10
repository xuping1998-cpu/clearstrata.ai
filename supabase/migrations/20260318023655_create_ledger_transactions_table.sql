/*
  # Create Ledger Transactions Table

  1. New Tables
    - `ledger_transactions`
      - `id` (uuid, primary key) - Unique identifier for each transaction
      - `user_id` (uuid, foreign key) - Reference to auth.users
      - `transaction_date` (date) - Date of the transaction
      - `description` (text) - Description of the transaction (e.g., "Strata Fee (03/2026)", "Direct Deposit")
      - `charge_amount` (decimal) - Amount charged (debits)
      - `payment_amount` (decimal) - Amount paid (credits)
      - `balance` (decimal) - Running balance after this transaction
      - `created_at` (timestamptz) - Timestamp when record was created
      - `updated_at` (timestamptz) - Timestamp when record was last updated

  2. Security
    - Enable RLS on `ledger_transactions` table
    - Add policy for authenticated users to read their own transactions
    - Add policy for managers to read all transactions
    - Add policy for managers to insert/update transactions

  3. Indexes
    - Add index on user_id for faster lookups
    - Add index on transaction_date for sorting
*/

CREATE TABLE IF NOT EXISTS ledger_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL,
  charge_amount decimal(10, 2) DEFAULT 0,
  payment_amount decimal(10, 2) DEFAULT 0,
  balance decimal(10, 2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ledger_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ledger transactions"
  ON ledger_transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Managers can view all ledger transactions"
  ON ledger_transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'
    )
  );

CREATE POLICY "Managers can insert ledger transactions"
  ON ledger_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'
    )
  );

CREATE POLICY "Managers can update ledger transactions"
  ON ledger_transactions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'
    )
  );

CREATE INDEX IF NOT EXISTS idx_ledger_user_id ON ledger_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_transaction_date ON ledger_transactions(transaction_date DESC);



