-- Fix financial race conditions and transaction safety

-- 1. Create an atomic RPC to handle Paystack success webhooks securely
CREATE OR REPLACE FUNCTION process_paystack_charge_success(
    p_reference TEXT,
    p_amount INTEGER,
    p_platform_fee INTEGER,
    p_creator_share INTEGER,
    p_fan_id UUID,
    p_creator_id UUID,
    p_tier_id UUID,
    p_subscription_code TEXT,
    p_email_token TEXT
) RETURNS JSONB AS $$
DECLARE
    v_existing_tx_id UUID;
    v_existing_sub_id UUID;
    v_subscription_id UUID;
    v_is_new_subscriber BOOLEAN := FALSE;
    v_new_end_date TIMESTAMPTZ := NOW() + INTERVAL '1 month';
BEGIN
    -- 1. Check for idempotency (has this webhook already been processed?)
    SELECT id INTO v_existing_tx_id FROM transactions WHERE paystack_reference = p_reference;
    IF v_existing_tx_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', true, 'message', 'Already processed');
    END IF;

    -- 2. Find or create subscription
    SELECT id INTO v_existing_sub_id 
    FROM subscriptions 
    WHERE fan_id = p_fan_id AND creator_id = p_creator_id AND status = 'active';

    IF v_existing_sub_id IS NOT NULL THEN
        v_subscription_id := v_existing_sub_id;
        -- Upgrade/Renew: Update tier and extend period
        UPDATE subscriptions 
        SET tier_id = p_tier_id,
            current_period_end = v_new_end_date
        WHERE id = v_subscription_id;
    ELSE
        v_is_new_subscriber := TRUE;
        -- New subscriber
        INSERT INTO subscriptions (
            fan_id, creator_id, tier_id, paystack_subscription_code, 
            paystack_email_token, status, current_period_start, current_period_end
        ) VALUES (
            p_fan_id, p_creator_id, p_tier_id, p_subscription_code,
            p_email_token, 'active', NOW(), v_new_end_date
        ) RETURNING id INTO v_subscription_id;
    END IF;

    -- 3. Insert transaction
    INSERT INTO transactions (
        subscription_id, fan_id, creator_id, amount, 
        platform_fee, creator_share, paystack_reference, status, paid_at
    ) VALUES (
        v_subscription_id, p_fan_id, p_creator_id, p_amount,
        p_platform_fee, p_creator_share, p_reference, 'success', NOW()
    );

    -- 4. Atomic update of creator profile to prevent race condition money loss
    IF v_is_new_subscriber THEN
        UPDATE creator_profiles 
        SET total_earnings = total_earnings + p_creator_share,
            subscriber_count = subscriber_count + 1
        WHERE id = p_creator_id;
    ELSE
        UPDATE creator_profiles 
        SET total_earnings = total_earnings + p_creator_share
        WHERE id = p_creator_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Processed successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Add constraint to prevent zero or negative Naira tiers (amount is in kobo, 100 kobo = 1 Naira)
ALTER TABLE tiers ADD CONSTRAINT tiers_amount_check CHECK (amount >= 100);
