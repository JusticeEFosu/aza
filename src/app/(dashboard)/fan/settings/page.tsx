'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function FanSettings() {
  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, display_name')
        .eq('id', user.id)
        .single();

      if (data && !error) {
        setFullName(data.full_name || '');
        setDisplayName(data.display_name || '');
      }
      setLoading(false);
    }
    loadProfile();
  }, [router, supabase]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/fan/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          displayName
        })
      });

      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);

      setMessage({ type: 'success', text: 'Profile updated successfully.' });
      router.refresh();
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'An error occurred' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: '2rem' }}>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem', maxWidth: '600px' }}>
      
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/fan" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
          ← Back to Dashboard
        </Link>
        <h1 style={{ margin: 0 }}>Profile Settings</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Update your personal details below.
        </p>
      </div>

      <div className="glass-card">
        {message && (
          <div style={{ 
            padding: '1rem', 
            borderRadius: 'var(--radius-md)', 
            marginBottom: '1.5rem',
            background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
            border: `1px solid ${message.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="form-group">
            <label htmlFor="displayName" className="form-label">Display Name / Username</label>
            <input
              id="displayName"
              type="text"
              className="form-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. SuperFan99"
            />
            <span className="form-hint">This is how creators and other fans will see you on Aza.</span>
          </div>

          <div className="form-group">
            <label htmlFor="fullName" className="form-label">Full Name (Legal)</label>
            <input
              id="fullName"
              type="text"
              className="form-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your legal name"
              required
            />
            <span className="form-hint">Used for billing and platform records. Kept private.</span>
          </div>

          <div style={{ paddingTop: '1rem', marginTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={saving}
              style={{ minWidth: '120px', justifyContent: 'center' }}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
