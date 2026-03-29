/*
  # Add Demo Ledger Data

  1. Data
    - Add sample ledger transactions for demo users
    - Includes monthly strata fees and direct deposit payments
    - Shows realistic balance progression

  2. Notes
    - Uses existing demo user IDs
    - Covers 12 months of transaction history
    - Monthly strata fee: $399.65
    - Monthly payment: $400.00
*/

DO $$
DECLARE
  demo_owner_id uuid;
  current_balance decimal(10, 2) := 72.08;
  strata_fee decimal(10, 2) := 399.65;
  payment decimal(10, 2) := 400.00;
BEGIN
  SELECT id INTO demo_owner_id FROM profiles WHERE email = 'owner@demo.com' LIMIT 1;

  IF demo_owner_id IS NOT NULL THEN
    -- March 2026
    INSERT INTO ledger_transactions (user_id, transaction_date, description, charge_amount, payment_amount, balance)
    VALUES 
      (demo_owner_id, '2026-03-01', 'Strata Fee (03/2026)', strata_fee, 0, current_balance + strata_fee),
      (demo_owner_id, '2026-03-03', 'Direct Deposit', 0, payment, current_balance + strata_fee - payment);
    
    current_balance := current_balance + strata_fee - payment;

    -- February 2026
    INSERT INTO ledger_transactions (user_id, transaction_date, description, charge_amount, payment_amount, balance)
    VALUES 
      (demo_owner_id, '2026-02-01', 'Strata Fee (02/2026)', strata_fee, 0, current_balance + strata_fee),
      (demo_owner_id, '2026-02-03', 'Direct Deposit', 0, payment, current_balance + strata_fee - payment);
    
    current_balance := current_balance + strata_fee - payment;

    -- January 2026
    INSERT INTO ledger_transactions (user_id, transaction_date, description, charge_amount, payment_amount, balance)
    VALUES 
      (demo_owner_id, '2026-01-01', 'Strata Fee (01/2026)', strata_fee, 0, current_balance + strata_fee),
      (demo_owner_id, '2026-01-05', 'Direct Deposit', 0, payment, current_balance + strata_fee - payment);
    
    current_balance := current_balance + strata_fee - payment;

    -- December 2025
    INSERT INTO ledger_transactions (user_id, transaction_date, description, charge_amount, payment_amount, balance)
    VALUES 
      (demo_owner_id, '2025-12-01', 'Strata Fee (12/2025)', strata_fee, 0, current_balance + strata_fee),
      (demo_owner_id, '2025-12-03', 'Direct Deposit', 0, payment, current_balance + strata_fee - payment);
    
    current_balance := current_balance + strata_fee - payment;

    -- November 2025
    INSERT INTO ledger_transactions (user_id, transaction_date, description, charge_amount, payment_amount, balance)
    VALUES 
      (demo_owner_id, '2025-11-01', 'Strata Fee (11/2025)', strata_fee, 0, current_balance + strata_fee),
      (demo_owner_id, '2025-11-04', 'Direct Deposit', 0, payment, current_balance + strata_fee - payment);
    
    current_balance := current_balance + strata_fee - payment;

    -- October 2025
    INSERT INTO ledger_transactions (user_id, transaction_date, description, charge_amount, payment_amount, balance)
    VALUES 
      (demo_owner_id, '2025-10-01', 'Strata Fee (10/2025)', strata_fee, 0, current_balance + strata_fee),
      (demo_owner_id, '2025-10-03', 'Direct Deposit', 0, payment, current_balance + strata_fee - payment);
    
    current_balance := current_balance + strata_fee - payment;

    -- September 2025
    INSERT INTO ledger_transactions (user_id, transaction_date, description, charge_amount, payment_amount, balance)
    VALUES 
      (demo_owner_id, '2025-09-01', 'Strata Fee (09/2025)', strata_fee, 0, current_balance + strata_fee),
      (demo_owner_id, '2025-09-02', 'Direct Deposit', 0, payment, current_balance + strata_fee - payment);
    
    current_balance := current_balance + strata_fee - payment;

    -- August 2025
    INSERT INTO ledger_transactions (user_id, transaction_date, description, charge_amount, payment_amount, balance)
    VALUES 
      (demo_owner_id, '2025-08-01', 'Strata Fee (08/2025)', strata_fee, 0, current_balance + strata_fee),
      (demo_owner_id, '2025-08-05', 'Direct Deposit', 0, payment, current_balance + strata_fee - payment);
    
    current_balance := current_balance + strata_fee - payment;

    -- July 2025
    INSERT INTO ledger_transactions (user_id, transaction_date, description, charge_amount, payment_amount, balance)
    VALUES 
      (demo_owner_id, '2025-07-01', 'Strata Fee (07/2025)', strata_fee, 0, current_balance + strata_fee),
      (demo_owner_id, '2025-07-03', 'Direct Deposit', 0, payment, current_balance + strata_fee - payment);
    
    current_balance := current_balance + strata_fee - payment;

    -- June 2025
    INSERT INTO ledger_transactions (user_id, transaction_date, description, charge_amount, payment_amount, balance)
    VALUES 
      (demo_owner_id, '2025-06-01', 'Strata Fee (06/2025)', strata_fee, 0, current_balance + strata_fee),
      (demo_owner_id, '2025-06-04', 'Direct Deposit', 0, payment, current_balance + strata_fee - payment);
    
    current_balance := current_balance + strata_fee - payment;

    -- May 2025
    INSERT INTO ledger_transactions (user_id, transaction_date, description, charge_amount, payment_amount, balance)
    VALUES 
      (demo_owner_id, '2025-05-01', 'Strata Fee (05/2025)', strata_fee, 0, current_balance + strata_fee),
      (demo_owner_id, '2025-05-03', 'Direct Deposit', 0, payment, current_balance + strata_fee - payment);
    
    current_balance := current_balance + strata_fee - payment;

    -- April 2025
    INSERT INTO ledger_transactions (user_id, transaction_date, description, charge_amount, payment_amount, balance)
    VALUES 
      (demo_owner_id, '2025-04-01', 'Strata Fee (04/2025)', strata_fee, 0, current_balance + strata_fee),
      (demo_owner_id, '2025-04-02', 'Direct Deposit', 0, payment, current_balance + strata_fee - payment);

  END IF;
END $$;