-- Migration for OBS Stream Alerts and TTS System

-- Add multi-currency and display amount support to donations
ALTER TABLE donations
ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'NGN',
ADD COLUMN IF NOT EXISTS amount_display NUMERIC(10, 2), 
ADD COLUMN IF NOT EXISTS amount_ngn INTEGER;

-- Set existing records to have amount_display derived from amount (assuming amount is in kobo, so amount/100) and amount_ngn to amount
UPDATE donations 
SET 
  amount_display = amount / 100.0, 
  amount_ngn = amount 
WHERE amount_display IS NULL;

-- ─── Stream Settings Table ─────────────────────────
CREATE TABLE IF NOT EXISTS stream_settings (
  creator_id UUID PRIMARY KEY REFERENCES creator_profiles(id) ON DELETE CASCADE,
  overlay_token UUID NOT NULL DEFAULT gen_random_uuid(),
  tts_enabled BOOLEAN NOT NULL DEFAULT false,
  tts_min_ngn INTEGER NOT NULL DEFAULT 150000, -- in kobo (₦1,500 = 150,000)
  alert_duration INTEGER NOT NULL DEFAULT 8,
  volume_chime INTEGER NOT NULL DEFAULT 50,
  volume_tts INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE stream_settings ENABLE ROW LEVEL SECURITY;

-- Creator can read their own settings
CREATE POLICY "Creators can view their own stream settings"
  ON stream_settings FOR SELECT
  USING (auth.uid() = creator_id);

-- Creators can insert their own settings
CREATE POLICY "Creators can insert their own stream settings"
  ON stream_settings FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- Creators can update their own settings
CREATE POLICY "Creators can update their own stream settings"
  ON stream_settings FOR UPDATE
  USING (auth.uid() = creator_id);

-- Trigger for updated_at
CREATE TRIGGER stream_settings_updated_at
  BEFORE UPDATE ON stream_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
