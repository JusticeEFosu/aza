'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import MobileNav from '@/components/MobileNav';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function ComposeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');

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

  useEffect(() => { fetchData(); }, [editId]);

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
      
      if (editId) {
        const res = await fetch(`/api/posts?creatorId=${user.id}`);
        const json = await res.json();
        const post = json.data?.find((p: any) => p.id === editId);
        if (post) {
          setTitle(post.title || '');
          setContent(post.content || '');
          setIsPublic(post.is_public);
          setMinPrice(post.minimum_tier_amount || 0);
          setCurrentImageUrl(post.image_url);
          setCurrentThumbnailUrl(post.thumbnail_url);
        }
      } else if (tierData && tierData.length > 0) {
        setMinPrice(tierData[0].amount);
      }
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

      const method = editId ? 'PUT' : 'POST';
      const endpoint = editId ? `/api/posts/${editId}` : '/api/posts';
      const res = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, content, isPublic, minPrice: isPublic ? 0 : minPrice, imageUrl, thumbnailUrl }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      
      // Navigate back on success
      router.push('/creator/posts');
      router.refresh();
    } catch (err: any) { setError(err.message); }
    finally { setIsSubmitting(false); setUploadProgress(0); }
  };

  if (loading) {
    return (
      <div className="v2-dashboard-layout" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <span className="spinner" style={{ width: '32px', height: '32px', borderColor: 'rgba(0,0,0,0.1)', borderTopColor: 'var(--v2-primary)' }} />
      </div>
    );
  }

  const isVideo = ((file && file.type.startsWith('video/')) || (!file && currentImageUrl?.includes('/video/')));

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
        <Link href="/creator/posts/compose" className="v2-sidebar-btn">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
          Post Update
        </Link>
        <div className="v2-nav-list">
          <Link href="/creator" className="v2-nav-item"><span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>Home</Link>
          <Link href="/creator/tiers" className="v2-nav-item"><span className="material-symbols-outlined">group</span>Subscribers</Link>
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

      <MobileNav role="creator" />

      {/* Main Content */}
      <main className="v2-main-content" style={{ maxWidth: '800px', paddingBottom: '128px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', borderBottom: '1px solid var(--v2-outline)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link href="/creator/posts" style={{ color: 'var(--v2-text-variant)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>arrow_back</span>
            </Link>
            <h1 style={{ fontSize: '32px', fontWeight: 600, color: 'var(--v2-primary)', margin: 0, letterSpacing: '-0.01em' }}>
              {editId ? 'Edit Post' : 'Create Post'}
            </h1>
          </div>
          <button 
            type="submit" 
            form="post-form"
            disabled={isSubmitting || (!title && !content)}
            style={{
              background: 'var(--v2-primary)',
              color: 'var(--v2-on-primary)',
              borderRadius: '8px',
              padding: '10px 24px',
              fontWeight: 600,
              fontSize: '14px',
              border: 'none',
              cursor: (isSubmitting || (!title && !content)) ? 'not-allowed' : 'pointer',
              opacity: (isSubmitting || (!title && !content)) ? 0.5 : 1,
              transition: 'opacity 0.2s',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isSubmitting ? (editId ? 'Updating...' : 'Publishing...') : (editId ? 'Update Post' : 'Publish Update')}
          </button>
        </header>

        {error && <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>{error}</div>}

        <form id="post-form" onSubmit={handleCreatePost} style={{ display: 'flex', flexDirection: 'column', gap: '32px', marginBottom: '64px' }}>
          
          {/* Composer Area */}
          <div style={{ background: 'var(--v2-surface-lowest)', border: '1px solid var(--v2-outline)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0px 4px 20px rgba(0,0,0,0.02)' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)' }}>Post Title (Optional)</label>
              <input 
                type="text" 
                placeholder="Give your update a clear title..." 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                style={{ width: '100%', background: 'var(--v2-surface-bright, #f8f9ff)', border: '1px solid var(--v2-outline)', fontSize: '20px', fontWeight: 600, padding: '16px', borderRadius: '8px', outline: 'none' }} 
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <textarea 
                placeholder="What's new? Share updates, thoughts, or exclusive content with your subscribers..." 
                value={content} 
                onChange={e => setContent(e.target.value)} 
                required
                style={{ width: '100%', background: 'var(--v2-surface-bright, #f8f9ff)', border: '1px solid var(--v2-outline)', fontSize: '16px', padding: '16px', borderRadius: '8px', outline: 'none', minHeight: '200px', resize: 'vertical', fontFamily: 'inherit' }} 
              />
            </div>

            {/* Media Attachments */}
            <div style={{ display: 'grid', gridTemplateColumns: isVideo ? '1fr 1fr' : '1fr', gap: '16px' }}>
              
              {/* Primary Media */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--v2-primary)'; }}
                onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--v2-outline)'; }}
                onDrop={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--v2-outline)'; if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]); }}
                style={{ border: '1px dashed var(--v2-outline)', borderRadius: '8px', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '12px', background: 'var(--v2-surface-low)', cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden', minHeight: '160px' }}
              >
                <input type="file" ref={fileInputRef} accept="image/*,video/*" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] || null)} />
                
                {(previewUrl || currentImageUrl) ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {isVideo ? (
                      <video src={previewUrl || currentImageUrl || ''} style={{ maxHeight: '120px', borderRadius: '8px', maxWidth: '100%' }} />
                    ) : (
                      <img src={previewUrl || currentImageUrl || ''} alt="Preview" style={{ maxHeight: '120px', borderRadius: '8px', maxWidth: '100%', objectFit: 'contain' }} />
                    )}
                    <span style={{ fontSize: '14px', marginTop: '12px', color: 'var(--v2-primary)', fontWeight: 600 }}>Click to change media</span>
                  </div>
                ) : (
                  <>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--v2-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--v2-text-variant)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>add_photo_alternate</span>
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--v2-primary)', margin: 0 }}>Click to Add Media</p>
                      <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)', margin: 0 }}>Images, Video, or Audio files</p>
                    </div>
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

              {/* Conditional Video Thumbnail Box */}
              {isVideo && (
                <div
                  onClick={() => thumbnailInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--v2-primary)'; }}
                  onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--v2-outline)'; }}
                  onDrop={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--v2-outline)'; if (e.dataTransfer.files?.[0]) setThumbnailFile(e.dataTransfer.files[0]); }}
                  style={{ border: '1px dashed var(--v2-outline)', borderRadius: '8px', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '12px', background: 'var(--v2-surface-low)', cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden', minHeight: '160px' }}
                >
                  <input type="file" ref={thumbnailInputRef} accept="image/*" style={{ display: 'none' }} onChange={e => setThumbnailFile(e.target.files?.[0] || null)} />
                  
                  {(thumbnailPreviewUrl || currentThumbnailUrl) ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <img src={thumbnailPreviewUrl || currentThumbnailUrl || ''} alt="Thumbnail" style={{ maxHeight: '120px', borderRadius: '8px', maxWidth: '100%', objectFit: 'contain' }} />
                      <span style={{ fontSize: '14px', marginTop: '12px', color: 'var(--v2-primary)', fontWeight: 600 }}>Click to change thumbnail</span>
                    </div>
                  ) : (
                    <>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--v2-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--v2-text-variant)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>image</span>
                      </div>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--v2-primary)', margin: 0 }}>Video Thumbnail</p>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)', margin: 0 }}>Upload a cover image</p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Settings Area */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            
            {/* Visibility Settings */}
            <div style={{ background: 'var(--v2-surface-lowest)', border: '1px solid var(--v2-outline)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0px 4px 20px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--v2-text-variant)' }}>visibility</span>
                <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--v2-primary)', margin: 0 }}>Set Visibility</h3>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', border: `1px solid ${isPublic ? 'var(--v2-primary)' : 'var(--v2-outline)'}`, borderRadius: '8px', cursor: 'pointer', background: isPublic ? 'var(--v2-surface-low)' : 'transparent', transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--v2-primary)' }}>All Subscribers</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)' }}>Visible to everyone in any active tier.</span>
                </div>
                <input type="radio" checked={isPublic} onChange={() => setIsPublic(true)} style={{ width: '16px', height: '16px', accentColor: 'var(--v2-primary)' }} />
              </label>

              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', border: `1px solid ${!isPublic ? 'var(--v2-primary)' : 'var(--v2-outline)'}`, borderRadius: '8px', cursor: tiers.length > 0 ? 'pointer' : 'not-allowed', background: !isPublic ? 'var(--v2-surface-low)' : 'transparent', opacity: tiers.length > 0 ? 1 : 0.5, transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--v2-primary)' }}>Specific Tiers</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)' }}>Limit access to selected levels.</span>
                </div>
                <input type="radio" checked={!isPublic} onChange={() => setIsPublic(false)} disabled={tiers.length === 0} style={{ width: '16px', height: '16px', accentColor: 'var(--v2-primary)' }} />
              </label>

              {!isPublic && tiers.length > 0 && (
                <div style={{ marginTop: '4px', paddingLeft: '12px', borderLeft: '2px solid var(--v2-outline)' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)', marginBottom: '8px' }}>Select Minimum Tier</label>
                  <select value={minPrice} onChange={e => setMinPrice(Number(e.target.value))} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--v2-outline)', background: 'var(--v2-surface-bright)', fontSize: '14px', outline: 'none' }}>
                    {tiers.map((t: any) => <option key={t.id} value={t.amount}>{t.name} — ₦{(t.amount / 100).toLocaleString()}/mo</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Options (Non-functional placeholders) */}
            <div style={{ background: 'var(--v2-surface-lowest)', border: '1px solid var(--v2-outline)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0px 4px 20px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--v2-text-variant)' }}>tune</span>
                  <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--v2-primary)', margin: 0 }}>Options</h3>
                </div>
                <span style={{ fontSize: '10px', background: 'var(--v2-surface-low)', color: 'var(--v2-primary)', padding: '4px 8px', borderRadius: '4px', fontWeight: 700, textTransform: 'uppercase' }}>Coming Soon</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', border: '1px solid var(--v2-outline)', borderRadius: '8px', opacity: 0.5, pointerEvents: 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--v2-primary)' }}>Pin to Profile</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)' }}>Keep this post at the top.</span>
                </div>
                <div style={{ width: '40px', height: '24px', background: 'var(--v2-outline)', borderRadius: '12px', position: 'relative' }}>
                  <div style={{ width: '20px', height: '20px', background: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: '2px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', border: '1px solid var(--v2-outline)', borderRadius: '8px', opacity: 0.5, pointerEvents: 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--v2-primary)' }}>Allow Comments</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)' }}>Let subscribers engage.</span>
                </div>
                <div style={{ width: '40px', height: '24px', background: 'var(--v2-primary)', borderRadius: '12px', position: 'relative' }}>
                  <div style={{ width: '20px', height: '20px', background: 'white', borderRadius: '50%', position: 'absolute', top: '2px', right: '2px' }} />
                </div>
              </div>
            </div>

          </div>

        </form>
      </main>

      {/* Bottom Nav (Mobile) */}
      <nav className="v2-bottom-nav">
        <Link href="/creator" className="v2-bottom-nav-item"><span className="material-symbols-outlined v2-bottom-nav-icon" style={{ fontVariationSettings: "'FILL' 1" }}>home</span><span className="v2-bottom-nav-label">Home</span></Link>
        <Link href="/creator/tiers" className="v2-bottom-nav-item"><span className="material-symbols-outlined v2-bottom-nav-icon">group</span><span className="v2-bottom-nav-label">Subs</span></Link>
        <Link href="/creator/posts/compose" className="v2-bottom-fab"><span className="material-symbols-outlined">add</span></Link>
        <Link href="/creator/payouts" className="v2-bottom-nav-item"><span className="material-symbols-outlined v2-bottom-nav-icon">payments</span><span className="v2-bottom-nav-label">Earnings</span></Link>
        <Link href="/creator/settings" className="v2-bottom-nav-item"><span className="material-symbols-outlined v2-bottom-nav-icon">settings</span><span className="v2-bottom-nav-label">Settings</span></Link>
      </nav>
    </div>
  );
}

export default function ComposePage() {
  return (
    <Suspense fallback={<div className="v2-dashboard-layout" style={{ justifyContent: 'center', alignItems: 'center' }}><span className="spinner" /></div>}>
      <ComposeForm />
    </Suspense>
  );
}
