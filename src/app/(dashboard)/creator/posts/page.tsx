'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function CreatorPostsPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [minPrice, setMinPrice] = useState(0); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch tiers to build gating dropdown
      const { data: tierData } = await supabase
        .from('tiers')
        .select('*')
        .eq('creator_id', user.id)
        .eq('is_active', true)
        .order('amount', { ascending: true });
        
      setTiers(tierData || []);

      // If they have tiers, default to the lowest tier price when selecting "gated"
      if (tierData && tierData.length > 0) {
        setMinPrice(tierData[0].amount);
      }

      // Fetch existing posts
      const res = await fetch(`/api/posts?creatorId=${user.id}`);
      const json = await res.json();
      if (json.data) setPosts(json.data);

    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      let imageUrl = currentImageUrl;

      // 1. Upload media if present
      if (file) {
        setUploadProgress(0);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'posts');

        const uploadData = await new Promise<any>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', '/api/upload', true);
          
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percentComplete = Math.round((event.loaded / event.total) * 100);
              setUploadProgress(percentComplete);
            }
          };
          
          xhr.onload = () => {
             if (xhr.status >= 200 && xhr.status < 300) {
               try {
                 resolve(JSON.parse(xhr.responseText));
               } catch (e) {
                 reject(new Error('Invalid response from upload server'));
               }
             } else {
               let msg = 'Media upload failed';
               try { msg = JSON.parse(xhr.responseText).error || msg; } catch (e) {}
               reject(new Error(msg));
             }
          };
          
          xhr.onerror = () => reject(new Error('Network error during upload'));
          xhr.send(formData);
        });
        
        imageUrl = uploadData.url;
        setUploadProgress(100);
      }

      // 2. Create or Update post
      const method = editingPostId ? 'PUT' : 'POST';
      const endpoint = editingPostId ? `/api/posts/${editingPostId}` : '/api/posts';
      
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          isPublic,
          minPrice: isPublic ? 0 : minPrice,
          imageUrl
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      // Refresh posts
      await fetchData();
      
      // Reset form
      cancelEdit();

      // Reset the file input physically
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelEdit = () => {
    setEditingPostId(null);
    setTitle('');
    setContent('');
    setFile(null);
    setIsPublic(true);
    setUploadProgress(0);
    setCurrentImageUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEditClick = (post: any) => {
    setEditingPostId(post.id);
    setTitle(post.title);
    setContent(post.content);
    setIsPublic(post.is_public);
    setMinPrice(post.minimum_tier_amount || 0);
    setCurrentImageUrl(post.image_url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
      if (!res.ok) {
         const data = await res.json();
         throw new Error(data.error || 'Failed to delete post');
      }
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div className="container" style={{ paddingTop: '3rem' }}>Loading posts...</div>;
  }

  return (
    <div className="container" style={{ maxWidth: '800px', paddingTop: '3rem', paddingBottom: '4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Manage Content</h2>
      </div>

      <div className="glass-card" style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0 }}>{editingPostId ? 'Edit Post' : 'Create New Post'}</h3>
          {editingPostId && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={cancelEdit}>
              Cancel Edit
            </button>
          )}
        </div>
        
        {error && <div className="form-error" style={{ marginBottom: '1rem' }}>{error}</div>}
        
        <form onSubmit={handleCreatePost} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Post Title</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="E.g. Behind the scenes: Episode 4"
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Content</label>
            <textarea 
              className="form-input" 
              placeholder="What do you want to share with your fans?"
              style={{ minHeight: '150px', resize: 'vertical' }}
              value={content} 
              onChange={e => setContent(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Media (Optional)</label>
            <input 
              type="file" 
              ref={fileInputRef}
              accept="image/*,video/*"
              className="form-input"
              style={{ background: 'transparent', padding: '0.5rem 0', border: 'none' }}
              onChange={e => setFile(e.target.files?.[0] || null)}
            />
            <span className="form-hint">Upload an image or short video</span>
            {uploadProgress > 0 && uploadProgress < 100 && (
               <div style={{ marginTop: '0.5rem', background: 'var(--bg-secondary)', borderRadius: '1rem', overflow: 'hidden', height: '8px' }}>
                 <div style={{ height: '100%', background: 'var(--accent-primary)', width: `${uploadProgress}%`, transition: 'width 0.2s ease' }} />
               </div>
            )}
            {uploadProgress === 100 && isSubmitting && (
               <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Processing processing uploads, please wait...</p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Visibility Options</label>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  checked={isPublic} 
                  onChange={() => setIsPublic(true)} 
                />
                Public (Visible to everyone)
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  checked={!isPublic} 
                  onChange={() => setIsPublic(false)} 
                  disabled={tiers.length === 0}
                />
                Subscribers Only
              </label>
            </div>
            {tiers.length === 0 && !isPublic && (
               <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                 You must create a tier before you can restrict posts.
               </p>
            )}
          </div>

          {!isPublic && tiers.length > 0 && (
            <div className="form-group" style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
              <label className="form-label">Minimum Tier Access</label>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Fans must be subscribed to this tier (or higher) to view this post.
              </p>
              <select 
                className="form-input" 
                value={minPrice} 
                onChange={e => setMinPrice(Number(e.target.value))}
              >
                {tiers.map(t => (
                  <option key={t.id} value={t.amount}>
                    {t.name} — ₦{(t.amount / 100).toLocaleString()}/month
                  </option>
                ))}
              </select>
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={isSubmitting || (!title || !content)}>
            {isSubmitting ? (editingPostId ? 'Updating...' : 'Publishing...') : (editingPostId ? 'Update Post' : 'Publish Post')}
          </button>
        </form>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h3 style={{ margin: 0 }}>Your Published Posts</h3>
        
        {posts.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>You haven't published anything yet.</p>
        ) : (
          posts.map(post => {
            // Find tier name if gated
            const requiredTier = !post.is_public && tiers.find(t => t.amount === post.minimum_tier_amount);
            
            return (
              <div key={post.id} className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1.125rem' }}>{post.title}</h4>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '1rem',
                      background: post.is_public ? 'var(--bg-secondary)' : 'rgba(139, 92, 246, 0.1)',
                      color: post.is_public ? 'var(--text-secondary)' : 'var(--accent-primary)',
                      fontWeight: 600
                    }}>
                      {post.is_public ? 'Public' : (requiredTier ? `${requiredTier.name} +` : 'Subscribers Only')}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleEditClick(post)} className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                      Edit
                    </button>
                    <button onClick={() => handleDeletePost(post.id)} className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
                      Delete
                    </button>
                  </div>
                </div>
                
                {post.image_url && (
                  <div style={{ marginBottom: '1rem', borderRadius: 'var(--radius-sm)', overflow: 'hidden', maxHeight: '200px', background: '#000' }}>
                    {post.image_url.includes('/video/') ? (
                      <video src={post.image_url} controls playsInline style={{ width: '100%', height: '200px', objectFit: 'contain' }} />
                    ) : (
                      <img src={post.image_url} alt="Post media" style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
                    )}
                  </div>
                )}
                
                <p style={{ 
                  color: 'var(--text-secondary)', 
                  whiteSpace: 'pre-wrap', 
                  fontSize: '0.938rem',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {post.content}
                </p>
                <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Published {new Date(post.created_at).toLocaleDateString()}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
