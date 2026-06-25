'use client';
import { useState } from 'react';

export default function PostActions({ postId, initialLikes = 0 }: { postId: string, initialLikes?: number }) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(initialLikes);

  const handleLike = () => {
    if (liked) {
      setLiked(false);
      setLikes(Math.max(0, likes - 1));
    } else {
      setLiked(true);
      setLikes(likes + 1);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '24px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--v2-outline)' }}>
      <button 
        onClick={handleLike}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          background: 'transparent', 
          border: 'none', 
          color: liked ? '#ef4444' : 'var(--v2-text-variant)', 
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 600,
          transition: 'color 0.2s'
        }}
      >
        <span className="material-symbols-outlined" style={{ fontVariationSettings: liked ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
        {likes} Likes
      </button>

      <button 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          background: 'transparent', 
          border: 'none', 
          color: 'var(--v2-text-variant)', 
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 600
        }}
      >
        <span className="material-symbols-outlined">chat_bubble</span>
        Comment
      </button>

      <button 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          background: 'transparent', 
          border: 'none', 
          color: 'var(--v2-text-variant)', 
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 600,
          marginLeft: 'auto'
        }}
      >
        <span className="material-symbols-outlined">share</span>
        Share
      </button>
    </div>
  );
}
