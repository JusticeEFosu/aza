-- ─── 038_uncapped_and_hardcap_fundraisers.sql ─────────────────────────

-- 1. Allow target_amount to be NULL for uncapped/ongoing fundraisers
ALTER TABLE fundraisers ALTER COLUMN target_amount DROP NOT NULL;

-- 2. Update check constraint to allow target_amount to be NULL or > 0
ALTER TABLE fundraisers DROP CONSTRAINT IF EXISTS fundraisers_target_amount_check;
ALTER TABLE fundraisers ADD CONSTRAINT fundraisers_target_amount_check CHECK (target_amount IS NULL OR target_amount > 0);

-- 3. Add auto_close_on_goal flag (defaults to false for existing campaigns)
ALTER TABLE fundraisers ADD COLUMN IF NOT EXISTS auto_close_on_goal BOOLEAN NOT NULL DEFAULT false;

-- 4. Update process_donation_success RPC to atomically auto-close when hard-capped goal is met
CREATE OR REPLACE FUNCTION process_donation_success(
  p_donation_id UUID,
  p_fundraiser_id UUID,
  p_amount INTEGER
) RETURNS VOID AS $$
DECLARE
  v_target INTEGER;
  v_current INTEGER;
  v_auto_close BOOLEAN;
BEGIN
  -- 1. Mark donation as success
  UPDATE donations
  SET status = 'success', updated_at = NOW()
  WHERE id = p_donation_id AND status = 'pending';

  -- 2. If it is attached to a fundraiser, increment current_amount
  IF p_fundraiser_id IS NOT NULL THEN
    UPDATE fundraisers
    SET current_amount = current_amount + p_amount, updated_at = NOW()
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

  -- 3. Increment creator total earnings
  UPDATE creator_profiles cp
  SET total_earnings = cp.total_earnings + p_amount
  FROM donations d
  WHERE d.id = p_donation_id AND cp.id = d.creator_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
