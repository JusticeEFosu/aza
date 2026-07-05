-- Add Ledger tracking to transactions table
ALTER TABLE transactions 
  ADD COLUMN settled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN payout_id UUID REFERENCES payouts(id);

-- Make period_start and period_end nullable in payouts table since payouts are now transaction-based
ALTER TABLE payouts 
  ALTER COLUMN period_start DROP NOT NULL,
  ALTER COLUMN period_end DROP NOT NULL;
