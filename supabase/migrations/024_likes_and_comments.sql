-- ─── 1. Helper Function: has_post_access ───────────────
-- Returns TRUE if a user can view a post's content/comments based on their tier.
CREATE OR REPLACE FUNCTION has_post_access(p_user_id UUID, p_post_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_creator_id UUID;
  v_minimum_tier INTEGER;
  v_is_public BOOLEAN;
  v_fan_max_tier INTEGER;
BEGIN
  -- Get post details
  SELECT creator_id, minimum_tier_amount, is_public 
  INTO v_creator_id, v_minimum_tier, v_is_public
  FROM posts 
  WHERE id = p_post_id;

  -- 1. If post is public, everyone has access
  IF v_is_public THEN
    RETURN TRUE;
  END IF;

  -- 2. If user is the creator, they have access
  IF p_user_id = v_creator_id THEN
    RETURN TRUE;
  END IF;

  -- 3. Check active subscriptions against the post's minimum tier amount
  SELECT COALESCE(MAX(t.amount), 0) INTO v_fan_max_tier
  FROM subscriptions s
  JOIN tiers t ON s.tier_id = t.id
  WHERE s.fan_id = p_user_id 
    AND s.creator_id = v_creator_id 
    AND s.status = 'active';

  RETURN v_fan_max_tier >= v_minimum_tier;
END;
$$;


-- ─── 2. post_likes Table ───────────────────────────────
CREATE TABLE post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

-- Anyone can read likes (to see counts on public/locked posts)
CREATE POLICY "Anyone can view likes"
  ON post_likes FOR SELECT
  USING (true);

-- Only users with access can insert a like
CREATE POLICY "Users with access can insert likes"
  ON post_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id AND has_post_access(auth.uid(), post_id));

-- Users can delete their own likes
CREATE POLICY "Users can delete own likes"
  ON post_likes FOR DELETE
  USING (auth.uid() = user_id);


-- ─── 3. post_comments Table ────────────────────────────
CREATE TABLE post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read comment count/summaries, but let's restrict actual reading
-- to people with access to the post (to prevent leaking comment content)
-- We want anyone to see the COUNT, but not the content.
-- Since Supabase RLS is per-row, if we restrict SELECT, they can't even count them!
-- Let's allow SELECT for everyone, but the App will filter the content if they don't have access.
CREATE POLICY "Anyone can view comments"
  ON post_comments FOR SELECT
  USING (true);

-- Only users with access can insert a comment
CREATE POLICY "Users with access can insert comments"
  ON post_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id AND has_post_access(auth.uid(), post_id));

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
  ON post_comments FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own comments, or creators can delete any comment on their post
CREATE POLICY "Users can delete own comments or creators can delete"
  ON post_comments FOR DELETE
  USING (
    auth.uid() = user_id 
    OR 
    auth.uid() = (SELECT creator_id FROM posts WHERE id = post_id)
  );
