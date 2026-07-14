'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface PollOption {
  id: string;
  post_id: string;
  text: string;
  image_url: string | null;
}

interface PollVote {
  id: string;
  post_id: string;
  option_id: string;
  fan_id: string;
}

export default function PollBlock({ postId }: { postId: string }) {
  const [options, setOptions] = useState<PollOption[]>([]);
  const [votes, setVotes] = useState<PollVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [userVoteId, setUserVoteId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function loadPollData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);

      const [optionsRes, votesRes] = await Promise.all([
        supabase.from('poll_options').select('*').eq('post_id', postId).order('created_at', { ascending: true }),
        supabase.from('poll_votes').select('*').eq('post_id', postId)
      ]);

      if (optionsRes.data) setOptions(optionsRes.data);
      if (votesRes.data) {
        setVotes(votesRes.data);
        if (user) {
          const uv = votesRes.data.find(v => v.fan_id === user.id);
          if (uv) setUserVoteId(uv.option_id);
        }
      }
      setLoading(false);
    }
    loadPollData();

    // Optional: Realtime subscription for votes
    const channel = supabase.channel(`poll_votes_${postId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_votes', filter: `post_id=eq.${postId}` }, payload => {
        if (payload.eventType === 'INSERT') {
          setVotes(prev => [...prev, payload.new as PollVote]);
        } else if (payload.eventType === 'UPDATE') {
          setVotes(prev => prev.map(v => v.id === payload.new.id ? payload.new as PollVote : v));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [postId]);

  const handleVote = async (optionId: string) => {
    if (!userId) {
      alert("You must be logged in to vote.");
      return;
    }
    // Optimistic UI
    setUserVoteId(optionId);
    setVotes(prev => {
      const withoutUser = prev.filter(v => v.fan_id !== userId);
      return [...withoutUser, { id: 'temp', post_id: postId, option_id: optionId, fan_id: userId }];
    });

    try {
      const res = await fetch('/api/polls/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, optionId })
      });
      if (!res.ok) throw new Error('Failed to vote');
    } catch (err) {
      console.error(err);
      alert('Error casting vote');
      // In a robust app, we'd revert the optimistic UI here
    }
  };

  if (loading) return <div style={{ padding: '16px', color: 'var(--v2-text-variant)' }}>Loading poll...</div>;
  if (options.length === 0) return null;

  const totalVotes = votes.length;

  return (
    <div style={{ marginTop: '16px', border: '1px solid var(--v2-outline)', borderRadius: '12px', padding: '16px', background: 'var(--v2-surface-lowest)' }}>
      <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: 'var(--v2-primary)' }}>Poll</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        {options.map(opt => {
          const optVotes = votes.filter(v => v.option_id === opt.id).length;
          const percentage = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;
          const isSelected = userVoteId === opt.id;

          return (
            <div 
              key={opt.id} 
              onClick={() => handleVote(opt.id)}
              style={{
                position: 'relative',
                cursor: 'pointer',
                borderRadius: '8px',
                border: `2px solid ${isSelected ? 'var(--v2-accent, #735c00)' : 'var(--v2-outline)'}`,
                overflow: 'hidden',
                background: 'var(--v2-surface-low)',
                transition: 'all 0.2s ease',
                minHeight: '120px',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {opt.image_url && (
                <div style={{ height: '120px', width: '100%', borderBottom: '1px solid var(--v2-outline)' }}>
                  <img src={opt.image_url} alt={opt.text} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              
              {/* Progress Bar Background */}
              {userVoteId && (
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  height: opt.image_url ? 'auto' : '100%', // if image, progress is just a small bar or background of text area
                  width: `${percentage}%`,
                  background: 'rgba(0, 78, 52, 0.1)', // Nigerian Emerald washed out
                  borderTopRightRadius: '8px',
                  borderBottomRightRadius: opt.image_url ? '0' : '8px',
                  transition: 'width 0.5s ease',
                  zIndex: 0
                }} />
              )}

              <div style={{ padding: '12px', position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexGrow: 1 }}>
                <span style={{ fontWeight: 500, fontSize: '14px', color: 'var(--v2-primary)' }}>{opt.text}</span>
                {userVoteId && (
                  <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--v2-primary)' }}>{percentage}%</span>
                )}
              </div>
              {isSelected && (
                <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'var(--v2-surface)', borderRadius: '50%', padding: '2px', display: 'flex' }}>
                   <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--v2-accent, #735c00)' }}>check_circle</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--v2-text-variant)', textAlign: 'right' }}>
        {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
