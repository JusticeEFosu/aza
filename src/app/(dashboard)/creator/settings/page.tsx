'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { slugify } from '@/lib/utils';
import AvatarUpload from '@/components/ui/AvatarUpload';
import Link from 'next/link';

export default function CreatorSettings() {
  const [activeTab, setActiveTab] = useState<'profile' | 'tiers' | 'payouts' | 'account'>('payouts');
  
  const [loading, setLoading] = useState(false);
  const [initialFetchLoading, setInitialFetchLoading] = useState(true);
  
  // Profile State
  const [bio, setBio] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [slug, setSlug] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [userId, setUserId] = useState('');
  
  // Payout State
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [availableBanks, setAvailableBanks] = useState<any[]>([]);
  const [banksLoading, setBanksLoading] = useState(true);
  
  // Real-time verification state
  const [resolvingBank, setResolvingBank] = useState(false);
  const [resolvedName, setResolvedName] = useState('');
  const [resolveError, setResolveError] = useState('');

  // Overall persisted state
  const [isVerified, setIsVerified] = useState(false);
  const [persistedBankName, setPersistedBankName] = useState('');
  
  const [msg, setMsg] = useState({ text: '', type: '' });
  const supabase = createClient();

  useEffect(() => {
    async function loadInitialData() {
      const { data: { user } } = await supabase.auth.getUser();
      
      const banksPromise = fetch('/api/banks').then(res => res.json());
      const profilePromise = user ? Promise.all([
        supabase.from('profiles').select('avatar_url, display_name, full_name').eq('id', user.id).single(),
        supabase.from('creator_profiles').select('*').eq('id', user.id).single()
      ]) : Promise.resolve([null, null]);

      try {
        const [banksData, [profileRes, creatorRes]] = await Promise.all([
          banksPromise,
          profilePromise
        ]);

        if (Array.isArray(banksData)) {
          setAvailableBanks(banksData);
        }

        let fallbackName = '';
        if (user && profileRes?.data) {
          setAvatarUrl(profileRes.data.avatar_url || '');
          fallbackName = profileRes.data.display_name || profileRes.data.full_name || 'Creator';
        }

        if (user && creatorRes?.data) {
          setBio(creatorRes.data.bio || '');
          setDisplayName(creatorRes.data.display_name || fallbackName);
          setSlug(creatorRes.data.slug || '');
          setIsVerified(creatorRes.data.is_verified);
          setBankCode(creatorRes.data.bank_code || '');
          setAccountNumber(creatorRes.data.bank_account_number || '');
          setPersistedBankName(creatorRes.data.bank_account_name || '');
          setUserId(user.id);
        }
      } catch (err) {
        console.error('Error loading settings data:', err);
      } finally {
        setInitialFetchLoading(false);
        setBanksLoading(false);
      }
    }
    loadInitialData();
  }, [supabase]);

  useEffect(() => {
    const resolveAccount = async () => {
      if (isVerified || accountNumber.length !== 10 || !bankCode) {
        setResolvedName('');
        setResolveError('');
        return;
      }

      setResolvingBank(true);
      setResolveError('');
      setResolvedName('');

      try {
        const res = await fetch('/api/banks/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bankCode, accountNumber })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setResolvedName(data.account_name);
      } catch (err: any) {
        setResolveError(err.message || 'Could not verify account. Please try again.');
      } finally {
        setResolvingBank(false);
      }
    };

    const timeoutId = setTimeout(() => resolveAccount(), 500);
    return () => clearTimeout(timeoutId);
  }, [accountNumber, bankCode, isVerified]);


  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: '', type: '' });

    try {
      const res = await fetch('/api/creators/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bio,
          displayName,
          bankCode: isVerified ? undefined : bankCode, 
          accountNumber: isVerified ? undefined : accountNumber
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMsg({ text: 'Settings saved successfully!', type: 'success' });
      if (data.slug) setSlug(data.slug);
      if (bankCode && accountNumber) {
        setIsVerified(true);
        setPersistedBankName(resolvedName);
      }
    } catch (err: any) {
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  if (initialFetchLoading) {
    return (
      <div className="v2-dashboard-layout" style={{ justifyContent: 'center', alignItems: 'center' }}>
         <span className="spinner" style={{ width: '32px', height: '32px', color: 'var(--v2-primary)', borderColor: 'rgba(0,0,0,0.1)', borderTopColor: 'currentColor' }} />
      </div>
    );
  }

  return (
    <div className="v2-dashboard-layout">
      {/* Sidebar (Desktop) */}
      <nav className="v2-sidebar">
        <div className="v2-sidebar-header">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="v2-sidebar-avatar" />
          ) : (
            <div className="v2-sidebar-avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
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
          <Link href="/creator" className="v2-nav-item">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
            Home
          </Link>
          <Link href="/creator/tiers" className="v2-nav-item">
            <span className="material-symbols-outlined">group</span>
            Subscriptions
          </Link>
          <Link href="#" className="v2-nav-item">
            <span className="material-symbols-outlined">mail</span>
            Messages
          </Link>
          <Link href="/creator/payouts" className="v2-nav-item">
            <span className="material-symbols-outlined">payments</span>
            Earnings
          </Link>
          <Link href="/creator/settings" className="v2-nav-item active">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>settings</span>
            Settings
          </Link>
        </div>

        <div className="v2-sidebar-footer">
          <Link href="#" className="v2-nav-item">
            <span className="material-symbols-outlined">help</span>
            Help
          </Link>
          <form action="/api/auth/signout" method="POST" style={{ display: 'inline' }}>
            <button 
              type="submit" 
              className="v2-nav-item" 
              style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', font: 'inherit', color: 'inherit' }}
            >
              <span className="material-symbols-outlined">logout</span>
              Sign Out
            </button>
          </form>
        </div>
      </nav>

      <main className="v2-main-content" style={{ maxWidth: '1200px' }}>
        <header style={{ marginBottom: '32px' }}>
          <h1 className="v2-dash-title">Settings</h1>
          <p className="v2-dash-desc">Manage your creator profile, subscription tiers, and payouts.</p>
        </header>

        {/* Tab Navigation */}
        <div style={{ borderBottom: '1px solid var(--v2-outline)', marginBottom: '32px' }}>
          <nav style={{ display: 'flex', gap: '24px' }}>
            {['profile', 'tiers', 'payouts', 'account'].map((tab) => (
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

        {msg.text && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '24px',
            background: msg.type === 'error' ? '#fef2f2' : '#ecfdf5',
            color: msg.type === 'error' ? '#991b1b' : '#065f46',
            border: `1px solid ${msg.type === 'error' ? '#fecaca' : '#a7f3d0'}`
          }}>
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSave}>
          
          {/* PROFILE TAB */}
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

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Creator / Display Name (Optional)</label>
                <input
                  type="text"
                  placeholder="E.g. Chef Boma"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--v2-outline)', background: 'var(--v2-surface)', fontSize: '16px' }}
                />
                
                {displayName && (
                  <div style={{ marginTop: '16px', padding: '16px', background: 'var(--v2-surface-low)', borderRadius: '8px', border: '1px solid var(--v2-outline)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--v2-text-variant)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Your Profile URL</div>
                    <div style={{ fontSize: '16px', color: 'var(--v2-primary)', fontWeight: 600 }}>
                      aza-chi.vercel.app/c/<span style={{ textDecoration: 'underline' }}>{slugify(displayName)}</span>
                    </div>
                    {slugify(displayName) !== slug && slug && (
                      <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '8px', fontWeight: 500 }}>
                        ⚠️ Changing this will break your current link!
                      </div>
                    )}
                  </div>
                )}
                <span style={{ display: 'block', marginTop: '8px', fontSize: '12px', color: 'var(--v2-text-variant)' }}>Fans will see this name instead of your legal name if provided.</span>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Bio / Description</label>
                <textarea
                  rows={4}
                  placeholder="Tell fans what you create..."
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--v2-outline)', background: 'var(--v2-surface)', fontSize: '16px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--v2-outline)', paddingTop: '24px' }}>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="v2-sub-btn v2-sub-btn-primary" 
                  style={{ padding: '12px 32px', width: 'auto' }}
                >
                  {loading ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </div>
          )}

          {/* PAYOUTS TAB */}
          {activeTab === 'payouts' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '24px' }} className="md:grid-cols-3">
                
                {/* Left Column: Status */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="md:col-span-1">
                  
                  {/* Paystack Connection Status */}
                  <div style={{ background: 'var(--v2-surface-lowest)', border: '1px solid var(--v2-outline)', borderRadius: '12px', padding: '16px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <div style={{ width: '48px', height: '48px', background: 'var(--v2-surface-low)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--v2-primary)' }}>account_balance_wallet</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 700 }}>Paystack</h3>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: isVerified ? 'var(--v2-green)' : 'var(--v2-text-variant)' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isVerified ? 'var(--v2-green)' : 'var(--v2-text-variant)' }}></span>
                          {isVerified ? 'Connected' : 'Not Setup'}
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--v2-text-variant)', marginBottom: '12px' }}>Receiving payouts directly to your bank account.</p>
                      {isVerified && (
                        <button type="button" onClick={() => setIsVerified(false)} style={{ fontSize: '12px', fontWeight: 700, background: 'none', border: 'none', color: 'var(--v2-primary)', cursor: 'pointer', padding: 0 }}>
                          Update connection
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Info Card */}
                  <div style={{ background: 'var(--v2-surface-low)', border: '1px solid var(--v2-outline)', borderRadius: '12px', padding: '16px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>info</span>
                      Payout Schedule
                    </h3>
                    <p style={{ fontSize: '14px', color: 'var(--v2-text-variant)', lineHeight: 1.5 }}>
                      Payouts are processed automatically every Friday for earnings accrued up to the previous Wednesday.
                    </p>
                  </div>
                </div>

                {/* Right Column: Settings Form */}
                <div style={{ background: 'var(--v2-surface-lowest)', border: '1px solid var(--v2-outline)', borderRadius: '12px', padding: '24px' }} className="md:col-span-2">
                  <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>Payout Preferences</h2>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {isVerified ? (
                      <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '16px' }}>
                        <div style={{ fontWeight: 600, color: '#064e3b', marginBottom: '8px', fontSize: '16px' }}>
                          ✅ Verified as: {persistedBankName.toUpperCase() || 'YOUR ACCOUNT'}
                        </div>
                        <div style={{ color: '#065f46', fontSize: '14px' }}>
                          Account: {accountNumber.substring(0, 4)}•••••• ({availableBanks.find(b => b.code === bankCode)?.name || bankCode})
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: 'var(--v2-primary)', marginBottom: '4px' }}>Select Bank</label>
                          <select 
                            value={bankCode}
                            onChange={e => setBankCode(e.target.value)}
                            disabled={banksLoading}
                            required
                            style={{ width: '100%', background: 'var(--v2-surface-lowest)', border: '1px solid var(--v2-outline)', borderRadius: '6px', padding: '8px 12px', fontSize: '16px' }}
                          >
                            <option value="" disabled>{banksLoading ? 'Loading banks...' : 'Select your bank...'}</option>
                            {availableBanks.map(b => (
                              <option key={b.code} value={b.code}>{b.name}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: 'var(--v2-primary)', marginBottom: '4px' }}>Account Number</label>
                          <input
                            type="text"
                            placeholder="0123456789"
                            value={accountNumber}
                            onChange={e => setAccountNumber(e.target.value)}
                            maxLength={10}
                            required
                            style={{ width: '100%', background: 'var(--v2-surface-lowest)', border: '1px solid var(--v2-outline)', borderRadius: '6px', padding: '8px 12px', fontSize: '16px' }}
                          />
                        </div>

                        {/* Real-time Validation Feedback UI */}
                        <div style={{ minHeight: '32px' }}>
                          {resolvingBank && (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--v2-text-variant)', fontSize: '14px' }}>
                              <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
                              Resolving account name...
                            </div>
                          )}
                          
                          {resolveError && !resolvingBank && (
                            <div style={{ color: '#dc2626', fontSize: '14px' }}>
                              {resolveError}
                            </div>
                          )}

                          {resolvedName && !resolvingBank && (
                            <div style={{ color: '#059669', fontWeight: 500, fontSize: '15px', background: '#ecfdf5', padding: '12px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                              ✅ Account Name: {resolvedName}
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    <div style={{ borderTop: '1px solid var(--v2-outline)', margin: '8px 0' }}></div>
                    
                    {/* Mockup Setting: Email Notifications */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Email Notifications</h4>
                        <p style={{ fontSize: '12px', color: 'var(--v2-text-variant)', margin: 0 }}>Receive an email summary when a payout is initiated.</p>
                      </div>
                      <div style={{ width: '44px', height: '24px', background: 'var(--v2-primary)', borderRadius: '999px', position: 'relative', cursor: 'pointer' }}>
                        <div style={{ width: '20px', height: '20px', background: 'white', borderRadius: '50%', position: 'absolute', top: '2px', right: '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}></div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--v2-outline)', paddingTop: '24px', marginTop: '8px' }}>
                      <button type="button" onClick={() => window.location.reload()} style={{ padding: '8px 16px', background: 'var(--v2-surface-lowest)', border: '1px solid var(--v2-outline)', color: 'var(--v2-primary)', fontWeight: 600, fontSize: '14px', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                      <button 
                        type="submit" 
                        disabled={loading || (!isVerified && !resolvedName)}
                        style={{ padding: '8px 24px', background: 'var(--v2-primary)', color: 'white', fontWeight: 600, fontSize: '14px', borderRadius: '8px', border: 'none', cursor: 'pointer', opacity: (loading || (!isVerified && !resolvedName)) ? 0.5 : 1 }}
                      >
                        {loading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>

                  </div>
                </div>

              </div>
            </div>
          )}

          {/* OTHER TABS */}
          {['tiers', 'account'].includes(activeTab) && (
            <div style={{ textAlign: 'center', padding: '64px', background: 'var(--v2-surface-lowest)', border: '1px solid var(--v2-outline)', borderRadius: '12px', color: 'var(--v2-text-variant)' }}>
              This section is coming soon.
            </div>
          )}

        </form>
      </main>
      
      {/* Bottom Nav (Mobile) */}
      <nav className="v2-bottom-nav">
        <Link href="/creator" className="v2-bottom-nav-item">
          <span className="material-symbols-outlined v2-bottom-nav-icon" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
          <span className="v2-bottom-nav-label">Home</span>
        </Link>
        <Link href="/creator/tiers" className="v2-bottom-nav-item">
          <span className="material-symbols-outlined v2-bottom-nav-icon">group</span>
          <span className="v2-bottom-nav-label">Subs</span>
        </Link>
        
        <Link href="/creator/posts" className="v2-bottom-fab">
          <span className="material-symbols-outlined">add</span>
        </Link>
        
        <Link href="/creator/payouts" className="v2-bottom-nav-item">
          <span className="material-symbols-outlined v2-bottom-nav-icon">payments</span>
          <span className="v2-bottom-nav-label">Earnings</span>
        </Link>
        <Link href="/creator/settings" className="v2-bottom-nav-item active">
          <span className="material-symbols-outlined v2-bottom-nav-icon">settings</span>
          <span className="v2-bottom-nav-label">Settings</span>
        </Link>
      </nav>

    </div>
  );
}
