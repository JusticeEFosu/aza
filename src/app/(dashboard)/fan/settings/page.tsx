'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import AvatarUpload from '@/components/ui/AvatarUpload';
import Link from 'next/link';
import MobileNav from '@/components/MobileNav';

export default function FanSettings() {
  const [activeTab, setActiveTab] = useState<'profile' | 'account'>('profile');
  
  const [userId, setUserId] = useState('');
  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  
  const [accountEmail, setAccountEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);
      setAccountEmail(user.email || '');

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, display_name, avatar_url')
        .eq('id', user.id)
        .single();

      if (data && !error) {
        setFullName(data.full_name || '');
        setDisplayName(data.display_name || '');
        setAvatarUrl(data.avatar_url || '');
      }
      setLoading(false);
    }
    loadData();
  }, [router, supabase]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/fan/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, displayName })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage({ type: 'success', text: 'Profile updated successfully.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'An error occurred' });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateAccount(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const updates: any = {};
      if (accountEmail) updates.email = accountEmail;
      if (newPassword) updates.password = newPassword;
      
      if (Object.keys(updates).length === 0) {
        setSaving(false);
        return;
      }

      const { data, error } = await supabase.auth.updateUser(updates);
      if (error) throw error;
      
      if (updates.email) {
        setMessage({ type: 'success', text: 'Check your new email inbox to confirm the change!' });
      } else {
        setMessage({ type: 'success', text: 'Password updated successfully!' });
        setNewPassword('');
      }
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (!confirm('Are you absolutely sure you want to permanently delete your account? This action cannot be undone and you will lose all subscriptions.')) {
      return;
    }
    try {
      const res = await fetch('/api/auth/delete-account', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = '/login';
    } catch (err: any) {
      alert('Failed to delete account: ' + err.message);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
         <span className="spinner" style={{ width: '32px', height: '32px', color: 'var(--v2-primary)', borderColor: 'rgba(0,0,0,0.1)', borderTopColor: 'currentColor' }} />
      </div>
    );
  }

  return (
    <main className="v2-fan-main">
        <div className="v2-fan-container">
          <header style={{ marginBottom: '32px' }}>
            <h1 className="v2-dash-title">Settings</h1>
            <p className="v2-dash-desc">Manage your fan profile and account details.</p>
          </header>

          <div style={{ borderBottom: '1px solid var(--v2-outline)', marginBottom: '32px' }}>
            <nav style={{ display: 'flex', gap: '24px' }}>
              {['profile', 'account'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  style={{
                    padding: '16px 4px',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === tab ? '2px solid var(--v2-primary)' : '2px solid transparent',
                    color: activeTab === tab ? 'var(--v2-primary)' : 'var(--v2-text-variant)',
                    fontWeight: activeTab === tab ? 700 : 500,
                    fontSize: '14px',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    transition: 'all 0.2s'
                  }}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          {message && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '24px',
              background: message.type === 'error' ? '#fef2f2' : '#ecfdf5',
              color: message.type === 'error' ? '#991b1b' : '#065f46',
              border: `1px solid ${message.type === 'error' ? '#fecaca' : '#a7f3d0'}`,
              maxWidth: '800px'
            }}>
              {message.text}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="v2-sub-card" style={{ maxWidth: '800px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>Public Profile</h2>
              
              <div style={{ marginBottom: '24px' }}>
                <AvatarUpload 
                  currentUrl={avatarUrl} 
                  userId={userId} 
                  onUploadComplete={(url) => setAvatarUrl(url)} 
                />
              </div>

              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Display Name / Username</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="e.g. SuperFan99"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--v2-outline)', background: 'var(--v2-surface)', fontSize: '16px' }}
                  />
                  <span style={{ display: 'block', marginTop: '8px', fontSize: '12px', color: 'var(--v2-text-variant)' }}>This is how creators and other fans will see you on MyAzaa.</span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Full Name (Legal)</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Your legal name"
                    required
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--v2-outline)', background: 'var(--v2-surface)', fontSize: '16px' }}
                  />
                  <span style={{ display: 'block', marginTop: '8px', fontSize: '12px', color: 'var(--v2-text-variant)' }}>Used for billing and platform records. Kept private.</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--v2-outline)', paddingTop: '24px' }}>
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="v2-sub-btn v2-sub-btn-primary" 
                    style={{ padding: '12px 32px', width: 'auto' }}
                  >
                    {saving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="v2-sub-card" style={{ maxWidth: '800px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>Account Settings</h2>

              <form onSubmit={handleUpdateAccount} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Email Address</label>
                  <input
                    type="email"
                    value={accountEmail}
                    onChange={e => setAccountEmail(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--v2-outline)', background: 'var(--v2-surface)', fontSize: '16px' }}
                  />
                  <span style={{ display: 'block', marginTop: '8px', fontSize: '12px', color: 'var(--v2-text-variant)' }}>We will send a confirmation link to your new email if you change this.</span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>New Password</label>
                  <input
                    type="password"
                    placeholder="Leave blank to keep current password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--v2-outline)', background: 'var(--v2-surface)', fontSize: '16px' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--v2-outline)', paddingTop: '24px' }}>
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="v2-sub-btn v2-sub-btn-primary" 
                    style={{ padding: '12px 32px', width: 'auto' }}
                  >
                    {saving ? 'Saving...' : 'Update Account'}
                  </button>
                </div>
              </form>

              {/* Danger Zone */}
              <div style={{ marginTop: '48px', borderTop: '1px solid #fecaca', paddingTop: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#dc2626', marginBottom: '8px' }}>Danger Zone</h3>
                <p style={{ fontSize: '14px', color: 'var(--v2-text-variant)', marginBottom: '16px' }}>Permanently delete your account and all associated data. This action cannot be undone.</p>
                <button 
                  type="button" 
                  onClick={handleDeleteAccount} 
                  className="v2-sub-btn" 
                  style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '12px 24px', fontWeight: 600 }}
                >
                  Delete Account
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
  );
}
