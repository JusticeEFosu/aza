-- Migration 023: Fix Infinite Recursion in Messaging RLS

-- 1. Create a SECURITY DEFINER function to safely check participation without triggering RLS
CREATE OR REPLACE FUNCTION is_participant_in_channel(p_channel_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM chat_participants 
    WHERE channel_id = p_channel_id AND profile_id = p_user_id
  );
END;
$$;

-- 2. Drop the recursive policies
DROP POLICY IF EXISTS "Fans can view channels they have access to" ON chat_channels;
DROP POLICY IF EXISTS "Fans can view participants" ON chat_participants;

-- 3. Recreate the chat_channels policy using the secure function to break recursion
CREATE POLICY "Fans can view channels they have access to" ON chat_channels
FOR SELECT USING (
  (type = 'group_chat' AND EXISTS (
    SELECT 1 FROM unnest(allowed_tier_ids) AS t_id
    WHERE has_active_subscription_to_tier(auth.uid(), t_id)
  ))
  OR
  (type = 'direct_message' 
   AND is_participant_in_channel(id, auth.uid()) 
   AND meets_min_tier_requirement(auth.uid(), creator_id))
);

-- 4. Recreate the chat_participants policy
-- Now that chat_channels doesn't trigger chat_participants RLS, we can safely query chat_channels here
CREATE POLICY "Fans can view participants" ON chat_participants
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM chat_channels c 
    WHERE c.id = chat_participants.channel_id
  )
);
