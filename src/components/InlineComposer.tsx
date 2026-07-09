'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function InlineComposer({ 
  tiers = [], 
  onSuccess,
  editId = null,
  onCancel
}: { 
  tiers?: any[], 
  onSuccess?: () => void,
  editId?: string | null,
  onCancel?: () => void
}) {
  const router = useRouter();
  const supabase = createClient();
  
  const [isExpanded, setIsExpanded] = useState(!!editId); // Auto-expand if editing
  const [loading, setLoading] = useState(!!editId);

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
  const [currentEmbedUrl, setCurrentEmbedUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);
  
  const [mediaMode, setMediaMode] = useState<'upload' | 'embed'>('upload');
  const [embedUrlInput, setEmbedUrlInput] = useState('');

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

  useEffect(() => { 
    if (editId) fetchEditData(); 
    else if (tiers.length > 0) setMinPrice(tiers[0].amount);
  }, [editId, tiers]);

  const fetchEditData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
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
        setCurrentEmbedUrl(post.embed_url);
        if (post.embed_url) {
          setMediaMode('embed');
          setEmbedUrlInput(post.embed_url);
        }
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const uploadWithProgress = async (fileToUpload: File, folder: string) => {
    // 1. Compress image before uploading
    let finalFile = fileToUpload;
    try {
      const { compressImage } = await import('@/lib/utils/imageCompression');
      finalFile = await compressImage(fileToUpload, 1.5, 1920);
    } catch (err) {
      console.error("Failed to compress post media", err);
    }

    // 2. Fetch signature
    const sigRes = await fetch(`/api/upload/signature?folder=${folder}`);
    if (!sigRes.ok) throw new Error('Could not get upload signature');
    const { signature, timestamp, apiKey, cloudName } = await sigRes.json();

    return new Promise<any>((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', finalFile);
      formData.append('folder', folder);
      formData.append('signature', signature);
      formData.append('timestamp', timestamp);
      formData.append('api_key', apiKey);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, true);
      
      xhr.upload.onprogress = (event) => { 
        if (event.lengthComputable) setUploadProgress(Math.round((event.loaded / event.total) * 100)); 
      };
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) { 
          try { 
            const data = JSON.parse(xhr.responseText);
            resolve({ url: data.secure_url, publicId: data.public_id, resourceType: data.resource_type }); 
          } catch (e) { reject(new Error('Invalid response')); } 
        } else { 
          let msg = 'Upload failed'; 
          try { msg = JSON.parse(xhr.responseText).error?.message || msg; } catch (e) { } 
          reject(new Error(msg)); 
        }
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
      let imageUrl = mediaMode === 'upload' ? currentImageUrl : null;
      let thumbnailUrl = mediaMode === 'upload' ? currentThumbnailUrl : null;
      let embedUrl = mediaMode === 'embed' ? embedUrlInput : null;
      
      // Upload video/image
      if (mediaMode === 'upload' && file) { 
        setUploadProgress(0); 
        const d = await uploadWithProgress(file, 'posts'); 
        imageUrl = d.url; 
        setUploadProgress(100); 
      }
      
      const isVideoNow = mediaMode === 'upload' && ((file && file.type.startsWith('video/')) || (!file && imageUrl?.includes('/video/')));

      // Process thumbnail
      if (mediaMode === 'upload' && thumbnailFile) { 
        setUploadProgress(0); 
        const d = await uploadWithProgress(thumbnailFile, 'thumbnails'); 
        thumbnailUrl = d.url; 
        setUploadProgress(100); 
      } else if (mediaMode === 'upload' && isVideoNow && imageUrl) {
        // Auto-generate thumbnail via Cloudinary by changing extension to .jpg
        thumbnailUrl = imageUrl.replace(/\.[^/.]+$/, ".jpg");
      }

      const method = editId ? 'PUT' : 'POST';
      const endpoint = editId ? `/api/posts/${editId}` : '/api/posts';
      const res = await fetch(endpoint, { 
        method, 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          title, 
          content, 
          isPublic, 
          minPrice: isPublic ? 0 : minPrice, 
          imageUrl, 
          thumbnailUrl,
          embedUrl
        }) 
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      
      // Reset form on success if not editing
      if (!editId) {
        setTitle('');
        setContent('');
        setFile(null);
        setThumbnailFile(null);
        setPreviewUrl(null);
        setThumbnailPreviewUrl(null);
        setCurrentImageUrl(null);
        setCurrentThumbnailUrl(null);
        setCurrentEmbedUrl(null);
        setEmbedUrlInput('');
        setMediaMode('upload');
        setIsExpanded(false);
      }
      
      if (onSuccess) onSuccess();
      
    } catch (err: any) { setError(err.message); }
    finally { setIsSubmitting(false); setUploadProgress(0); }
  };

  const isVideo = mediaMode === 'upload' && ((file && file.type.startsWith('video/')) || (!file && currentImageUrl?.includes('/video/')));

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
        <span className="spinner" style={{ width: '24px', height: '24px', borderColor: 'rgba(0,0,0,0.1)', borderTopColor: 'var(--v2-primary)' }} />
      </div>
    );
  }

  return (
    <div style={{ 
      background: 'var(--v2-surface-lowest)', 
      border: '1px solid var(--v2-outline)', 
      borderRadius: '12px', 
      boxShadow: isExpanded ? '0px 12px 32px rgba(0,0,0,0.06)' : '0px 4px 12px rgba(0,0,0,0.02)', 
      overflow: 'hidden',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      marginBottom: '32px'
    }}>
      {error && <div style={{ padding: '12px 16px', background: '#fef2f2', color: '#991b1b', borderBottom: '1px solid #fecaca', fontSize: '14px' }}>{error}</div>}

      <form id="inline-post-form" onSubmit={handleCreatePost} style={{ display: 'flex', flexDirection: 'column' }}>
        
        {/* Collapsed State: Action Card */}
        {!isExpanded ? (
          <div 
            onClick={() => setIsExpanded(true)}
            style={{ 
              padding: '24px 16px', 
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              background: 'linear-gradient(135deg, var(--v2-surface-lowest) 0%, var(--v2-surface-low) 100%)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--v2-surface-bright)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, var(--v2-surface-lowest) 0%, var(--v2-surface-low) 100%)'}
          >
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--v2-surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', color: 'var(--v2-primary)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>edit_square</span>
            </div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 600, color: 'var(--v2-primary)' }}>Engage your fans today</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--v2-text-variant)' }}>Share exclusive updates, videos, and behind-the-scenes content.</p>
            <button type="button" style={{ background: 'var(--v2-primary)', color: 'var(--v2-on-primary)', border: 'none', borderRadius: '999px', padding: '8px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
              Create Post
            </button>
          </div>
        ) : (
          <div style={{ padding: '20px' }}>
            <input 
              type="text" 
              placeholder="Title" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              required
              style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid var(--v2-outline)', fontSize: '20px', fontWeight: 600, paddingBottom: '12px', marginBottom: '16px', outline: 'none', color: 'var(--v2-primary)' }} 
            />

            <textarea 
              placeholder="Description" 
              value={content} 
              onChange={e => setContent(e.target.value)} 
              style={{ 
                width: '100%', 
                background: 'transparent', 
                border: 'none', 
                fontSize: '16px', 
                outline: 'none', 
                minHeight: '120px', 
                resize: 'vertical', 
                fontFamily: 'inherit',
                color: 'var(--v2-text-variant)',
                lineHeight: '1.5'
              }} 
            />
          </div>
        )}

        {/* Expanded Area */}
        {isExpanded && (
          <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--v2-outline)' }}>
            
            {/* Media Mode Toggle */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
               <button type="button" onClick={() => setMediaMode('upload')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--v2-outline)', background: mediaMode === 'upload' ? 'var(--v2-primary)' : 'transparent', color: mediaMode === 'upload' ? 'var(--v2-on-primary)' : 'var(--v2-text-variant)', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Upload File</button>
               <button type="button" onClick={() => setMediaMode('embed')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--v2-outline)', background: mediaMode === 'embed' ? 'var(--v2-primary)' : 'transparent', color: mediaMode === 'embed' ? 'var(--v2-on-primary)' : 'var(--v2-text-variant)', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Embed Video</button>
            </div>

            {mediaMode === 'upload' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '16px' }}>
              
              {/* Primary Media */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--v2-primary)'; }}
                onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--v2-outline)'; }}
                onDrop={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--v2-outline)'; if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]); }}
                style={{ border: '1px dashed var(--v2-outline)', borderRadius: '8px', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '12px', background: 'var(--v2-surface-low)', cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden', minHeight: '140px' }}
              >
                <input type="file" ref={fileInputRef} accept="image/*,video/*" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] || null)} />
                
                {(previewUrl || currentImageUrl) ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {isVideo ? (
                      <video src={previewUrl || currentImageUrl || ''} style={{ maxHeight: '100px', borderRadius: '8px', maxWidth: '100%' }} />
                    ) : (
                      <img src={previewUrl || currentImageUrl || ''} alt="Preview" style={{ maxHeight: '100px', borderRadius: '8px', maxWidth: '100%', objectFit: 'contain' }} />
                    )}
                    <span style={{ fontSize: '12px', marginTop: '8px', color: 'var(--v2-primary)', fontWeight: 600 }}>Change media</span>
                  </div>
                ) : (
                  <>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--v2-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--v2-text-variant)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add_photo_alternate</span>
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--v2-primary)', margin: 0 }}>Add Media</p>
                      <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)', margin: 0 }}>Images, Video, or Audio</p>
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
                  style={{ border: '1px dashed var(--v2-outline)', borderRadius: '8px', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '12px', background: 'var(--v2-surface-low)', cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden', minHeight: '140px' }}
                >
                  <input type="file" ref={thumbnailInputRef} accept="image/*" style={{ display: 'none' }} onChange={e => setThumbnailFile(e.target.files?.[0] || null)} />
                  
                  {(thumbnailPreviewUrl || currentThumbnailUrl) ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <img src={thumbnailPreviewUrl || currentThumbnailUrl || ''} alt="Thumbnail" style={{ maxHeight: '100px', borderRadius: '8px', maxWidth: '100%', objectFit: 'contain' }} />
                      <span style={{ fontSize: '12px', marginTop: '8px', color: 'var(--v2-primary)', fontWeight: 600 }}>Change thumbnail</span>
                    </div>
                  ) : (
                    <>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--v2-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--v2-text-variant)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>image</span>
                      </div>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--v2-primary)', margin: 0 }}>Custom Cover (Optional)</p>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)', margin: 0 }}>Auto-generated if empty</p>
                      </div>
                    </>
                  )}
                </div>
              )}
              </div>
            ) : (
              <div style={{ marginTop: '16px', padding: '24px', background: 'var(--v2-surface-low)', borderRadius: '8px', border: '1px dashed var(--v2-outline)' }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: 600, fontSize: '14px', color: 'var(--v2-primary)' }}>Video Link</p>
                <input type="url" placeholder="Paste video link..." value={embedUrlInput} onChange={e => setEmbedUrlInput(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--v2-outline)', background: 'var(--v2-surface-lowest)', color: 'var(--v2-primary)', outline: 'none' }} />
                <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: 'var(--v2-text-variant)' }}>Supports YouTube</p>
              </div>
            )}

            {/* Settings Area */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '16px' }}>
              
              {/* Visibility Settings */}
              <div style={{ background: 'var(--v2-surface-bright)', border: '1px solid var(--v2-outline)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--v2-text-variant)', fontSize: '18px' }}>visibility</span>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--v2-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Visibility</h3>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', border: `1px solid ${isPublic ? 'var(--v2-primary)' : 'var(--v2-outline)'}`, borderRadius: '6px', cursor: 'pointer', background: isPublic ? 'white' : 'transparent', transition: 'all 0.2s' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--v2-primary)' }}>All Subscribers</span>
                  </div>
                  <input type="radio" checked={isPublic} onChange={() => setIsPublic(true)} style={{ width: '14px', height: '14px', accentColor: 'var(--v2-primary)' }} />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', border: `1px solid ${!isPublic ? 'var(--v2-primary)' : 'var(--v2-outline)'}`, borderRadius: '6px', cursor: tiers.length > 0 ? 'pointer' : 'not-allowed', background: !isPublic ? 'white' : 'transparent', opacity: tiers.length > 0 ? 1 : 0.5, transition: 'all 0.2s' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--v2-primary)' }}>Specific Tiers</span>
                  </div>
                  <input type="radio" checked={!isPublic} onChange={() => setIsPublic(false)} disabled={tiers.length === 0} style={{ width: '14px', height: '14px', accentColor: 'var(--v2-primary)' }} />
                </label>

                {!isPublic && tiers.length > 0 && (
                  <div style={{ marginTop: '4px', paddingLeft: '12px', borderLeft: '2px solid var(--v2-outline)' }}>
                    <select value={minPrice} onChange={e => setMinPrice(Number(e.target.value))} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--v2-outline)', background: 'white', fontSize: '13px', outline: 'none' }}>
                      {tiers.map((t: any) => <option key={t.id} value={t.amount}>{t.name} — ₦{(t.amount / 100).toLocaleString()}/mo</option>)}
                    </select>
                  </div>
                )}
              </div>
              
              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '12px', paddingBottom: '4px' }}>
                 <button 
                  type="submit" 
                  disabled={isSubmitting || !title}
                  style={{
                    background: 'var(--v2-primary)',
                    color: 'var(--v2-on-primary)',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    fontWeight: 600,
                    fontSize: '14px',
                    border: 'none',
                    cursor: (isSubmitting || !title) ? 'not-allowed' : 'pointer',
                    opacity: (isSubmitting || !title) ? 0.5 : 1,
                    transition: 'opacity 0.2s',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {isSubmitting ? (editId ? 'Updating...' : 'Publishing...') : (editId ? 'Update Post' : 'Publish Post')}
                  {!isSubmitting && <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span>}
                </button>
                
                <button 
                  type="button"
                  onClick={() => {
                    setIsExpanded(false);
                    if (onCancel) onCancel();
                  }}
                  style={{
                    background: 'transparent',
                    color: 'var(--v2-text-variant)',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    fontWeight: 600,
                    fontSize: '14px',
                    border: '1px solid var(--v2-outline)',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  Cancel
                </button>
              </div>

            </div>
          </div>
        )}
      </form>
    </div>
  );
}
