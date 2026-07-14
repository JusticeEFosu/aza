-- ─── 1. Add Poll Support to Posts ──────────────────
ALTER TABLE posts ADD COLUMN IF NOT EXISTS has_poll BOOLEAN NOT NULL DEFAULT FALSE;

-- ─── 2. Poll Options Table ─────────────────────────
CREATE TABLE IF NOT EXISTS poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;

-- Anyone can read poll options
CREATE POLICY "Poll options viewable by everyone"
  ON poll_options FOR SELECT
  USING (true);

-- Creators can manage own poll options
CREATE POLICY "Creators can manage own poll options"
  ON poll_options FOR ALL
  USING (
    EXISTS (SELECT 1 FROM posts WHERE posts.id = poll_options.post_id AND posts.creator_id = auth.uid())
  );

-- ─── 3. Poll Votes Table ───────────────────────────
CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  fan_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, fan_id)
);

ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- Anyone can read poll votes (to calculate percentages)
CREATE POLICY "Poll votes viewable by everyone"
  ON poll_votes FOR SELECT
  USING (true);

-- Fans can insert/update their own votes
CREATE POLICY "Fans can manage their own votes"
  ON poll_votes FOR ALL
  USING (auth.uid() = fan_id);

-- Trigger for updated_at on poll_votes
CREATE TRIGGER poll_votes_updated_at
  BEFORE UPDATE ON poll_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
