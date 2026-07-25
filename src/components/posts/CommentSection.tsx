'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

type Comment = {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  parent_id: string | null;
  profiles: {
    full_name: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
};

const CommentInput = ({ value, onChange, onSubmit, placeholder, isSubmitting, onCancel }: any) => (
  <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
    <div style={{ display: 'flex', gap: '8px' }}>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isSubmitting}
        autoFocus={!!onCancel}
        className="az-input"
        style={{
          flex: 1, padding: '12px 16px', borderRadius: '24px',
          border: '1px solid var(--v2-outline)', background: 'var(--v2-surface)',
          fontSize: '16px', color: 'var(--v2-text)', outline: 'none',
          transition: 'border-color 0.2s ease',
        }}
      />
      {onCancel && (
        <button type="button" onClick={onCancel} style={{ background: 'transparent', border: 'none', color: 'var(--v2-text-variant)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
      )}
      <button 
        type="submit" 
        disabled={!value.trim() || isSubmitting}
        style={{ 
          background: value.trim() ? '#004e34' : 'var(--v2-surface-highest)', 
          color: value.trim() ? 'white' : 'var(--v2-text-variant)', 
          border: 'none', borderRadius: '24px', padding: '0 20px', 
          fontWeight: 600, fontSize: '14px', cursor: value.trim() && !isSubmitting ? 'pointer' : 'not-allowed',
        }}
      >
        {isSubmitting ? '...' : 'Post'}
      </button>
    </div>
  </form>
);

export default function CommentSection({ postId, onCommentAdded }: { postId: string, onCommentAdded: () => void }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  
  // State for replies and edits
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [postCreatorId, setPostCreatorId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
      
      const { data: postData } = await supabase.from('posts').select('creator_id').eq('id', postId).single();
      if (postData) setPostCreatorId(postData.creator_id);
    }
    
    loadData();
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

  const handleSubmit = async (e: React.FormEvent, parentId: string | null = null) => {
    e.preventDefault();
    const content = parentId ? replyContent : newComment;
    if (!content.trim()) return;

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, parentId }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to post comment');
      }

      if (data.comment) {
        setComments([...comments, data.comment]);
        if (parentId) {
          setReplyContent('');
          setReplyingTo(null);
          // Auto-expand the thread if we just replied
          setExpandedThreads(prev => {
            const next = new Set(prev);
            next.add(parentId);
            return next;
          });
        } else {
          setNewComment('');
        }
        onCommentAdded();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent, commentId: string) => {
    e.preventDefault();
    if (!editContent.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      const res = await fetch(`/api/posts/${postId}/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to edit');
      
      if (data.comment) {
        setComments(comments.map(c => c.id === commentId ? data.comment : c));
        setEditingId(null);
        setEditContent('');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to edit comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    
    try {
      const res = await fetch(`/api/posts/${postId}/comments/${commentId}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        setComments(comments.filter(c => c.id !== commentId && c.parent_id !== commentId));
      } else {
        throw new Error('Failed to delete');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete comment');
    }
  };

  const toggleThread = (commentId: string) => {
    setExpandedThreads(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  if (isLoading) {
    return <div style={{ padding: '16px', color: 'var(--v2-text-variant)', fontSize: '14px', textAlign: 'center' }}>Loading comments...</div>;
  }

  const topLevelComments = comments.filter(c => !c.parent_id);
  const getReplies = (parentId: string) => comments.filter(c => c.parent_id === parentId);


  const renderComment = (comment: Comment, isReply = false) => {
    const isEditing = editingId === comment.id;
    const isReplying = replyingTo === comment.id;
    
    // Check if updated_at is more than 1 second after created_at
    const createdTime = new Date(comment.created_at).getTime();
    const updatedTime = new Date(comment.updated_at).getTime();
    const isEdited = (updatedTime - createdTime) > 1000;
    
    const canEdit = currentUserId === comment.user_id;
    const canDelete = currentUserId === comment.user_id || currentUserId === postCreatorId;
    
    const replies = getReplies(comment.id);
    const hasReplies = replies.length > 0;
    const isExpanded = expandedThreads.has(comment.id);

    return (
      <div key={comment.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ width: isReply ? '24px' : '32px', height: isReply ? '24px' : '32px', borderRadius: '50%', background: 'var(--v2-surface-highest)', flexShrink: 0, overflow: 'hidden', marginTop: '4px' }}>
            {comment.profiles?.avatar_url ? (
              <img src={comment.profiles.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--v2-text-variant)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: isReply ? '14px' : '16px' }}>person</span>
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
                {isEdited && <span style={{ fontStyle: 'italic', marginLeft: '6px', opacity: 0.8 }}>(edited)</span>}
              </span>
            </div>
            
            {isEditing ? (
              <CommentInput 
                value={editContent} 
                onChange={setEditContent} 
                onSubmit={(e: any) => handleEditSubmit(e, comment.id)} 
                placeholder="Edit comment..." 
                isSubmitting={isSubmitting}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div style={{ fontSize: '14px', color: 'var(--v2-text)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {comment.content}
              </div>
            )}
            
            {/* Action Bar (Reply, Edit, Delete) */}
            {!isEditing && (
              <div style={{ display: 'flex', gap: '16px', marginTop: '4px', alignItems: 'center' }}>
                {!isReply && (
                  <button onClick={() => setReplyingTo(isReplying ? null : comment.id)} style={{ background: 'none', border: 'none', color: 'var(--v2-text-variant)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                    Reply
                  </button>
                )}
                {canEdit && (
                  <button onClick={() => { setEditingId(comment.id); setEditContent(comment.content); setReplyingTo(null); }} style={{ background: 'none', border: 'none', color: 'var(--v2-text-variant)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button onClick={() => handleDelete(comment.id)} style={{ background: 'none', border: 'none', color: '#ff3b30', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                    Delete
                  </button>
                )}
              </div>
            )}
            
            {isReplying && (
              <div style={{ marginTop: '12px' }}>
                <CommentInput 
                  value={replyContent} 
                  onChange={setReplyContent} 
                  onSubmit={(e: any) => handleSubmit(e, comment.id)} 
                  placeholder="Write a reply..." 
                  isSubmitting={isSubmitting}
                  onCancel={() => setReplyingTo(null)}
                />
              </div>
            )}

            {/* Replies Thread */}
            {!isReply && hasReplies && (
              <div style={{ marginTop: '8px' }}>
                <button 
                  onClick={() => toggleThread(comment.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--v2-primary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <span style={{ width: '24px', height: '1px', background: 'var(--v2-primary)', display: 'inline-block' }}></span>
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    {isExpanded ? 'Hide replies' : `View ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', marginLeft: '2px' }}>
                      {isExpanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                    </span>
                  </span>
                </button>
                
                {isExpanded && (
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {replies.map(reply => renderComment(reply, true))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ background: 'var(--v2-surface-lowest)', borderRadius: '12px', padding: '16px', border: '1px solid var(--v2-outline)' }}>
      {/* Comment List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '16px', maxHeight: '500px', overflowY: 'auto' }}>
        {topLevelComments.length === 0 ? (
          <div style={{ color: 'var(--v2-text-variant)', fontSize: '14px', textAlign: 'center', padding: '16px 0' }}>
            No comments yet. Be the first to start the conversation!
          </div>
        ) : (
          topLevelComments.map(comment => renderComment(comment))
        )}
      </div>

      {/* New Top-Level Comment Input */}
      {error && <div style={{ color: '#ff3b30', fontSize: '13px', marginBottom: '8px' }}>{error}</div>}
      <CommentInput 
        value={newComment} 
        onChange={setNewComment} 
        onSubmit={(e: any) => handleSubmit(e)} 
        placeholder="Write a comment..." 
        isSubmitting={isSubmitting} 
      />
    </div>
  );
}
