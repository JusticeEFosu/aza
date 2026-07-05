'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { slugify } from '@/lib/utils';
import AvatarUpload from '@/components/ui/AvatarUpload';
import Link from 'next/link';
import MobileNav from '@/components/MobileNav';
import ConfirmModal from '@/components/ConfirmModal';
import { useRouter } from 'next/navigation';

export default function CreatorSettings() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'profile' | 'tiers' | 'payouts' | 'account'>('profile');
  
  const [loading, setLoading] = useState(false);
  const [initialFetchLoading, setInitialFetchLoading] = useState(true);
  
  // Profile State
  const [bio, setBio] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [slug, setSlug] = useState('');
  const [socialLinks, setSocialLinks] = useState<any>({ x: '', instagram: '', youtube: '' });
  const [avatarUrl, setAvatarUrl] = useState('');
  const [userId, setUserId] = useState('');
  const [checkingName, setCheckingName] = useState(false);
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);
  const [originalDisplayName, setOriginalDisplayName] = useState('');

  // Account State
  const [accountEmail, setAccountEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountMsg, setAccountMsg] = useState({ text: '', type: '' });
  
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
  
  // Tier State
  const [tiersList, setTiersList] = useState<any[]>([]);
  const [tierName, setTierName] = useState('');
  const [tierAmountNaira, setTierAmountNaira] = useState('');
  const [tierDescription, setTierDescription] = useState('');
  const [tierPerksText, setTierPerksText] = useState('');
  const [tierSaving, setTierSaving] = useState(false);
  const [tierMsg, setTierMsg] = useState({ text: '', type: '' });
  const [showTierForm, setShowTierForm] = useState(false);
  const [editingTierId, setEditingTierId] = useState<string | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isDestructive: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    isDestructive: false,
    onConfirm: () => {},
  });

  const [msg, setMsg] = useState({ text: '', type: '' });
  const supabase = createClient();

  async function fetchTiers() {
    const res = await fetch('/api/tiers');
    const data = await res.json();
    if (data.data) setTiersList(data.data);
  }

  const openEditModal = (tier: any) => {
    setEditingTierId(tier.id);
    setTierName(tier.name);
    setTierAmountNaira((tier.amount / 100).toString());
    setTierDescription(tier.description || '');
    setTierPerksText(tier.perks ? tier.perks.join('\n') : '');
    setTierMsg({ text: '', type: '' });
    setShowTierForm(true);
  };

  const closeTierModal = () => {
    setShowTierForm(false);
    setEditingTierId(null);
    setTierName('');
    setTierAmountNaira('');
    setTierDescription('');
    setTierPerksText('');
    setTierMsg({ text: '', type: '' });
  };

  async function handleSaveTier(e: React.FormEvent) {
    e.preventDefault();
    setTierSaving(true);
    setTierMsg({ text: '', type: '' });
    try {
      const amountKobo = Math.round(parseFloat(tierAmountNaira) * 100);
      if (amountKobo < 100) throw new Error('Minimum tier amount is ₦1');
      const perksArray = tierPerksText.split('\n').map(p => p.trim()).filter(p => p.length > 0);
      
      const endpoint = editingTierId ? `/api/tiers/${editingTierId}` : '/api/tiers';
      const method = editingTierId ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tierName, amount: amountKobo, description: tierDescription, perks: perksArray })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      closeTierModal();
      fetchTiers();
    } catch (err: any) {
      setTierMsg({ text: err.message, type: 'error' });
    } finally {
      setTierSaving(false);
    }
  }

  async function handleArchiveTier(id: string) {
    setConfirmModal({
      isOpen: true,
      title: 'Archive Tier',
      message: 'Are you sure you want to archive this tier? It will no longer be available for new subscribers, but existing subscribers will continue to be billed.',
      isDestructive: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/tiers/${id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Failed to archive tier');
          fetchTiers();
        } catch (err: any) {
          alert(err.message);
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  }

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
          const uniqueBanks = banksData.filter((b, index, self) => 
            index === self.findIndex((t) => t.code === b.code)
          );
          setAvailableBanks(uniqueBanks);
        }

        let fallbackName = '';
        if (user && profileRes?.data) {
          setAvatarUrl(profileRes.data.avatar_url || '');
          fallbackName = profileRes.data.display_name || profileRes.data.full_name || 'Creator';
        }
        if (user) {
          setAccountEmail(user.email || '');
        }

        if (user && creatorRes?.data) {
          setBio(creatorRes.data.bio || '');
          const name = creatorRes.data.display_name || fallbackName;
          setDisplayName(name);
          setOriginalDisplayName(name);
          setSlug(creatorRes.data.slug || '');
          if (creatorRes.data.social_links) {
            // Migrate legacy twitter to x
            const legacyLinks = creatorRes.data.social_links;
            setSocialLinks({
              x: legacyLinks.x || legacyLinks.twitter || '',
              instagram: legacyLinks.instagram || '',
              youtube: legacyLinks.youtube || ''
            });
          }
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
    fetchTiers();
  }, [supabase]);

  useEffect(() => {
    if (displayName === originalDisplayName || !displayName) {
      setNameAvailable(null);
      setCheckingName(false);
      return;
    }
    
    if (displayName.length < 3) {
      setNameAvailable(null);
      return;
    }

    setCheckingName(true);
    setNameAvailable(null);

    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(`/api/check-name?name=${encodeURIComponent(displayName)}`);
        const data = await res.json();
        setNameAvailable(data.available);
      } catch (err) {
        setNameAvailable(null);
      } finally {
        setCheckingName(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [displayName, originalDisplayName]);

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
          slug: slug.toLowerCase().replace(/[^a-z0-9]/g, ''),
          socialLinks,
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
      router.refresh();
    } catch (err: any) {
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateAccount(e: React.FormEvent) {
    e.preventDefault();
    setAccountLoading(true);
    setAccountMsg({ text: '', type: '' });

    try {
      const updates: any = {};
      if (accountEmail) updates.email = accountEmail;
      if (newPassword) updates.password = newPassword;
      
      if (Object.keys(updates).length === 0) {
        setAccountLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.updateUser(updates);
      if (error) throw error;
      
      if (updates.email) {
        setAccountMsg({ text: 'Check your new email inbox to confirm the change!', type: 'success' });
      } else {
        setAccountMsg({ text: 'Password updated successfully!', type: 'success' });
        setNewPassword('');
      }
    } catch (err: any) {
      setAccountMsg({ text: err.message, type: 'error' });
    } finally {
      setAccountLoading(false);
    }
  }

  async function handleDeleteAccount() {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Account',
      message: 'Are you absolutely sure you want to permanently delete your account? This action cannot be undone and you will lose all data, posts, and subscriptions.',
      isDestructive: true,
      onConfirm: async () => {
        try {
          const res = await fetch('/api/auth/delete-account', { method: 'POST' });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          window.location.href = '/login';
        } catch (err: any) {
          alert('Failed to delete account: ' + err.message);
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  }

  if (initialFetchLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
         <span className="spinner" style={{ width: '32px', height: '32px', color: 'var(--v2-primary)', borderColor: 'rgba(0,0,0,0.1)', borderTopColor: 'currentColor' }} />
      </div>
    );
  }

  return (
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
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Creator / Display Name</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="text"
                    placeholder="E.g. Chef Boma"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    style={{ flex: 1, padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--v2-outline)', background: 'var(--v2-surface)', fontSize: '16px' }}
                  />
                  {checkingName && (
                    <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px', color: 'var(--v2-primary)', flexShrink: 0 }} />
                  )}
                  {!checkingName && nameAvailable === true && (
                    <span className="material-symbols-outlined" style={{ color: 'var(--v2-green)', fontSize: '24px', flexShrink: 0 }} title="Available">check_circle</span>
                  )}
                  {!checkingName && nameAvailable === false && (
                    <span className="material-symbols-outlined" style={{ color: '#dc2626', fontSize: '24px', flexShrink: 0 }} title="Taken">cancel</span>
                  )}
                </div>
                
                {displayName && (
                  <span style={{ display: 'block', marginTop: '8px', fontSize: '12px', color: 'var(--v2-text-variant)' }}>Fans will see this name instead of your legal name if provided.</span>
                )}
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Your Profile URL</label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--v2-outline)', borderRadius: '8px', overflow: 'hidden', background: 'var(--v2-surface)' }}>
                  <span style={{ padding: '12px 16px', background: 'var(--v2-surface-low)', color: 'var(--v2-text-variant)', borderRight: '1px solid var(--v2-outline)', fontSize: '16px' }}>
                    azaa.com/
                  </span>
                  <input 
                    type="text"
                    value={slug}
                    onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                    placeholder="chefboma"
                    style={{ flex: 1, padding: '12px 16px', border: 'none', background: 'transparent', fontSize: '16px', outline: 'none' }}
                  />
                </div>
                {slug && (
                  <div style={{ padding: '12px', background: '#fffbeb', color: '#b45309', borderRadius: '8px', border: '1px solid #fde68a', marginTop: '12px', fontSize: '13px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>warning</span>
                    <div>
                      <strong>Warning:</strong> Changing your URL will immediately break any existing links you have shared on social media!
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Bio / Description</label>
                <textarea
                  rows={4}
                  maxLength={250}
                  placeholder="Tell fans what you create..."
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--v2-outline)', background: 'var(--v2-surface)', fontSize: '16px', resize: 'vertical' }}
                />
                <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--v2-text-variant)', marginTop: '4px' }}>
                  {bio.length} / 250
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Social Links (Optional)</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--v2-outline)', borderRadius: '8px', overflow: 'hidden', background: 'var(--v2-surface)' }}>
                    <span style={{ width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--v2-outline)' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                    </span>
                    <input type="text" placeholder="https://x.com/yourhandle" value={socialLinks.x || ''} onChange={e => setSocialLinks({...socialLinks, x: e.target.value})} style={{ flex: 1, padding: '12px 16px', border: 'none', background: 'transparent', fontSize: '16px', outline: 'none' }} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--v2-outline)', borderRadius: '8px', overflow: 'hidden', background: 'var(--v2-surface)' }}>
                    <span style={{ width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--v2-outline)' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                    </span>
                    <input type="text" placeholder="https://instagram.com/yourhandle" value={socialLinks.instagram || ''} onChange={e => setSocialLinks({...socialLinks, instagram: e.target.value})} style={{ flex: 1, padding: '12px 16px', border: 'none', background: 'transparent', fontSize: '16px', outline: 'none' }} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--v2-outline)', borderRadius: '8px', overflow: 'hidden', background: 'var(--v2-surface)' }}>
                    <span style={{ width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--v2-outline)' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                    </span>
                    <input type="text" placeholder="https://youtube.com/@yourchannel" value={socialLinks.youtube || ''} onChange={e => setSocialLinks({...socialLinks, youtube: e.target.value})} style={{ flex: 1, padding: '12px 16px', border: 'none', background: 'transparent', fontSize: '16px', outline: 'none' }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--v2-outline)', paddingTop: '24px' }}>
                <button 
                  type="submit" 
                  disabled={loading || nameAvailable === false}
                  className="v2-sub-btn v2-sub-btn-primary" 
                  style={{ padding: '12px 32px', width: 'auto', opacity: (loading || nameAvailable === false) ? 0.5 : 1 }}
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
                          <span className="material-symbols-outlined" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: '4px' }}>verified</span> Verified as: {persistedBankName.toUpperCase() || 'YOUR ACCOUNT'}
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
                              <span className="material-symbols-outlined" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: '4px' }}>verified</span> Account Name: {resolvedName}
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    <div style={{ borderTop: '1px solid var(--v2-outline)', margin: '8px 0' }}></div>
                    
                    {/* Mockup Setting: Email Notifications */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.5, pointerEvents: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div>
                          <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Email Notifications</h4>
                          <p style={{ fontSize: '12px', color: 'var(--v2-text-variant)', margin: 0 }}>Receive an email summary when a payout is initiated.</p>
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--v2-surface-lowest)', border: '1px solid var(--v2-outline)', padding: '2px 8px', borderRadius: '4px', color: 'var(--v2-text-variant)' }}>Coming Soon</span>
                      </div>
                      <div style={{ width: '44px', height: '24px', background: 'var(--v2-outline)', borderRadius: '999px', position: 'relative' }}>
                        <div style={{ width: '20px', height: '20px', background: 'var(--v2-surface-low)', borderRadius: '50%', position: 'absolute', top: '2px', left: '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}></div>
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

          {/* ACCOUNT TAB */}
          {activeTab === 'account' && (
            <div className="v2-sub-card" style={{ maxWidth: '800px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>Account Settings</h2>
              
              {accountMsg.text && (
                <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', background: accountMsg.type === 'error' ? '#fef2f2' : '#ecfdf5', color: accountMsg.type === 'error' ? '#991b1b' : '#065f46', border: `1px solid ${accountMsg.type === 'error' ? '#fecaca' : '#a7f3d0'}` }}>
                  {accountMsg.text}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--v2-outline)', paddingTop: '24px', marginTop: '24px' }}>
                <button 
                  type="button" 
                  onClick={handleUpdateAccount}
                  disabled={accountLoading}
                  className="v2-sub-btn v2-sub-btn-primary" 
                  style={{ padding: '12px 32px', width: 'auto' }}
                >
                  {accountLoading ? 'Saving...' : 'Update Account'}
                </button>
              </div>

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

          {/* TIERS TAB */}
          {activeTab === 'tiers' && (
            <div style={{ maxWidth: '1000px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Subscription Tiers</h2>
                  <p style={{ fontSize: '14px', color: 'var(--v2-text-variant)', marginTop: '4px' }}>Create and manage the membership levels your fans can subscribe to.</p>
                </div>
                <button
                  type="button"
                  onClick={() => { closeTierModal(); setShowTierForm(true); }}
                  style={{ padding: '10px 20px', background: 'var(--v2-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                  New Tier
                </button>
              </div>

              {/* Tiers Grid */}
              {tiersList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px', background: 'var(--v2-surface-lowest)', border: '1px solid var(--v2-outline)', borderRadius: '12px', color: 'var(--v2-text-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }}>loyalty</span>
                  <p style={{ fontSize: '16px', fontWeight: 500 }}>No tiers yet</p>
                  <p style={{ fontSize: '14px', marginTop: '4px' }}>Create your first tier to start earning from your fans.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                  {tiersList.map(tier => {
                    const isHighest = tiersList.length > 1 && tier.amount === Math.max(...tiersList.map(t => t.amount));
                    return (
                      <div key={tier.id} style={{
                        background: 'var(--v2-surface-lowest)',
                        border: isHighest ? '2px solid var(--v2-primary)' : '1px solid var(--v2-outline)',
                        borderRadius: '16px',
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        {isHighest && (
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'var(--v2-primary)', color: 'white', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', padding: '4px' }}>
                            VIP Tier
                          </div>
                        )}
                        <div style={{ marginTop: isHighest ? '16px' : '0' }}>
                          <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--v2-primary)' }}>{tier.name}</h3>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '16px' }}>
                            <span style={{ fontSize: '32px', fontWeight: 800, color: 'var(--v2-primary)', letterSpacing: '-0.02em' }}>₦{(tier.amount / 100).toLocaleString()}</span>
                            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--v2-text-variant)' }}>/month</span>
                          </div>
                          {tier.description && (
                            <p style={{ fontSize: '14px', color: 'var(--v2-text-variant)', marginBottom: '24px', lineHeight: 1.5 }}>{tier.description}</p>
                          )}
                          <div style={{ borderTop: '1px solid var(--v2-outline)', paddingTop: '20px', marginBottom: '24px', flexGrow: 1 }}>
                            <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--v2-text-variant)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Includes</p>
                            {tier.perks && tier.perks.length > 0 ? (
                              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {tier.perks.map((p: string, i: number) => (
                                  <li key={i} style={{ fontSize: '14px', color: 'var(--v2-primary)', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--v2-green)', marginTop: '-1px' }}>check_circle</span>
                                    {p}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span style={{ fontSize: '14px', color: 'var(--v2-text-variant)' }}>No specific perks listed.</span>
                            )}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <button type="button" onClick={() => openEditModal(tier)} style={{ padding: '10px', background: 'var(--v2-surface-low)', color: 'var(--v2-primary)', border: '1px solid var(--v2-outline)', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s' }}>
                              Edit
                            </button>
                            <button type="button" onClick={() => handleArchiveTier(tier.id)} style={{ padding: '10px', background: 'transparent', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s' }}>
                              Archive
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Modal Overlay for Tier Form */}
          {showTierForm && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
              <div style={{ background: 'var(--v2-surface-lowest)', borderRadius: '16px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', borderBottom: '1px solid var(--v2-outline)' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>{editingTierId ? 'Edit Tier' : 'Create New Tier'}</h3>
                  <button type="button" onClick={closeTierModal} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--v2-text-variant)', display: 'flex' }}>
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
                
                <div style={{ padding: '24px' }}>
                  {tierMsg.text && (
                    <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', background: tierMsg.type === 'error' ? '#fef2f2' : '#ecfdf5', color: tierMsg.type === 'error' ? '#991b1b' : '#065f46', border: `1px solid ${tierMsg.type === 'error' ? '#fecaca' : '#a7f3d0'}` }}>
                      {tierMsg.text}
                    </div>
                  )}

                  {editingTierId && (
                    <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', background: 'var(--v2-surface-low)', color: 'var(--v2-text-variant)', fontSize: '13px', lineHeight: 1.5, display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--v2-primary)' }}>info</span>
                      <div>
                        <strong>Note:</strong> Changing the price will not affect existing subscribers; they are grandfathered in at their original price.
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Tier Name</label>
                        <input type="text" placeholder="e.g. VIP Supporter" value={tierName} onChange={e => setTierName(e.target.value)} required style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--v2-outline)', background: 'var(--v2-surface)', fontSize: '15px' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Monthly Price (₦)</label>
                        <input type="number" placeholder="1000" min="100" step="100" value={tierAmountNaira} onChange={e => setTierAmountNaira(e.target.value)} required style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--v2-outline)', background: 'var(--v2-surface)', fontSize: '15px' }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Description</label>
                      <textarea rows={2} placeholder="Short description for your fans" value={tierDescription} onChange={e => setTierDescription(e.target.value)} style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--v2-outline)', background: 'var(--v2-surface)', fontSize: '15px' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>Perks (One per line)</label>
                      <textarea rows={4} placeholder={"Exclusive videos\nPrivate Discord invite\nMonthly Q&A"} value={tierPerksText} onChange={e => setTierPerksText(e.target.value)} style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--v2-outline)', background: 'var(--v2-surface)', fontSize: '15px', lineHeight: 1.5 }} />
                    </div>
                  </div>
                </div>
                
                <div style={{ padding: '24px', borderTop: '1px solid var(--v2-outline)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'var(--v2-surface)' }}>
                  <button type="button" onClick={closeTierModal} style={{ padding: '10px 20px', background: 'transparent', color: 'var(--v2-text-variant)', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="button" onClick={handleSaveTier} disabled={tierSaving} style={{ padding: '10px 24px', background: 'var(--v2-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', opacity: tierSaving ? 0.5 : 1 }}>
                    {tierSaving ? 'Saving...' : 'Save Tier'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </form>
        
        <ConfirmModal 
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          isDestructive={confirmModal.isDestructive}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        />
    </main>
  );
}
