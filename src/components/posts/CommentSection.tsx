'use client';

import { useState, useEffect } from 'react';

type Comment = {
  id: string;
  content: string;
  created_at: string;
  profiles: {
    full_name: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
};

export default function CommentSection({ postId, onCommentAdded }: { postId: string, onCommentAdded: () => void }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/posts/${postId}/comments`);
      const data = await res.json();
      if (res.ok && data.comments) {
        setComments(data.comments);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to post comment');
      }

      if (data.comment) {
        setComments([...comments, data.comment]);
        setNewComment('');
        onCommentAdded();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div style={{ padding: '16px', color: 'var(--v2-text-variant)', fontSize: '14px', textAlign: 'center' }}>Loading comments...</div>;
  }

  return (
    <div style={{ background: 'var(--v2-surface-lowest)', borderRadius: '12px', padding: '16px', border: '1px solid var(--v2-outline)' }}>
      {/* Comment List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px', maxHeight: '400px', overflowY: 'auto' }}>
        {comments.length === 0 ? (
          <div style={{ color: 'var(--v2-text-variant)', fontSize: '14px', textAlign: 'center', padding: '16px 0' }}>
            No comments yet. Be the first to start the conversation!
          </div>
        ) : (
          comments.map(comment => (
            <div key={comment.id} style={{ display: 'flex', gap: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--v2-surface-highest)', flexShrink: 0, overflow: 'hidden' }}>
                {comment.profiles?.avatar_url ? (
                  <img src={comment.profiles.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--v2-text-variant)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>person</span>
                  </div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--v2-text)' }}>
                    {comment.profiles?.display_name || comment.profiles?.full_name || 'User'}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--v2-text-variant)' }}>
                    {new Date(comment.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: 'var(--v2-text)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                  {comment.content}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Comment Input */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {error && <div style={{ color: '#ff3b30', fontSize: '13px' }}>{error}</div>}
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={isSubmitting}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '24px',
              border: '1px solid var(--v2-outline)',
              background: 'var(--v2-surface)',
              fontSize: '14px',
              color: 'var(--v2-text)',
              outline: 'none',
              transition: 'border-color 0.2s ease',
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--v2-primary)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--v2-outline)'}
          />
          <button 
            type="submit" 
            disabled={!newComment.trim() || isSubmitting}
            style={{ 
              background: newComment.trim() ? 'var(--v2-primary)' : 'var(--v2-surface-highest)', 
              color: newComment.trim() ? 'white' : 'var(--v2-text-variant)', 
              border: 'none', 
              borderRadius: '24px', 
              padding: '0 20px', 
              fontWeight: 600, 
              fontSize: '14px', 
              cursor: newComment.trim() && !isSubmitting ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease'
            }}
          >
            {isSubmitting ? '...' : 'Post'}
          </button>
        </div>
      </form>
    </div>
  );
}
