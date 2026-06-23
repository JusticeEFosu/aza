'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import VideoPlayer from '@/components/VideoPlayer';
import Link from 'next/link';

export default function CreatorPostsPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('Creator');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [minPrice, setMinPrice] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [currentThumbnailUrl, setCurrentThumbnailUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else { setPreviewUrl(null); }
  }, [file]);

  useEffect(() => {
    if (thumbnailFile) {
      const url = URL.createObjectURL(thumbnailFile);
      setThumbnailPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else { setThumbnailPreviewUrl(null); }
  }, [thumbnailFile]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, creatorRes] = await Promise.all([
        supabase.from('profiles').select('avatar_url, display_name, full_name').eq('id', user.id).single(),
        supabase.from('creator_profiles').select('display_name').eq('id', user.id).single()
      ]);

      if (profileRes?.data) {
        setAvatarUrl(profileRes.data.avatar_url || '');
        setDisplayName(creatorRes?.data?.display_name || profileRes.data.display_name || profileRes.data.full_name || 'Creator');
      }

      const { data: tierData } = await supabase.from('tiers').select('*').eq('creator_id', user.id).eq('is_active', true).order('amount', { ascending: true });
      setTiers(tierData || []);
      if (tierData && tierData.length > 0) setMinPrice(tierData[0].amount);

      const res = await fetch(`/api/posts?creatorId=${user.id}`);
      const json = await res.json();
      if (json.data) setPosts(json.data);
    } catch (err: any) { console.error(err); }
    finally { setLoading(false); }
  };

  const uploadWithProgress = (fileToUpload: File, folder: string) => {
    return new Promise<any>((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('folder', folder);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload', true);
      xhr.upload.onprogress = (event) => { if (event.lengthComputable) setUploadProgress(Math.round((event.loaded / event.total) * 100)); };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) { try { resolve(JSON.parse(xhr.responseText)); } catch (e) { reject(new Error('Invalid response')); } }
        else { let msg = 'Upload failed'; try { msg = JSON.parse(xhr.responseText).error || msg; } catch (e) { } reject(new Error(msg)); }
      };
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.send(formData);
    });
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      let imageUrl = currentImageUrl;
      let thumbnailUrl = currentThumbnailUrl;
      if (file) { setUploadProgress(0); const d = await uploadWithProgress(file, 'posts'); imageUrl = d.url; setUploadProgress(100); }
      if (thumbnailFile) { setUploadProgress(0); const d = await uploadWithProgress(thumbnailFile, 'thumbnails'); thumbnailUrl = d.url; setUploadProgress(100); }

      const method = editingPostId ? 'PUT' : 'POST';
      const endpoint = editingPostId ? `/api/posts/${editingPostId}` : '/api/posts';
      const res = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, content, isPublic, minPrice: isPublic ? 0 : minPrice, imageUrl, thumbnailUrl }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await fetchData();
      cancelEdit();
    } catch (err: any) { setError(err.message); }
    finally { setIsSubmitting(false); setUploadProgress(0); }
  };

  const cancelEdit = () => { setEditingPostId(null); setTitle(''); setContent(''); setFile(null); setThumbnailFile(null); setIsPublic(true); setUploadProgress(0); setCurrentImageUrl(null); setCurrentThumbnailUrl(null); if (fileInputRef.current) fileInputRef.current.value = ''; if (thumbnailInputRef.current) thumbnailInputRef.current.value = ''; };

  const handleEditClick = (post: any) => { setEditingPostId(post.id); setTitle(post.title); setContent(post.content); setIsPublic(post.is_public); setMinPrice(post.minimum_tier_amount || 0); setCurrentImageUrl(post.image_url); setCurrentThumbnailUrl(post.thumbnail_url); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try { const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' }); if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Failed'); } await fetchData(); }
    catch (err: any) { alert(err.message); }
  };

  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--v2-outline)', background: 'var(--v2-surface)', fontSize: '16px' };

  const dropZoneStyle = {
    border: '2px dashed var(--v2-outline)',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center' as const,
    cursor: 'pointer',
    background: 'var(--v2-surface-low)',
    transition: 'all 0.2s',
    position: 'relative' as const,
    overflow: 'hidden' as const,
    minHeight: '180px',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center'
  };

  if (loading) {
    return (
      <div className="v2-dashboard-layout" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <span className="spinner" style={{ width: '32px', height: '32px', borderColor: 'rgba(0,0,0,0.1)', borderTopColor: 'var(--v2-primary)' }} />
      </div>
    );
  }

  return (
    <div className="v2-dashboard-layout">
      {/* Sidebar */}
      <nav className="v2-sidebar">
        <div className="v2-sidebar-header">
          {avatarUrl ? <img src={avatarUrl} alt="" className="v2-sidebar-avatar" /> : <div className="v2-sidebar-avatar">{displayName.charAt(0).toUpperCase()}</div>}
          <div>
            <h2 className="v2-sidebar-title">{displayName}</h2>
            <p className="v2-sidebar-subtitle">Verified Account</p>
          </div>
        </div>
        <Link href="/creator/posts" className="v2-sidebar-btn">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
          Post Update
        </Link>
        <div className="v2-nav-list">
          <Link href="/creator" className="v2-nav-item"><span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>Home</Link>
          <Link href="/creator/tiers" className="v2-nav-item"><span className="material-symbols-outlined">group</span>Subscriptions</Link>
          <Link href="#" className="v2-nav-item"><span className="material-symbols-outlined">mail</span>Messages</Link>
          <Link href="/creator/payouts" className="v2-nav-item"><span className="material-symbols-outlined">payments</span>Earnings</Link>
          <Link href="/creator/settings" className="v2-nav-item"><span className="material-symbols-outlined">settings</span>Settings</Link>
        </div>
        <div className="v2-sidebar-footer">
          <Link href="#" className="v2-nav-item"><span className="material-symbols-outlined">help</span>Help</Link>
          <form action="/api/auth/signout" method="POST" style={{ display: 'inline' }}>
            <button type="submit" className="v2-nav-item" style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', font: 'inherit', color: 'inherit' }}>
              <span className="material-symbols-outlined">logout</span>Sign Out
            </button>
          </form>
        </div>
      </nav>

      {/* Main Content */}
      <main className="v2-main-content" style={{ maxWidth: '900px' }}>
        <header style={{ marginBottom: '32px' }}>
          <h1 className="v2-dash-title">{editingPostId ? 'Edit Post' : 'New Post'}</h1>
          <p className="v2-dash-desc">Create content for your fans. Choose who gets to see it.</p>
        </header>

        {/* Post Editor Card */}
        <div style={{ background: 'var(--v2-surface-lowest)', border: '1px solid var(--v2-outline)', borderRadius: '12px', padding: '24px', marginBottom: '48px' }}>
          {editingPostId && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <button type="button" onClick={cancelEdit} style={{ padding: '6px 16px', background: 'var(--v2-surface-low)', border: '1px solid var(--v2-outline)', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: 'var(--v2-text-variant)' }}>Cancel Edit</button>
            </div>
          )}

          {error && <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>{error}</div>}

          <form onSubmit={handleCreatePost} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Title */}
            <input type="text" placeholder="Post title..." value={title} onChange={e => setTitle(e.target.value)} required style={{ ...inputStyle, fontSize: '20px', fontWeight: 600, border: 'none', padding: '8px 0', background: 'transparent' }} />

            {/* Content */}
            <textarea placeholder="What do you want to share with your fans?" value={content} onChange={e => setContent(e.target.value)} style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }} />

            {/* Media Upload Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Primary Media */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={dropZoneStyle}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--v2-primary)'; }}
                onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--v2-outline)'; }}
                onDrop={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--v2-outline)'; if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]); }}
              >
                <input type="file" ref={fileInputRef} accept="image/*,video/*" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] || null)} />
                {(previewUrl || currentImageUrl) ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {((file && file.type.startsWith('video/')) || (!file && currentImageUrl?.includes('/video/'))) ? (
                      <video src={previewUrl || currentImageUrl || ''} style={{ maxHeight: '100px', borderRadius: '8px', maxWidth: '100%' }} />
                    ) : (
                      <img src={previewUrl || currentImageUrl || ''} alt="Preview" style={{ maxHeight: '100px', borderRadius: '8px', maxWidth: '100%', objectFit: 'contain' }} />
                    )}
                    <span style={{ fontSize: '12px', marginTop: '8px', color: 'var(--v2-primary)', fontWeight: 600 }}>Click to change</span>
                  </div>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--v2-text-variant)', marginBottom: '8px' }}>upload_file</span>
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>Upload Media</span>
                    <span style={{ fontSize: '12px', color: 'var(--v2-text-variant)' }}>Drag & drop or click</span>
                  </>
                )}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', zIndex: 10 }}>
                    <div style={{ fontWeight: 600, marginBottom: '8px' }}>Uploading... {uploadProgress}%</div>
                    <div style={{ width: '80%', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'white', transition: 'width 0.2s' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Thumbnail */}
              <div
                onClick={() => thumbnailInputRef.current?.click()}
                style={dropZoneStyle}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--v2-primary)'; }}
                onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--v2-outline)'; }}
                onDrop={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--v2-outline)'; if (e.dataTransfer.files?.[0]) setThumbnailFile(e.dataTransfer.files[0]); }}
              >
                <input type="file" ref={thumbnailInputRef} accept="image/*" style={{ display: 'none' }} onChange={e => setThumbnailFile(e.target.files?.[0] || null)} />
                {(thumbnailPreviewUrl || currentThumbnailUrl) ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <img src={thumbnailPreviewUrl || currentThumbnailUrl || ''} alt="Thumbnail" style={{ maxHeight: '100px', borderRadius: '8px', maxWidth: '100%', objectFit: 'contain' }} />
                    <span style={{ fontSize: '12px', marginTop: '8px', color: 'var(--v2-primary)', fontWeight: 600 }}>Click to change</span>
                  </div>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: '32px', color: 'var(--v2-text-variant)', marginBottom: '8px' }}>image</span>
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>Video Thumbnail</span>
                    <span style={{ fontSize: '12px', color: 'var(--v2-text-variant)' }}>Optional poster image</span>
                  </>
                )}
              </div>
            </div>

            {/* Visibility */}
            <div style={{ background: 'var(--v2-surface-low)', border: '1px solid var(--v2-outline)', borderRadius: '12px', padding: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Visibility</label>
              <div style={{ display: 'flex', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                  <input type="radio" checked={isPublic} onChange={() => setIsPublic(true)} style={{ accentColor: 'var(--v2-primary)' }} />
                  Public
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', opacity: tiers.length === 0 ? 0.4 : 1 }}>
                  <input type="radio" checked={!isPublic} onChange={() => setIsPublic(false)} disabled={tiers.length === 0} style={{ accentColor: 'var(--v2-primary)' }} />
                  Subscribers Only
                </label>
              </div>
              {!isPublic && tiers.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--v2-text-variant)', marginBottom: '6px' }}>Minimum Tier</label>
                  <select value={minPrice} onChange={e => setMinPrice(Number(e.target.value))} style={{ ...inputStyle, fontSize: '14px' }}>
                    {tiers.map((t: any) => <option key={t.id} value={t.amount}>{t.name} — ₦{(t.amount / 100).toLocaleString()}/mo</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--v2-outline)', paddingTop: '20px' }}>
              <button type="submit" disabled={isSubmitting || !title} style={{ padding: '10px 28px', background: 'var(--v2-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', opacity: (isSubmitting || !title) ? 0.5 : 1 }}>
                {isSubmitting ? (editingPostId ? 'Updating...' : 'Publishing...') : (editingPostId ? 'Update Post' : 'Publish')}
              </button>
            </div>
          </form>
        </div>

        {/* Published Posts */}
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>Published Posts</h2>
        {posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px', background: 'var(--v2-surface-lowest)', border: '1px solid var(--v2-outline)', borderRadius: '12px', color: 'var(--v2-text-variant)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }}>article</span>
            <p style={{ fontSize: '16px', fontWeight: 500 }}>No posts yet</p>
            <p style={{ fontSize: '14px', marginTop: '4px' }}>Create your first post above to get started.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {posts.map(post => {
              const requiredTier = !post.is_public && tiers.find((t: any) => t.amount === post.minimum_tier_amount);
              return (
                <div key={post.id} style={{ background: 'var(--v2-surface-lowest)', border: '1px solid var(--v2-outline)', borderRadius: '12px', padding: '20px', transition: 'all 0.2s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>{post.title}</h3>
                      <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '999px', background: post.is_public ? 'var(--v2-surface-low)' : 'rgba(0,0,0,0.06)', color: post.is_public ? 'var(--v2-text-variant)' : 'var(--v2-primary)', fontWeight: 600 }}>
                        {post.is_public ? 'Public' : (requiredTier ? `${requiredTier.name} +` : 'Subscribers')}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleEditClick(post)} style={{ padding: '6px 14px', background: 'var(--v2-surface-low)', border: '1px solid var(--v2-outline)', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                      <button onClick={() => handleDeletePost(post.id)} style={{ padding: '6px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: '#dc2626' }}>Delete</button>
                    </div>
                  </div>

                  {post.image_url && (
                    <div style={{ marginBottom: '12px', borderRadius: '8px', overflow: 'hidden', maxHeight: '240px', background: '#000' }}>
                      {post.image_url.includes('/video/') ? (
                        <VideoPlayer src={post.image_url} poster={post.thumbnail_url} style={{ maxHeight: '240px' }} />
                      ) : (
                        <img src={post.image_url} alt="" style={{ width: '100%', maxHeight: '240px', objectFit: 'cover' }} />
                      )}
                    </div>
                  )}

                  <p style={{ color: 'var(--v2-text-variant)', whiteSpace: 'pre-wrap', fontSize: '14px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {post.content}
                  </p>
                  <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--v2-text-variant)' }}>
                    Published {new Date(post.created_at).toLocaleDateString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Bottom Nav (Mobile) */}
      <nav className="v2-bottom-nav">
        <Link href="/creator" className="v2-bottom-nav-item"><span className="material-symbols-outlined v2-bottom-nav-icon" style={{ fontVariationSettings: "'FILL' 1" }}>home</span><span className="v2-bottom-nav-label">Home</span></Link>
        <Link href="/creator/tiers" className="v2-bottom-nav-item"><span className="material-symbols-outlined v2-bottom-nav-icon">group</span><span className="v2-bottom-nav-label">Subs</span></Link>
        <Link href="/creator/posts" className="v2-bottom-fab"><span className="material-symbols-outlined">add</span></Link>
        <Link href="/creator/payouts" className="v2-bottom-nav-item"><span className="material-symbols-outlined v2-bottom-nav-icon">payments</span><span className="v2-bottom-nav-label">Earnings</span></Link>
        <Link href="/creator/settings" className="v2-bottom-nav-item"><span className="material-symbols-outlined v2-bottom-nav-icon">settings</span><span className="v2-bottom-nav-label">Settings</span></Link>
      </nav>
    </div>
  );
}
