'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function CreatorTiers() {
  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState('Creator');
  const [avatarUrl, setAvatarUrl] = useState('');

  // New Tier form state
  const [name, setName] = useState('');
  const [amountNaira, setAmountNaira] = useState('');
  const [description, setDescription] = useState('');
  const [perksText, setPerksText] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [showForm, setShowForm] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
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

      await fetchTiers();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTiers() {
    const res = await fetch('/api/tiers');
    const data = await res.json();
    if (data.data) {
      setTiers(data.data);
      if (data.data.length > 0) {
        const highestTier = [...data.data].sort((a: any, b: any) => b.amount - a.amount)[0];
        if (highestTier.perks?.length > 0) setPerksText(highestTier.perks.join('\n'));
      }
    }
  }

  async function handleCreateTier(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg({ text: '', type: '' });

    try {
      const amountKobo = Math.round(parseFloat(amountNaira) * 100);
      if (amountKobo < 100) throw new Error('Minimum tier amount is ₦1');

      const perksArray = perksText.split('\n').map(p => p.trim()).filter(p => p.length > 0);

      const res = await fetch('/api/tiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, amount: amountKobo, description, perks: perksArray })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMsg({ text: 'Tier created successfully!', type: 'success' });
      setName(''); setAmountNaira(''); setDescription(''); setPerksText('');
      setShowForm(false);
      fetchTiers();
    } catch (err: any) {
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  }

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
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="v2-sidebar-avatar" />
          ) : (
            <div className="v2-sidebar-avatar">{displayName.charAt(0).toUpperCase()}</div>
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
          <Link href="/creator/tiers" className="v2-nav-item active">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
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
          <Link href="/creator/settings" className="v2-nav-item">
            <span className="material-symbols-outlined">settings</span>
            Settings
          </Link>
        </div>

        <div className="v2-sidebar-footer">
          <Link href="#" className="v2-nav-item">
            <span className="material-symbols-outlined">help</span>
            Help
          </Link>
          <form action="/api/auth/signout" method="POST" style={{ display: 'inline' }}>
            <button type="submit" className="v2-nav-item" style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', font: 'inherit', color: 'inherit' }}>
              <span className="material-symbols-outlined">logout</span>
              Sign Out
            </button>
          </form>
        </div>
      </nav>

      {/* Main Content */}
      <main className="v2-main-content" style={{ maxWidth: '900px' }}>
        <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="v2-dash-title">Subscription Tiers</h1>
            <p className="v2-dash-desc">Create and manage the membership levels your fans can subscribe to.</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{ padding: '10px 20px', background: 'var(--v2-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{showForm ? 'close' : 'add'}</span>
            {showForm ? 'Cancel' : 'New Tier'}
          </button>
        </header>

        {msg.text && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', background: msg.type === 'error' ? '#fef2f2' : '#ecfdf5', color: msg.type === 'error' ? '#991b1b' : '#065f46', border: `1px solid ${msg.type === 'error' ? '#fecaca' : '#a7f3d0'}` }}>
            {msg.text}
          </div>
        )}

        {/* Create Tier Form */}
        {showForm && (
          <div style={{ background: 'var(--v2-surface-lowest)', border: '1px solid var(--v2-outline)', borderRadius: '12px', padding: '24px', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>Create New Tier</h2>
            <form onSubmit={handleCreateTier} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>Tier Name</label>
                  <input type="text" placeholder="e.g. VIP Supporter" value={name} onChange={e => setName(e.target.value)} required style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--v2-outline)', background: 'var(--v2-surface)', fontSize: '16px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>Monthly Price (₦)</label>
                  <input type="number" placeholder="1000" min="100" step="100" value={amountNaira} onChange={e => setAmountNaira(e.target.value)} required style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--v2-outline)', background: 'var(--v2-surface)', fontSize: '16px' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>Description</label>
                <textarea rows={2} placeholder="Short description for your fans" value={description} onChange={e => setDescription(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--v2-outline)', background: 'var(--v2-surface)', fontSize: '16px' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>Perks (One per line)</label>
                <textarea rows={4} placeholder={"Exclusive videos\nPrivate Discord invite\nMonthly Q&A"} value={perksText} onChange={e => setPerksText(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--v2-outline)', background: 'var(--v2-surface)', fontSize: '16px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" disabled={saving} style={{ padding: '10px 24px', background: 'var(--v2-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>
                  {saving ? 'Creating...' : 'Create Tier'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Existing Tiers */}
        {tiers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px', background: 'var(--v2-surface-lowest)', border: '1px solid var(--v2-outline)', borderRadius: '12px', color: 'var(--v2-text-variant)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }}>loyalty</span>
            <p style={{ fontSize: '16px', fontWeight: 500 }}>No tiers yet</p>
            <p style={{ fontSize: '14px', marginTop: '4px' }}>Create your first tier to start earning from your fans.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {tiers.map(tier => (
              <div key={tier.id} style={{ background: 'var(--v2-surface-lowest)', border: '1px solid var(--v2-outline)', borderRadius: '12px', padding: '20px', borderLeft: '3px solid var(--v2-primary)', transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>{tier.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--v2-primary)' }}>
                      ₦{(tier.amount / 100).toLocaleString()}<span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--v2-text-variant)' }}>/mo</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: 'var(--v2-green)', background: 'rgba(5,150,105,0.08)', padding: '4px 10px', borderRadius: '999px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--v2-green)' }}></span>
                      Active
                    </span>
                  </div>
                </div>
                {tier.description && (
                  <p style={{ fontSize: '14px', color: 'var(--v2-text-variant)', marginBottom: '12px' }}>{tier.description}</p>
                )}
                {tier.perks && tier.perks.length > 0 && (
                  <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {tier.perks.map((p: string, i: number) => (
                      <li key={i} style={{ fontSize: '14px', color: 'var(--v2-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--v2-green)' }}>check</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Bottom Nav (Mobile) */}
      <nav className="v2-bottom-nav">
        <Link href="/creator" className="v2-bottom-nav-item">
          <span className="material-symbols-outlined v2-bottom-nav-icon" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
          <span className="v2-bottom-nav-label">Home</span>
        </Link>
        <Link href="/creator/tiers" className="v2-bottom-nav-item active">
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
        <Link href="/creator/settings" className="v2-bottom-nav-item">
          <span className="material-symbols-outlined v2-bottom-nav-icon">settings</span>
          <span className="v2-bottom-nav-label">Settings</span>
        </Link>
      </nav>
    </div>
  );
}
