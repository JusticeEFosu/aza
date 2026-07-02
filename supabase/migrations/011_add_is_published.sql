-- Add is_published to creator_profiles
ALTER TABLE creator_profiles
ADD COLUMN is_published BOOLEAN NOT NULL DEFAULT FALSE;

-- Optional: Add an index if we frequently query by published status
CREATE INDEX IF NOT EXISTS idx_creator_profiles_is_published ON creator_profiles(is_published);
