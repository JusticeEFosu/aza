-- Migration 033: Unread Count Function

CREATE OR REPLACE FUNCTION get_unread_message_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT c.id) INTO v_count
  FROM chat_channels c
  JOIN chat_participants p ON c.id = p.channel_id
  JOIN chat_messages m ON c.id = m.channel_id
  WHERE p.profile_id = p_user_id
    AND m.sender_id != p_user_id
    AND m.created_at > p.last_read_at;
    
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
