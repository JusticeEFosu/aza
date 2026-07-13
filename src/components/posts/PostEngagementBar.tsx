'use client';

import { useState } from 'react';
import CommentSection from './CommentSection';

export default function PostEngagementBar({
  postId,
  initialLikes,
  initialComments,
  initialUserHasLiked,
  hasAccess
}: {
  postId: string;
  initialLikes: number;
  initialComments: number;
  initialUserHasLiked: boolean;
  hasAccess: boolean;
}) {
  const [likes, setLikes] = useState(initialLikes);
  const [userHasLiked, setUserHasLiked] = useState(initialUserHasLiked);
  const [showComments, setShowComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(initialComments);
  const [showUpsell, setShowUpsell] = useState(false);

  const handleLike = async () => {
    if (!hasAccess) {
      setShowUpsell(true);
      setTimeout(() => setShowUpsell(false), 3000);
      return;
    }

    // Optimistic UI update
    const wasLiked = userHasLiked;
    setUserHasLiked(!wasLiked);
    setLikes(prev => wasLiked ? prev - 1 : prev + 1);

    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: wasLiked ? 'DELETE' : 'POST',
      });
      if (!res.ok) {
        throw new Error('Failed to toggle like');
      }
    } catch (error) {
      // Revert optimistic update on error
      setUserHasLiked(wasLiked);
      setLikes(prev => wasLiked ? prev + 1 : prev - 1);
      console.error(error);
    }
  };

  const toggleComments = () => {
    if (!hasAccess) {
      setShowUpsell(true);
      setTimeout(() => setShowUpsell(false), 3000);
      return;
    }
    setShowComments(!showComments);
  };

  return (
    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', borderTop: '1px solid var(--v2-outline)', paddingTop: '16px' }}>
        
        {/* Like Button */}
        <button 
          onClick={handleLike}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer',
            color: userHasLiked ? '#ff3b30' : 'var(--v2-text-variant)',
            transition: 'color 0.2s ease, transform 0.1s ease',
            padding: '4px 8px',
            marginLeft: '-8px',
            borderRadius: '8px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--v2-surface-highest)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '24px', fontVariationSettings: userHasLiked ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
          <span style={{ fontSize: '15px', fontWeight: 600 }}>{likes > 0 ? likes.toLocaleString() : 'Like'}</span>
        </button>

        {/* Comment Button */}
        <button 
          onClick={toggleComments}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer',
            color: showComments ? 'var(--v2-text)' : 'var(--v2-text-variant)',
            padding: '4px 8px',
            borderRadius: '8px',
            transition: 'background 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--v2-surface-highest)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '24px', fontVariationSettings: showComments ? "'FILL' 1" : "'FILL' 0" }}>chat_bubble</span>
          <span style={{ fontSize: '15px', fontWeight: 600 }}>{commentsCount > 0 ? commentsCount.toLocaleString() : 'Comment'}</span>
        </button>

      </div>

      {/* Upsell Toast */}
      {showUpsell && (
        <div style={{ padding: '12px 16px', background: 'var(--v2-surface-highest)', borderRadius: '8px', border: '1px solid var(--v2-primary)', color: 'var(--v2-primary)', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeIn 0.3s ease' }}>
          <span className="material-symbols-outlined">lock</span>
          Subscribe to this creator to like and comment on exclusive posts!
        </div>
      )}

      {/* Comment Section */}
      {showComments && hasAccess && (
        <div style={{ marginTop: '8px', animation: 'fadeIn 0.2s ease' }}>
          <CommentSection postId={postId} onCommentAdded={() => setCommentsCount(prev => prev + 1)} />
        </div>
      )}
    </div>
  );
}
