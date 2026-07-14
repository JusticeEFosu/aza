-- ─── Fundraisers Table ─────────────────────────
CREATE TABLE IF NOT EXISTS fundraisers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_amount INTEGER NOT NULL CHECK (target_amount > 0),
  current_amount INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  show_leaderboard BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE fundraisers ENABLE ROW LEVEL SECURITY;

-- Anyone can view active fundraisers
CREATE POLICY "Public fundraisers viewable by everyone"
  ON fundraisers FOR SELECT
  USING (is_active = true OR auth.uid() = creator_id);

-- Creators can manage their own fundraisers
CREATE POLICY "Creators can manage own fundraisers"
  ON fundraisers FOR ALL
  USING (auth.uid() = creator_id);

CREATE TRIGGER fundraisers_updated_at
  BEFORE UPDATE ON fundraisers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ─── Donations Table ─────────────────────────
CREATE TABLE IF NOT EXISTS donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fundraiser_id UUID REFERENCES fundraisers(id) ON DELETE CASCADE,
  fan_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Guest donations will have NULL
  amount INTEGER NOT NULL CHECK (amount > 0),
  platform_fee INTEGER NOT NULL DEFAULT 0,
  donor_name TEXT,
  donor_note TEXT,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  paystack_reference TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- Only creators can view their own donations, or the donor if they are logged in
CREATE POLICY "Creators can view their own donations"
  ON donations FOR SELECT
  USING (auth.uid() = creator_id OR (fan_id IS NOT NULL AND auth.uid() = fan_id));

-- Note: Inserting donations is done server-side via the API to initialize Paystack, so RLS insert isn't strictly needed for clients
CREATE TRIGGER donations_updated_at
  BEFORE UPDATE ON donations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RPC to atomically process a donation success
CREATE OR REPLACE FUNCTION process_donation_success(
  p_donation_id UUID,
  p_fundraiser_id UUID,
  p_amount INTEGER
) RETURNS VOID AS $$
BEGIN
  -- 1. Mark donation as success
  UPDATE donations
  SET status = 'success', updated_at = NOW()
  WHERE id = p_donation_id AND status = 'pending';

  -- 2. If it is attached to a fundraiser, increment the target
  IF p_fundraiser_id IS NOT NULL THEN
    UPDATE fundraisers
    SET current_amount = current_amount + p_amount, updated_at = NOW()
    WHERE id = p_fundraiser_id;
  END IF;

  -- 3. Increment creator total earnings
  UPDATE creator_profiles cp
  SET total_earnings = cp.total_earnings + p_amount
  FROM donations d
  WHERE d.id = p_donation_id AND cp.id = d.creator_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
