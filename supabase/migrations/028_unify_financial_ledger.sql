-- ─── Unify Ledger for Donations ─────────────────────────

-- 0. Allow guest donations (NULL fan_id) in transactions table
ALTER TABLE transactions ALTER COLUMN fan_id DROP NOT NULL;

-- 1. Redefine process_donation_success to also insert into transactions
CREATE OR REPLACE FUNCTION process_donation_success(
  p_donation_id UUID,
  p_fundraiser_id UUID,
  p_amount INTEGER
) RETURNS VOID AS $$
DECLARE
  v_creator_id UUID;
  v_fan_id UUID;
  v_platform_fee INTEGER;
  v_creator_share INTEGER;
  v_paystack_reference TEXT;
BEGIN
  -- 1. Mark donation as success and fetch required fields for transaction log
  UPDATE donations
  SET status = 'success', updated_at = NOW()
  WHERE id = p_donation_id AND status = 'pending'
  RETURNING creator_id, fan_id, platform_fee, paystack_reference INTO v_creator_id, v_fan_id, v_platform_fee, v_paystack_reference;

  -- If no row was updated (wasn't pending, or didn't exist), abort safely
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- 2. If it is attached to a fundraiser, increment the target
  IF p_fundraiser_id IS NOT NULL THEN
    UPDATE fundraisers
    SET current_amount = current_amount + p_amount, updated_at = NOW()
    WHERE id = p_fundraiser_id;
  END IF;

  -- 3. Increment creator total earnings
  UPDATE creator_profiles cp
  SET total_earnings = cp.total_earnings + p_amount
  WHERE cp.id = v_creator_id;

  -- 4. Calculate shares (using platform fee already recorded in donations table)
  v_creator_share := p_amount - COALESCE(v_platform_fee, 0);

  -- 5. Insert into unified transactions ledger
  INSERT INTO transactions (
    fan_id,
    creator_id,
    amount,
    platform_fee,
    creator_share,
    paystack_reference,
    status,
    settled
  ) VALUES (
    v_fan_id, -- Can be NULL for guest donations, ensure transactions table allows this or handled via schema
    v_creator_id,
    p_amount,
    COALESCE(v_platform_fee, 0),
    v_creator_share,
    v_paystack_reference,
    'success',
    false
  ) ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Backfill existing successful donations into transactions table
DO $$
DECLARE
  donation RECORD;
  v_creator_share INTEGER;
BEGIN
  FOR donation IN
    SELECT * FROM donations WHERE status = 'success'
  LOOP
    v_creator_share := donation.amount - COALESCE(donation.platform_fee, 0);
    
    INSERT INTO transactions (
      fan_id,
      creator_id,
      amount,
      platform_fee,
      creator_share,
      paystack_reference,
      status,
      settled,
      created_at
    ) VALUES (
      donation.fan_id,
      donation.creator_id,
      donation.amount,
      COALESCE(donation.platform_fee, 0),
      v_creator_share,
      donation.paystack_reference,
      'success',
      false, -- Assuming they are unsettled for safety, or we could mark older ones true if needed
      donation.created_at
    ) ON CONFLICT (paystack_reference) DO NOTHING;
  END LOOP;
END;
$$;
