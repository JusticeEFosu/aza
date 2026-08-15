-- Migration 036: Add option to disable DMs completely

ALTER TABLE creator_profiles 
ADD COLUMN dms_enabled BOOLEAN NOT NULL DEFAULT true;

-- Update the helper function to check this flag
CREATE OR REPLACE FUNCTION meets_min_tier_requirement(p_fan_id UUID, p_creator_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_min_tier_id UUID;
  v_min_tier_amount INTEGER;
  v_fan_max_tier_amount INTEGER;
  v_dms_enabled BOOLEAN;
BEGIN
  -- Check if DMs are completely disabled
  SELECT dms_enabled INTO v_dms_enabled
  FROM creator_profiles WHERE id = p_creator_id;
  
  IF NOT v_dms_enabled THEN
    RETURN FALSE;
  END IF;

  -- Get the creator's required minimum tier
  SELECT min_tier_id_for_dm INTO v_min_tier_id
  FROM creator_profiles WHERE id = p_creator_id;

  -- If no minimum tier is set, any active subscription to the creator works
  IF v_min_tier_id IS NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM subscriptions 
      WHERE fan_id = p_fan_id AND creator_id = p_creator_id AND status = 'active'
    );
  END IF;

  -- Get the amount of the minimum tier
  SELECT amount INTO v_min_tier_amount FROM tiers WHERE id = v_min_tier_id;

  -- Get the max tier amount the fan is currently subscribed to for this creator
  SELECT COALESCE(MAX(t.amount), 0) INTO v_fan_max_tier_amount
  FROM subscriptions s
  JOIN tiers t ON s.tier_id = t.id
  WHERE s.fan_id = p_fan_id AND s.creator_id = p_creator_id AND s.status = 'active';

  -- Check if fan's tier amount is >= required amount
  RETURN v_fan_max_tier_amount >= v_min_tier_amount;
END;
$$;
