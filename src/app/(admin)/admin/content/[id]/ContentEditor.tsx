'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ContentEditor({ initialData }: { initialData: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    id: initialData?.id || 'new',
    title: initialData?.title || '',
    slug: initialData?.slug || '',
    content: initialData?.content || '',
    is_published: initialData?.is_published || false
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      router.push('/admin/content');
      router.refresh();
    } catch (err: any) {
      alert(err.message);
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (formData.id === 'new') return;
    if (!confirm('Are you sure you want to delete this page? This action cannot be undone.')) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/admin/content', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: formData.id })
      });
      if (!res.ok) throw new Error('Failed to delete');
      
      router.push('/admin/content');
      router.refresh();
    } catch (err: any) {
      alert(err.message);
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--v2-primary)', marginBottom: '8px', letterSpacing: '-0.02em' }}>
            {formData.id === 'new' ? 'Create New Page' : 'Edit Page'}
          </h1>
          <p style={{ color: 'var(--v2-text-variant)', fontSize: '16px' }}>Use Markdown to format your content.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {formData.id !== 'new' && (
            <button onClick={handleDelete} disabled={loading} className="v2-btn v2-btn-secondary" style={{ color: '#dc2626', borderColor: '#dc2626' }}>
              Delete
            </button>
          )}
          <button onClick={() => router.push('/admin/content')} disabled={loading} className="v2-btn v2-btn-secondary">
            Cancel
          </button>
          <button onClick={handleSave} disabled={loading} className="v2-btn v2-btn-primary">
            {loading ? 'Saving...' : 'Save Page'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--v2-primary)', marginBottom: '8px' }}>Page Title</label>
            <input 
              type="text" 
              className="v2-input" 
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="e.g., Terms of Service"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--v2-outline)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--v2-primary)', marginBottom: '8px' }}>Content (Markdown Supported)</label>
            <textarea 
              className="v2-input" 
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              placeholder="# Heading 1\n\nYour paragraph here...\n\n- Bullet 1\n- Bullet 2"
              style={{ width: '100%', height: '500px', padding: '12px', borderRadius: '8px', border: '1px solid var(--v2-outline)', fontFamily: 'monospace', resize: 'vertical' }}
            />
          </div>
        </div>

        <div>
          <div style={{ background: 'var(--v2-surface)', border: '1px solid var(--v2-outline)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--v2-primary)', margin: 0 }}>Page Settings</h3>
            
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--v2-primary)', marginBottom: '8px' }}>URL Slug</label>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ padding: '12px', background: 'var(--v2-surface-lowest)', border: '1px solid var(--v2-outline)', borderRight: 'none', borderRadius: '8px 0 0 8px', color: 'var(--v2-text-variant)', fontSize: '14px' }}>
                  /legal/
                </span>
                <input 
                  type="text" 
                  className="v2-input" 
                  value={formData.slug}
                  onChange={(e) => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                  placeholder="terms-of-service"
                  style={{ flex: 1, padding: '12px', borderRadius: '0 8px 8px 0', border: '1px solid var(--v2-outline)' }}
                />
              </div>
              <p style={{ fontSize: '12px', color: 'var(--v2-text-variant)', marginTop: '8px' }}>This will be the URL of your page. Only lowercase letters, numbers, and hyphens.</p>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={formData.is_published}
                  onChange={(e) => setFormData({...formData, is_published: e.target.checked})}
                  style={{ width: '20px', height: '20px', accentColor: 'var(--v2-primary)' }}
                />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--v2-primary)' }}>Publish Page</div>
                  <div style={{ fontSize: '12px', color: 'var(--v2-text-variant)' }}>Make this page visible to the public.</div>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
