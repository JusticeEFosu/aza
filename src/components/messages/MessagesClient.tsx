'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

type UserProfile = {
  id: string;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: 'creator' | 'fan' | 'admin';
};

type Message = {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_deleted: boolean;
  profiles?: {
    id?: string;
    full_name?: string | null;
    display_name?: string | null;
    creator_profiles?: {
      display_name: string | null;
    }[] | null; // PostgREST returns arrays for reverse relations by default
  } | null;
};

type Channel = {
  id: string;
  name: string | null;
  type: 'direct_message' | 'group_chat';
  creator_id: string;
  other_participant?: UserProfile; // Derived for DMs
  avatar_url?: string | null;
  participants?: { profile_id: string; display_name: string }[];
  last_message?: string;
  unread_count?: number;
};

export default function MessagesClient({ currentUser }: { currentUser: UserProfile }) {
  const supabase = createClient();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initial Load: Fetch Channels
  useEffect(() => {
    async function fetchChannels() {
      // 1. Fetch channels accessible via RLS
      const { data: channelsData, error: channelsError } = await supabase
        .from('chat_channels')
        .select(`
          id, name, type, creator_id,
          creator_profiles (
            display_name,
            profiles (full_name, avatar_url)
          ),
          chat_participants (
            profile_id,
            last_read_at,
            profiles (id, full_name, display_name, avatar_url)
          )
        `)
        .order('updated_at', { ascending: false });

      if (channelsError) {
        console.error('Error fetching channels:', channelsError);
        setIsLoading(false);
        return;
      }

      // Process channels to format DMs properly
      const formattedChannels: Channel[] = channelsData.map((c: any) => {
        let otherParticipant = undefined;
        let displayName = c.name;
        let avatarUrl = null;

        const participants = c.chat_participants?.map((p: any) => {
          let name = p.profiles?.display_name || p.profiles?.full_name || 'Unknown User';
          if (p.profile_id === c.creator_id && c.creator_profiles) {
            name = c.creator_profiles.display_name || c.creator_profiles.profiles?.full_name || name;
          }
          return { profile_id: p.profile_id, display_name: name };
        }) || [];

        if (c.type === 'direct_message') {
          // Find the participant that is NOT the current user
          const other = c.chat_participants?.find((p: any) => p.profile_id !== currentUser.id);
          
          if (other && other.profiles) {
            otherParticipant = other.profiles;
            
            // If the other participant is the Creator of the channel, use their Creator Profile name
            if (other.profile_id === c.creator_id && c.creator_profiles) {
              displayName = c.creator_profiles.display_name || c.creator_profiles.profiles?.full_name || otherParticipant.display_name || otherParticipant.full_name || 'Creator';
              avatarUrl = c.creator_profiles.profiles?.avatar_url || otherParticipant.avatar_url;
            } else {
              // The other participant is a fan
              displayName = otherParticipant.display_name || otherParticipant.full_name || 'Fan';
              avatarUrl = otherParticipant.avatar_url;
            }
          }
        }

        return {
          id: c.id,
          name: displayName,
          type: c.type,
          creator_id: c.creator_id,
          other_participant: otherParticipant,
          avatar_url: avatarUrl,
          participants: participants
        };
      });

      setChannels(formattedChannels);
      setIsLoading(false);
    }
    fetchChannels();
  }, [currentUser.id]);

  // Load Messages & Subscribe to Realtime when active channel changes
  useEffect(() => {
    if (!activeChannelId) return;

    let subscription: any = null;

    async function fetchMessages() {
      // Fetch last 50 messages
      const { data: messagesData, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          profiles:sender_id (
            id, full_name, display_name,
            creator_profiles (display_name)
          )
        `)
        .eq('channel_id', activeChannelId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && messagesData) {
        setMessages(messagesData.reverse()); // Reverse to show oldest first top-down
      }

      // Update last_read_at for this user in this channel
      await supabase
        .from('chat_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('channel_id', activeChannelId)
        .eq('profile_id', currentUser.id);
    }

    fetchMessages();

    // Subscribe to new messages for THIS channel
    subscription = supabase
      .channel(`chat_${activeChannelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${activeChannelId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          
          // If it's a message from someone else, explicitly fetch their profile data so their name shows up
          if (newMsg.sender_id !== currentUser.id) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select(`id, full_name, display_name, creator_profiles(display_name)`)
              .eq('id', newMsg.sender_id)
              .single();
              
            if (profileData) {
              newMsg.profiles = profileData;
            }
          }
          
          setMessages((prev) => [...prev, newMsg]);
          
          // If we received a message, automatically mark as read since we are in the chat
          if (newMsg.sender_id !== currentUser.id) {
            supabase
              .from('chat_participants')
              .update({ last_read_at: new Date().toISOString() })
              .eq('channel_id', activeChannelId)
              .eq('profile_id', currentUser.id);
          }
        }
      )
      .subscribe();

    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, [activeChannelId, currentUser.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChannelId) return;

    setIsSending(true);
    const contentToSend = newMessage.trim();
    setNewMessage('');

    // Optimistic UI update could go here, but since it's realtime, it will bounce back quickly.
    
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        channel_id: activeChannelId,
        sender_id: currentUser.id,
        content: contentToSend,
      });

    if (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. You might not have permission.');
      setNewMessage(contentToSend); // restore
    }
    
    setIsSending(false);
  };

  // Find active channel info
  const activeChannel = channels.find((c) => c.id === activeChannelId);

  return (
    <div className="v2-messages-container" style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      
      {/* LEFT SIDEBAR: Channel List */}
      <div 
        className={`v2-channel-sidebar ${activeChannelId ? 'hidden-mobile' : ''}`} 
        style={{ 
          width: '350px', 
          borderRight: '1px solid var(--v2-outline)', 
          display: 'flex', 
          flexDirection: 'column',
          backgroundColor: 'var(--v2-surface)',
          flexShrink: 0
        }}
      >
        <div style={{ padding: '24px', borderBottom: '1px solid var(--v2-outline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Messages</h1>
          {currentUser.role === 'creator' && (
            <Link href="/creator/messages/new" className="v2-btn v2-btn-icon" title="New Group Chat" style={{ padding: '8px' }}>
              <span className="material-symbols-outlined">add_comment</span>
            </Link>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--v2-text-variant)' }}>Loading messages...</div>
          ) : channels.length === 0 ? (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--v2-text-variant)' }}>
              No messages yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {channels.map((channel) => {
                const displayName = channel.name || 'Unknown User';
                const avatar = channel.avatar_url || null;
                const initials = displayName.charAt(0).toUpperCase() || '?';

                return (
                  <button
                    key={channel.id}
                    onClick={() => setActiveChannelId(channel.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '16px 24px',
                      background: activeChannelId === channel.id ? 'var(--v2-surface-highest)' : 'transparent',
                      border: 'none',
                      borderBottom: '1px solid var(--v2-outline)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.2s',
                    }}
                  >
                    <div style={{ marginRight: '16px', flexShrink: 0 }}>
                      {avatar ? (
                        <img src={avatar} alt="" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--v2-surface-highest)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: 'var(--v2-primary)', border: '1px solid var(--v2-outline)' }}>
                          {initials}
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, fontSize: '16px', color: 'var(--v2-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {displayName}
                        </span>
                        {channel.type === 'group_chat' && (
                          <span style={{ fontSize: '10px', background: 'var(--v2-primary)', color: 'white', padding: '2px 6px', borderRadius: '10px', fontWeight: 600 }}>GROUP</span>
                        )}
                      </div>
                      <div style={{ fontSize: '14px', color: 'var(--v2-text-variant)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Click to view conversation
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SIDE: Active Chat */}
      <div 
        className={`v2-chat-area ${!activeChannelId ? 'hidden-mobile' : ''}`}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--v2-surface-lowest)' }}
      >
        {activeChannelId && activeChannel ? (
          <>
            {/* Chat Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--v2-outline)', display: 'flex', alignItems: 'center', backgroundColor: 'var(--v2-surface)' }}>
              <button 
                className="v2-mobile-back-btn" 
                onClick={() => setActiveChannelId(null)}
                style={{ background: 'transparent', border: 'none', marginRight: '16px', cursor: 'pointer', display: 'none', alignItems: 'center', color: 'var(--v2-text)' }}
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              
              <span style={{ fontSize: '20px', fontWeight: 600 }}>
                {activeChannel.name || 'Unknown User'}
              </span>
            </div>

            {/* Chat Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column' }}>
              {messages.length === 0 ? (
                <div style={{ margin: 'auto', color: 'var(--v2-text-variant)', textAlign: 'center' }}>
                  No messages here yet.<br/>Send a message to start the conversation!
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isMine = msg.sender_id === currentUser.id;
                  const prevMsg = index > 0 ? messages[index - 1] : null;
                  const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;
                  
                  const isFirstInGroup = !prevMsg || prevMsg.sender_id !== msg.sender_id;
                  const isLastInGroup = !nextMsg || nextMsg.sender_id !== msg.sender_id;
                  
                  let senderName = null;
                  if (activeChannel?.type === 'group_chat' && !isMine && isFirstInGroup) {
                    if (msg.profiles) {
                      // PostgREST returns arrays for reverse relations by default, so check [0] for creator_profiles
                      const creatorName = msg.profiles.creator_profiles?.[0]?.display_name;
                      senderName = creatorName || msg.profiles.display_name || msg.profiles.full_name || 'User';
                    } else {
                      senderName = 'User';
                    }
                  }

                  return (
                    <div key={msg.id} style={{ 
                      display: 'flex', 
                      justifyContent: isMine ? 'flex-end' : 'flex-start',
                      marginTop: isFirstInGroup ? (index === 0 ? '0' : '16px') : '2px',
                      flexDirection: 'column',
                      alignItems: isMine ? 'flex-end' : 'flex-start'
                    }}>
                      {senderName && (
                        <div style={{ fontSize: '12px', color: 'var(--v2-text-variant)', marginBottom: '4px', marginLeft: '12px', fontWeight: 600 }}>
                          {senderName}
                        </div>
                      )}
                      <div style={{
                        maxWidth: '75%',
                        padding: '8px 12px',
                        borderTopLeftRadius: !isMine ? (isFirstInGroup ? '16px' : '4px') : '16px',
                        borderBottomLeftRadius: !isMine ? (isLastInGroup ? '16px' : '4px') : '16px',
                        borderTopRightRadius: isMine ? (isFirstInGroup ? '16px' : '4px') : '16px',
                        borderBottomRightRadius: isMine ? (isLastInGroup ? '16px' : '4px') : '16px',
                        backgroundColor: isMine ? 'var(--v2-primary)' : 'var(--v2-surface)',
                        color: isMine ? '#ffffff' : 'var(--v2-text)',
                        border: isMine ? 'none' : '1px solid var(--v2-outline)',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        fontSize: '14px',
                        lineHeight: '1.4'
                      }}>
                        {msg.content}
                        <div style={{ 
                          fontSize: '11px', 
                          marginTop: '4px', 
                          textAlign: 'right', 
                          opacity: 0.7,
                          color: isMine ? 'rgba(255,255,255,0.8)' : 'var(--v2-text-variant)'
                        }}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div style={{ padding: '12px 24px', borderTop: '1px solid var(--v2-outline)', backgroundColor: 'var(--v2-surface)' }}>
              <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '12px' }}>
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  disabled={isSending}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '20px',
                    border: '1px solid var(--v2-outline)',
                    backgroundColor: 'var(--v2-surface-lowest)',
                    color: 'var(--v2-text)',
                    fontSize: '15px',
                    outline: 'none',
                  }}
                />
                <button 
                  type="submit" 
                  disabled={isSending || !newMessage.trim()}
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: newMessage.trim() ? 'var(--v2-primary)' : 'var(--v2-surface-highest)',
                    color: newMessage.trim() ? '#ffffff' : 'var(--v2-text-variant)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', marginLeft: '4px' }}>send</span>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--v2-text-variant)' }}>
            Select a conversation to start messaging
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
          .v2-channel-sidebar { width: 100% !important; border-right: none !important; }
          .v2-chat-area { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 10; }
          .v2-mobile-back-btn { display: flex !important; }
        }
      `}} />
    </div>
  );
}
