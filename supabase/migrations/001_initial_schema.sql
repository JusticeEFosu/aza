-- =====================================================
-- AZA PLATFORM — DATABASE MIGRATION
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- =====================================================

-- ─── Enums ──────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('fan', 'creator');
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'past_due');
CREATE TYPE transaction_status AS ENUM ('success', 'failed', 'refunded');
CREATE TYPE payout_status AS ENUM ('pending', 'calculated', 'paid', 'failed');

-- ─── 1. Profiles Table ─────────────────────────────
-- Extends Supabase auth.users. Every user gets a row.

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'fan',
  country TEXT NOT NULL DEFAULT 'NG',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can view profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile (for the trigger)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);


-- ─── 2. Creator Profiles Table ─────────────────────

CREATE TABLE creator_profiles (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  bio TEXT DEFAULT '',
  banner_url TEXT,
  social_links JSONB DEFAULT '{}',
  bank_account_number TEXT,
  bank_code TEXT,
  bank_account_name TEXT,
  paystack_subaccount_code TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  total_earnings BIGINT NOT NULL DEFAULT 0,
  subscriber_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can view creator profiles
CREATE POLICY "Creator profiles are viewable by everyone"
  ON creator_profiles FOR SELECT
  USING (true);

-- Creators can update their own profile
CREATE POLICY "Creators can update own profile"
  ON creator_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Creators can insert their own profile (for the trigger)
CREATE POLICY "Creators can insert own profile"
  ON creator_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);


-- ─── 3. Tiers Table ────────────────────────────────

CREATE TABLE tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount INTEGER NOT NULL, -- Price in kobo (₦1,000 = 100000)
  description TEXT DEFAULT '',
  perks JSONB DEFAULT '[]',
  paystack_plan_code TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tiers ENABLE ROW LEVEL SECURITY;

-- Anyone can view active tiers
CREATE POLICY "Active tiers are viewable by everyone"
  ON tiers FOR SELECT
  USING (is_active = true);

-- Creators can manage their own tiers
CREATE POLICY "Creators can insert own tiers"
  ON tiers FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update own tiers"
  ON tiers FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete own tiers"
  ON tiers FOR DELETE
  USING (auth.uid() = creator_id);


-- ─── 4. Subscriptions Table ────────────────────────

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES tiers(id),
  creator_id UUID NOT NULL REFERENCES creator_profiles(id),
  paystack_subscription_code TEXT,
  paystack_email_token TEXT,
  status subscription_status NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Fans can view their own subscriptions
CREATE POLICY "Fans can view own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = fan_id);

-- Creators can view subscriptions to their content
CREATE POLICY "Creators can view their subscribers"
  ON subscriptions FOR SELECT
  USING (auth.uid() = creator_id);

-- Service role handles inserts/updates (via webhooks)
-- No INSERT/UPDATE policies for regular users — webhook handler uses admin client


-- ─── 5. Posts Table ────────────────────────────────

CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  minimum_tier_amount INTEGER NOT NULL DEFAULT 0, -- 0 = free/public
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Public posts are viewable by everyone
CREATE POLICY "Public posts are viewable by everyone"
  ON posts FOR SELECT
  USING (is_public = true);

-- Creators can view ALL their own posts
CREATE POLICY "Creators can view own posts"
  ON posts FOR SELECT
  USING (auth.uid() = creator_id);

-- Creators can manage their own posts
CREATE POLICY "Creators can insert own posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update own posts"
  ON posts FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete own posts"
  ON posts FOR DELETE
  USING (auth.uid() = creator_id);

-- Gated post access is handled in the API layer (requires join with subscriptions)


-- ─── 6. Transactions Table ─────────────────────────

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id),
  fan_id UUID NOT NULL REFERENCES profiles(id),
  creator_id UUID NOT NULL REFERENCES creator_profiles(id),
  amount INTEGER NOT NULL, -- Total in kobo
  platform_fee INTEGER NOT NULL DEFAULT 0, -- Platform share in kobo
  creator_share INTEGER NOT NULL DEFAULT 0, -- Creator share in kobo
  paystack_reference TEXT UNIQUE,
  status transaction_status NOT NULL DEFAULT 'success',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Fans can view their own transactions
CREATE POLICY "Fans can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = fan_id);

-- Creators can view transactions for their content
CREATE POLICY "Creators can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = creator_id);

-- Inserts handled by admin client (webhook handler)


-- ─── 7. Payouts Table ──────────────────────────────

CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  gross_amount INTEGER NOT NULL DEFAULT 0, -- Total earned in kobo
  platform_fee INTEGER NOT NULL DEFAULT 0, -- 10% of gross
  net_amount INTEGER NOT NULL DEFAULT 0, -- What creator receives
  status payout_status NOT NULL DEFAULT 'pending',
  paystack_transfer_code TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- Creators can view their own payouts
CREATE POLICY "Creators can view own payouts"
  ON payouts FOR SELECT
  USING (auth.uid() = creator_id);

-- Inserts/updates handled by admin client (payout job)


-- ─── Trigger: Auto-create profile on signup ────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'fan')
  );

  IF NEW.raw_user_meta_data->>'role' = 'creator' THEN
    INSERT INTO public.creator_profiles (id, slug)
    VALUES (
      NEW.id,
      LOWER(REGEXP_REPLACE(
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'creator-' || LEFT(NEW.id::TEXT, 8)),
        '[^a-zA-Z0-9]', '-', 'g'
      ))
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists (for re-runs)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ─── Trigger: Auto-update updated_at ───────────────

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ─── Indexes for Performance ───────────────────────

CREATE INDEX idx_tiers_creator_id ON tiers(creator_id);
CREATE INDEX idx_subscriptions_fan_id ON subscriptions(fan_id);
CREATE INDEX idx_subscriptions_creator_id ON subscriptions(creator_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_posts_creator_id ON posts(creator_id);
CREATE INDEX idx_posts_is_public ON posts(is_public);
CREATE INDEX idx_transactions_creator_id ON transactions(creator_id);
CREATE INDEX idx_transactions_fan_id ON transactions(fan_id);
CREATE INDEX idx_transactions_paid_at ON transactions(paid_at);
CREATE INDEX idx_payouts_creator_id ON payouts(creator_id);
CREATE INDEX idx_creator_profiles_slug ON creator_profiles(slug);


-- =====================================================
-- DONE! All tables, RLS policies, triggers, and indexes created.
-- =====================================================
