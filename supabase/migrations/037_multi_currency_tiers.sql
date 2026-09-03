-- Create platform_settings table
CREATE TABLE platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggested_rate_usd INTEGER NOT NULL DEFAULT 1260,
  suggested_rate_eur INTEGER NOT NULL DEFAULT 1475,
  suggested_rate_gbp INTEGER NOT NULL DEFAULT 1740,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert singleton row
INSERT INTO platform_settings DEFAULT VALUES;

-- Add RLS policies for platform_settings
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can view platform settings (for frontend auto-suggest)
CREATE POLICY "Platform settings are viewable by everyone"
  ON platform_settings FOR SELECT
  USING (true);

-- Only admins can update
CREATE POLICY "Admins can update platform settings"
  ON platform_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.admin_role IN ('super_admin', 'finance_manager')
    )
  );

-- Only admins can insert (shouldn't really happen since it's a singleton, but good for completeness)
CREATE POLICY "Admins can insert platform settings"
  ON platform_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.admin_role IN ('super_admin', 'finance_manager')
    )
  );

-- Trigger for updated_at
CREATE TRIGGER platform_settings_updated_at
  BEFORE UPDATE ON platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Add paystack_plan_codes to tiers table
ALTER TABLE tiers ADD COLUMN paystack_plan_codes JSONB DEFAULT '{}'::jsonb;

-- Populate existing tiers with their NGN plan code
UPDATE tiers 
SET paystack_plan_codes = jsonb_build_object('NGN', paystack_plan_code)
WHERE paystack_plan_code IS NOT NULL;
