-- Migration 022: Messaging & Community Chats

-- 1. Create channel type ENUM
CREATE TYPE chat_channel_type AS ENUM ('direct_message', 'group_chat');

-- 2. Add DM minimum tier setting to creator_profiles
ALTER TABLE creator_profiles 
ADD COLUMN min_tier_id_for_dm UUID REFERENCES tiers(id) ON DELETE SET NULL;

-- 3. Create Channels Table
CREATE TABLE chat_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  name TEXT, -- E.g., "Gold VIP Lounge"
  type chat_channel_type NOT NULL,
  allowed_tier_ids UUID[] DEFAULT '{}', -- Array of tier IDs allowed to access this group chat
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create Participants Table
CREATE TABLE chat_participants (
  channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (channel_id, profile_id)
);

-- 5. Create Messages Table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX idx_chat_channels_creator_id ON chat_channels(creator_id);
CREATE INDEX idx_chat_participants_profile_id ON chat_participants(profile_id);
CREATE INDEX idx_chat_messages_channel_id ON chat_messages(channel_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- Enable RLS
ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Helper function to check if a user has an active subscription to a specific tier
CREATE OR REPLACE FUNCTION has_active_subscription_to_tier(p_fan_id UUID, p_tier_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_active BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM subscriptions
    WHERE fan_id = p_fan_id
      AND tier_id = p_tier_id
      AND status = 'active'
  ) INTO v_is_active;
  RETURN v_is_active;
END;
$$;

-- Helper function to check if a user meets the minimum tier requirement for a creator
CREATE OR REPLACE FUNCTION meets_min_tier_requirement(p_fan_id UUID, p_creator_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_min_tier_id UUID;
  v_min_tier_amount INTEGER;
  v_fan_max_tier_amount INTEGER;
BEGIN
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

-- RLS POLICIES FOR CHAT CHANNELS
-- Creators can view all their channels
CREATE POLICY "Creators can view their own channels" ON chat_channels
FOR SELECT USING (auth.uid() = creator_id);

-- Fans can view a group chat if they have an active subscription to one of the allowed tiers
-- Fans can view a DM if they are a participant and meet the minimum tier requirement
CREATE POLICY "Fans can view channels they have access to" ON chat_channels
FOR SELECT USING (
  (type = 'group_chat' AND EXISTS (
    SELECT 1 FROM unnest(allowed_tier_ids) AS t_id
    WHERE has_active_subscription_to_tier(auth.uid(), t_id)
  ))
  OR
  (type = 'direct_message' AND EXISTS (
    SELECT 1 FROM chat_participants 
    WHERE channel_id = chat_channels.id AND profile_id = auth.uid()
  ) AND meets_min_tier_requirement(auth.uid(), creator_id))
);

-- Only creators can insert/update channels
CREATE POLICY "Creators can insert channels" ON chat_channels
FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update channels" ON chat_channels
FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete channels" ON chat_channels
FOR DELETE USING (auth.uid() = creator_id);


-- RLS POLICIES FOR CHAT PARTICIPANTS
-- Creators can view all participants in their channels
CREATE POLICY "Creators can view participants" ON chat_participants
FOR SELECT USING (
  EXISTS (SELECT 1 FROM chat_channels WHERE id = chat_participants.channel_id AND creator_id = auth.uid())
);

-- Fans can view participants of channels they have access to
CREATE POLICY "Fans can view participants" ON chat_participants
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM chat_channels c 
    WHERE c.id = chat_participants.channel_id AND (
      (c.type = 'group_chat' AND EXISTS (
        SELECT 1 FROM unnest(c.allowed_tier_ids) AS t_id WHERE has_active_subscription_to_tier(auth.uid(), t_id)
      ))
      OR
      (c.type = 'direct_message' AND profile_id = auth.uid() AND meets_min_tier_requirement(auth.uid(), c.creator_id))
    )
  )
);

-- Users can update their own last_read_at
CREATE POLICY "Users can update own participant record" ON chat_participants
FOR UPDATE USING (auth.uid() = profile_id);

-- Only creators can insert participants (or system functions)
CREATE POLICY "Creators can insert participants" ON chat_participants
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM chat_channels WHERE id = channel_id AND creator_id = auth.uid())
);


-- RLS POLICIES FOR CHAT MESSAGES
-- View messages: Must be a creator of the channel OR a fan with active access
CREATE POLICY "Users can view messages in their accessible channels" ON chat_messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM chat_channels c WHERE c.id = channel_id AND (
      c.creator_id = auth.uid()
      OR
      (c.type = 'group_chat' AND EXISTS (
        SELECT 1 FROM unnest(c.allowed_tier_ids) AS t_id WHERE has_active_subscription_to_tier(auth.uid(), t_id)
      ))
      OR
      (c.type = 'direct_message' AND EXISTS (
        SELECT 1 FROM chat_participants cp WHERE cp.channel_id = c.id AND cp.profile_id = auth.uid()
      ) AND meets_min_tier_requirement(auth.uid(), c.creator_id))
    )
  )
);

-- Insert messages: Must be a creator of the channel OR a fan with active access
CREATE POLICY "Users can send messages in their accessible channels" ON chat_messages
FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM chat_channels c WHERE c.id = channel_id AND (
      c.creator_id = auth.uid()
      OR
      (c.type = 'group_chat' AND EXISTS (
        SELECT 1 FROM unnest(c.allowed_tier_ids) AS t_id WHERE has_active_subscription_to_tier(auth.uid(), t_id)
      ))
      OR
      (c.type = 'direct_message' AND EXISTS (
        SELECT 1 FROM chat_participants cp WHERE cp.channel_id = c.id AND cp.profile_id = auth.uid()
      ) AND meets_min_tier_requirement(auth.uid(), c.creator_id))
    )
  )
);

-- Delete messages: Can only delete your own
CREATE POLICY "Users can delete own messages" ON chat_messages
FOR UPDATE USING (auth.uid() = sender_id) WITH CHECK (auth.uid() = sender_id AND is_deleted = true);

-- ENABLE REALTIME FOR CHAT MESSAGES
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  END IF;
END
$$;
