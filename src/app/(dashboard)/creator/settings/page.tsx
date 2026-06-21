'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { slugify } from '@/lib/utils';
import AvatarUpload from '@/components/ui/AvatarUpload';

// Banks will be fetched dynamically from Paystack

export default function CreatorSettings() {
  const [loading, setLoading] = useState(false);
  const [initialFetchLoading, setInitialFetchLoading] = useState(true);
  const [bio, setBio] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [slug, setSlug] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [userId, setUserId] = useState('');
  
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
      
      // Fetch banks and profile in parallel
      const banksPromise = fetch('/api/banks').then(res => res.json());
      const profilePromise = user ? Promise.all([
        supabase.from('profiles').select('avatar_url').eq('id', user.id).single(),
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

        if (user && profileRes?.data) {
          setAvatarUrl(profileRes.data.avatar_url || '');
        }

        if (user && creatorRes?.data) {
          setBio(creatorRes.data.bio || '');
          setDisplayName(creatorRes.data.display_name || '');
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
  }, []);

  // Real-time resolution effect
  useEffect(() => {
    const resolveAccount = async () => {
      // Don't auto-resolve if it's already verified in the DB to avoid unnecessary calls
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

    // Call it with a tiny 500ms delay to prevent jitter if pasting
    const timeoutId = setTimeout(() => {
      resolveAccount();
    }, 500);

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

  if (initialFetchLoading) return <div className="container" style={{paddingTop: '2rem'}}>Loading profile...</div>;

  return (
    <div className="container" style={{ maxWidth: '600px', paddingTop: '2rem', paddingBottom: '4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Creator Settings</h2>
        <a href="/creator" className="btn btn-secondary btn-sm">Back to Dashboard</a>
      </div>

      <div className="glass-card">
        {msg.text && (
          <div className={`alert alert-${msg.type}`} style={{ marginBottom: '1.5rem' }}>
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSave} className="form-group" style={{ gap: '1.5rem' }}>
          
          <AvatarUpload 
            currentUrl={avatarUrl} 
            userId={userId} 
            onUploadComplete={(url) => setAvatarUrl(url)} 
          />
          
          <div className="form-group">
            <label className="form-label">Creator / Display Name (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="E.g. Chef Boma"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
            />
            {displayName && (
              <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Your Profile URL</div>
                <div style={{ fontSize: '0.938rem', color: 'var(--accent-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  aza-chi.vercel.app/c/<span style={{ textDecoration: 'underline' }}>{slugify(displayName)}</span>
                </div>
                {slugify(displayName) !== slug && slug && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    ⚠️ Changing this will break your current link!
                  </div>
                )}
              </div>
            )}
            <span className="form-hint">Fans will see this name instead of your legal name if provided.</span>
          </div>

          <div className="form-group">
            <label className="form-label">Bio / Description</label>
            <textarea
              className="form-input"
              rows={4}
              placeholder="Tell fans what you create..."
              value={bio}
              onChange={e => setBio(e.target.value)}
            />
          </div>

          <hr style={{ borderColor: 'var(--border-color)', margin: '1rem 0' }} />
          
          <div>
            <h3 style={{ marginBottom: '0.5rem' }}>Payout Details</h3>
            <p className="form-hint" style={{ marginBottom: '1rem' }}>
              Where should we send your earnings? Enter your Naira account details.
            </p>
          </div>

          {isVerified ? (
            <div className="alert alert-success" style={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }}>
              <div style={{ fontWeight: 600, color: '#064e3b', marginBottom: '0.5rem', fontSize: '1rem' }}>
                ✅ Verified as: {persistedBankName.toUpperCase() || 'YOUR ACCOUNT'}
              </div>
              <div style={{ color: '#065f46', fontSize: '0.875rem' }}>
                Account: {accountNumber.substring(0, 4)}•••••• ({availableBanks.find(b => b.code === bankCode)?.name || bankCode})
              </div>
              <div style={{ marginTop: '0.75rem', fontSize: '0.813rem', color: '#047857' }}>
                <em>To update your payout account, please contact support.</em>
              </div>
            </div>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">Select Bank</label>
                <select 
                  className="form-select"
                  value={bankCode}
                  onChange={e => setBankCode(e.target.value)}
                  disabled={banksLoading}
                  required
                >
                  <option value="" disabled>{banksLoading ? 'Loading banks...' : 'Select your bank...'}</option>
                  {availableBanks.map(b => (
                    <option key={b.code} value={b.code}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Account Number</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="0123456789"
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value)}
                  maxLength={10}
                  required
                />
              </div>

              {/* Real-time Validation Feedback UI */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem', minHeight: '32px' }}>
                {resolvingBank && (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
                    Resolving account name...
                  </div>
                )}
                
                {resolveError && !resolvingBank && (
                  <div className="form-error">
                    {resolveError}
                  </div>
                )}

                {resolvedName && !resolvingBank && (
                  <div style={{ color: 'var(--success)', fontWeight: 500, fontSize: '0.938rem', background: '#ecfdf5', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid #a7f3d0' }}>
                    ✅ Account Name: {resolvedName}
                  </div>
                )}
              </div>
            </>
          )}

          <button 
            type="submit" 
            className="btn btn-primary btn-lg" 
            // Disable if it's not verified in DB, and hasn't been locally resolved yet
            disabled={loading || (isVerified && bio.length === 0) || (!isVerified && !resolvedName)}
            style={{ marginTop: '1rem' }}
          >
            {loading ? <span className="spinner" /> : 'Save & Verify Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}
