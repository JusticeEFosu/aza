-- ─── 039_creator_processing_fee_preference.sql ─────────────────────────

-- 1. Add fee_bearer column to creator_profiles ('creator' | 'fan' | 'voluntary')
ALTER TABLE creator_profiles 
ADD COLUMN IF NOT EXISTS fee_bearer TEXT NOT NULL DEFAULT 'creator';

ALTER TABLE creator_profiles 
DROP CONSTRAINT IF EXISTS creator_profiles_fee_bearer_check;

ALTER TABLE creator_profiles 
ADD CONSTRAINT creator_profiles_fee_bearer_check 
CHECK (fee_bearer IN ('creator', 'fan', 'voluntary'));

-- 2. Add processing_fee and fee_bearer to donations table
ALTER TABLE donations
ADD COLUMN IF NOT EXISTS processing_fee INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS fee_bearer TEXT NOT NULL DEFAULT 'creator';

-- 3. Update process_donation_success RPC to handle base donation amount and transaction logging
CREATE OR REPLACE FUNCTION process_donation_success(
  p_donation_id UUID,
  p_fundraiser_id UUID,
  p_amount INTEGER
) RETURNS VOID AS $$
DECLARE
  v_creator_id UUID;
  v_fan_id UUID;
  v_base_amount INTEGER;
  v_platform_fee INTEGER;
  v_processing_fee INTEGER;
  v_creator_share INTEGER;
  v_paystack_reference TEXT;
  v_target INTEGER;
  v_current INTEGER;
  v_auto_close BOOLEAN;
BEGIN
  -- 1. Mark donation as success and fetch details
  UPDATE donations
  SET status = 'success', updated_at = NOW()
  WHERE id = p_donation_id AND status = 'pending'
  RETURNING creator_id, fan_id, amount, platform_fee, processing_fee, paystack_reference 
  INTO v_creator_id, v_fan_id, v_base_amount, v_platform_fee, v_processing_fee, v_paystack_reference;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Default to p_amount if v_base_amount is unexpectedly null
  IF v_base_amount IS NULL OR v_base_amount <= 0 THEN
    v_base_amount := p_amount;
  END IF;

  -- 2. If it is attached to a fundraiser, increment current_amount using net base donation
  IF p_fundraiser_id IS NOT NULL THEN
    UPDATE fundraisers
    SET current_amount = current_amount + v_base_amount, updated_at = NOW()
    WHERE id = p_fundraiser_id
    RETURNING target_amount, current_amount, auto_close_on_goal
    INTO v_target, v_current, v_auto_close;

    -- If hard cap is enabled, target is set, and current meets or exceeds target, auto close
    IF v_auto_close IS TRUE AND v_target IS NOT NULL AND v_current >= v_target THEN
      UPDATE fundraisers
      SET is_active = false, updated_at = NOW()
      WHERE id = p_fundraiser_id;
    END IF;
  END IF;

  -- 3. Increment creator total earnings using net base donation
  UPDATE creator_profiles cp
  SET total_earnings = cp.total_earnings + v_base_amount
  WHERE cp.id = v_creator_id;

  -- 4. Calculate creator share (base amount minus platform fee)
  v_creator_share := v_base_amount - COALESCE(v_platform_fee, 0);

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
    v_fan_id,
    v_creator_id,
    v_base_amount,
    COALESCE(v_platform_fee, 0),
    v_creator_share,
    v_paystack_reference,
    'success',
    false
  ) ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
