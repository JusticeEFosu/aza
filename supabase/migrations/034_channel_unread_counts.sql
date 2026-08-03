-- Migration 034: Unread Counts Per Channel

CREATE OR REPLACE FUNCTION get_unread_counts_for_channels(p_user_id UUID, p_channel_ids UUID[])
RETURNS TABLE (channel_id UUID, unread_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id AS channel_id,
    COUNT(m.id) AS unread_count
  FROM chat_channels c
  JOIN chat_participants p ON c.id = p.channel_id
  JOIN chat_messages m ON c.id = m.channel_id
  WHERE c.id = ANY(p_channel_ids)
    AND p.profile_id = p_user_id
    AND m.sender_id != p_user_id
    AND m.created_at > p.last_read_at
  GROUP BY c.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
