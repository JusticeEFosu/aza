'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('Creator');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;
  const [messagingId, setMessagingId] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
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

      const res = await fetch('/api/subscribers');
      const json = await res.json();
      if (json.subscribers) setSubscribers(json.subscribers);
      if (json.tiers) setTiers(json.tiers);
    } catch (err: any) { console.error(err); }
    finally { setLoading(false); }
  };

  // --- Tier badge styling based on rank ---
  const getTierBadgeStyle = (tierAmount: number): React.CSSProperties => {
    if (tiers.length <= 1) {
      // Single tier or unknown: dark/premium
      return { background: 'var(--v2-primary)', color: 'var(--v2-on-primary)' };
    }
    const sorted = [...tiers].sort((a, b) => a.amount - b.amount);
    const maxAmount = sorted[sorted.length - 1].amount;
    const minAmount = sorted[0].amount;

    if (tierAmount >= maxAmount) {
      // Highest tier: dark
      return { background: 'var(--v2-primary)', color: 'var(--v2-on-primary)' };
    } else if (tierAmount <= minAmount) {
      // Lowest tier: light
      return { background: 'var(--v2-surface-low)', color: 'var(--v2-text-variant)' };
    } else {
      // Middle tier(s): medium
      return { background: '#E5E7EB', color: 'var(--v2-primary)' };
    }
  };

  // --- Stats ---
  const activeSubscribers = useMemo(() => subscribers.filter(s => s.status === 'active'), [subscribers]);

  const newThisMonth = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return activeSubscribers.filter(s => new Date(s.created_at) >= startOfMonth).length;
  }, [activeSubscribers]);

  const churnRate = useMemo(() => {
    const total = subscribers.length;
    if (total === 0) return '0';
    const cancelled = subscribers.filter(s => s.status === 'cancelled').length;
    return ((cancelled / total) * 100).toFixed(1);
  }, [subscribers]);

  // --- Filtering & Search ---
  const filteredSubscribers = useMemo(() => {
    let list = activeSubscribers;

    if (tierFilter !== 'all') {
      list = list.filter(s => {
        const tier = Array.isArray(s.tiers) ? s.tiers[0] : s.tiers;
        return tier?.id === tierFilter;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s => {
        const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
        const name = (profile?.display_name || profile?.full_name || '').toLowerCase();
        const email = (profile?.email || '').toLowerCase();
        return name.includes(q) || email.includes(q);
      });
    }

    return list;
  }, [activeSubscribers, tierFilter, search]);

  // --- Pagination ---
  const totalPages = Math.max(1, Math.ceil(filteredSubscribers.length / perPage));
  const paginatedSubscribers = filteredSubscribers.slice((currentPage - 1) * perPage, currentPage * perPage);

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [search, tierFilter]);

  const handleMessageSubscriber = async (subscriberId: string) => {
    setMessagingId(subscriberId);
    try {
      const res = await fetch('/api/messages/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ creator_id: subscriberId })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate message');
      }

      router.push(`/messages?channelId=${data.channel_id}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setMessagingId(null);
    }
  };

  if (loading) {
    return (
      <div className="v2-dashboard-layout" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <span className="spinner" style={{ width: '32px', height: '32px', borderColor: 'rgba(0,0,0,0.1)', borderTopColor: 'var(--v2-primary)' }} />
      </div>
    );
  }

  return (
    <main className="v2-main-content" style={{ overflowX: 'hidden' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>

        {/* Page Header */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: 600, color: 'var(--v2-primary)', margin: 0, letterSpacing: '-0.01em' }}>Subscribers</h1>
              <p style={{ fontSize: '16px', color: 'var(--v2-text-variant)', marginTop: '4px' }}>Manage your active community members.</p>
            </div>
            <div className="v2-search-filter-container">
              {/* Search */}
              <div className="v2-search-wrapper" style={{ position: 'relative' }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--v2-text-variant)', fontSize: '20px' }}>search</span>
                <input
                  type="text"
                  placeholder="Search subscribers..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ paddingLeft: '40px', paddingRight: '16px', padding: '8px 16px 8px 40px', border: '1px solid var(--v2-outline)', borderRadius: '8px', background: 'var(--v2-surface-lowest)', fontSize: '14px', outline: 'none', width: '240px' }}
                />
              </div>
              {/* Filter */}
              {tiers.length > 1 && (
                <select
                  className="v2-filter-select"
                  value={tierFilter}
                  onChange={e => setTierFilter(e.target.value)}
                  style={{ padding: '8px 32px 8px 12px', border: '1px solid var(--v2-outline)', borderRadius: '8px', background: 'var(--v2-surface-lowest)', fontSize: '14px', outline: 'none', cursor: 'pointer', appearance: 'none' }}
                >
                  <option value="all">All Tiers</option>
                  {tiers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="v2-bento-stats" style={{ marginBottom: '32px' }}>
          <div className="v2-bento-card-main" style={{ background: 'var(--v2-surface-lowest)', border: '1px solid var(--v2-outline)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--v2-text-variant)' }}>Total Active</span>
            <div style={{ fontSize: '48px', fontWeight: 700, color: 'var(--v2-primary)', marginTop: '8px', letterSpacing: '-0.02em' }}>{activeSubscribers.length.toLocaleString()}</div>
          </div>
          <div style={{ background: 'var(--v2-surface-lowest)', border: '1px solid var(--v2-outline)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--v2-text-variant)' }}>New This Month</span>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--v2-green)', marginTop: '4px', letterSpacing: '-0.02em' }}>+{newThisMonth}</div>
          </div>
          <div style={{ background: 'var(--v2-surface-lowest)', border: '1px solid var(--v2-outline)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--v2-text-variant)' }}>Churn Rate</span>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--v2-primary)', marginTop: '4px', letterSpacing: '-0.02em' }}>{churnRate}%</div>
          </div>
        </div>

        {/* Subscriber Table */}
        {activeSubscribers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px', background: 'var(--v2-surface-lowest)', border: '1px solid var(--v2-outline)', borderRadius: '12px', color: 'var(--v2-text-variant)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }}>group</span>
            <p style={{ fontSize: '16px', fontWeight: 500 }}>No subscribers yet</p>
            <p style={{ fontSize: '14px', marginTop: '4px' }}>Share your profile link to start growing your community.</p>
          </div>
        ) : (
          <div style={{ background: 'var(--v2-surface-lowest)', border: '1px solid var(--v2-outline)', borderRadius: '12px', overflow: 'hidden', width: '100%' }}>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
              <div style={{ minWidth: '800px' }}>
                {/* Table Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 0.5fr', padding: '12px 20px', background: 'var(--v2-surface-low)', borderBottom: '1px solid var(--v2-outline)' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subscriber</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tier</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Join Date</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Action</span>
                </div>
                {/* Table Rows */}
                {filteredSubscribers.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--v2-text-variant)', fontSize: '14px' }}>
                    No subscribers match your search.
                  </div>
                ) : (
              paginatedSubscribers.map((sub, idx) => {
                const profile = Array.isArray(sub.profiles) ? sub.profiles[0] : sub.profiles;
                const tier = Array.isArray(sub.tiers) ? sub.tiers[0] : sub.tiers;
                const name = profile?.display_name || profile?.full_name || 'Unknown';
                const email = profile?.email || '';
                const initial = name.charAt(0).toUpperCase() + (name.split(' ')[1]?.charAt(0).toUpperCase() || '');
                const isTopTier = tier && tiers.length > 0 && tier.amount === Math.max(...tiers.map((t: any) => t.amount));

                return (
                  <div
                    key={sub.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 1fr 1fr 0.5fr',
                      padding: '16px 20px',
                      alignItems: 'center',
                      borderBottom: idx < paginatedSubscribers.length - 1 ? '1px solid var(--v2-outline)' : 'none',
                      borderLeft: isTopTier ? '3px solid var(--v2-green)' : '3px solid transparent',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--v2-surface)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Subscriber */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--v2-outline)' }} />
                      ) : (
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px', color: 'var(--v2-primary)', border: '1px solid var(--v2-outline)' }}>
                          {initial}
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--v2-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {name}
                          {isTopTier && <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--v2-green)' }} title="Top Supporter">star</span>}
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)' }}>{email}</div>
                      </div>
                    </div>

                    {/* Tier Badge */}
                    <div>
                      {tier ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 600,
                          ...getTierBadgeStyle(tier.amount)
                        }}>
                          {tier.name}
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--v2-text-variant)' }}>—</span>
                      )}
                    </div>

                    {/* Join Date */}
                    <div style={{ fontSize: '14px', color: 'var(--v2-text-variant)' }}>
                      {new Date(sub.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>

                    {/* Status */}
                    <div>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: sub.status === 'active' ? '#E6F4EA' : '#FEF2F2',
                        color: sub.status === 'active' ? '#1E4620' : '#991b1b',
                        border: `1px solid ${sub.status === 'active' ? '#CEEAD6' : '#FECACA'}`,
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: sub.status === 'active' ? '#1E4620' : '#991b1b' }} />
                        {sub.status === 'active' ? 'Active' : 'Cancelled'}
                      </span>
                    </div>

                    {/* Action */}
                    <div style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => profile?.id && handleMessageSubscriber(profile.id)}
                        disabled={messagingId !== null}
                        style={{ padding: '6px', background: 'transparent', border: 'none', borderRadius: '50%', cursor: messagingId !== null ? 'not-allowed' : 'pointer', color: 'var(--v2-text-variant)', transition: 'all 0.2s' }}
                        onMouseEnter={e => { if (messagingId === null) { e.currentTarget.style.background = 'var(--v2-surface-low)'; e.currentTarget.style.color = 'var(--v2-primary)'; } }}
                        onMouseLeave={e => { if (messagingId === null) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--v2-text-variant)'; } }}
                        title="Message"
                      >
                        {messagingId === profile?.id ? (
                          <span className="material-symbols-outlined spin-icon" style={{ fontSize: '20px' }}>sync</span>
                        ) : (
                          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>chat</span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
                </div>            {/* Pagination */}
            {filteredSubscribers.length > perPage && (
              <div style={{ borderTop: '1px solid var(--v2-outline)', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)' }}>
                  Showing {((currentPage - 1) * perPage) + 1}-{Math.min(currentPage * perPage, filteredSubscribers.length)} of {filteredSubscribers.length.toLocaleString()}
                </span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{ padding: '4px 12px', border: '1px solid var(--v2-outline)', borderRadius: '4px', fontSize: '14px', fontWeight: 500, cursor: currentPage === 1 ? 'default' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1, background: 'transparent', color: 'var(--v2-text-variant)' }}
                  >Prev</button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let page: number;
                    if (totalPages <= 5) { page = i + 1; }
                    else if (currentPage <= 3) { page = i + 1; }
                    else if (currentPage >= totalPages - 2) { page = totalPages - 4 + i; }
                    else { page = currentPage - 2 + i; }
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        style={{ padding: '4px 12px', border: '1px solid var(--v2-outline)', borderRadius: '4px', fontSize: '14px', fontWeight: currentPage === page ? 600 : 500, cursor: 'pointer', background: currentPage === page ? 'var(--v2-surface-low)' : 'transparent', color: 'var(--v2-primary)' }}
                      >{page}</button>
                    );
                  })}
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <span style={{ padding: '4px 8px', color: 'var(--v2-text-variant)' }}>...</span>
                  )}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    style={{ padding: '4px 12px', border: '1px solid var(--v2-outline)', borderRadius: '4px', fontSize: '14px', fontWeight: 500, cursor: currentPage === totalPages ? 'default' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1, background: 'transparent', color: 'var(--v2-primary)' }}
                  >Next</button>
                </div>
              </div>
            )}
          </div>
        </div>
        )}

      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spin-icon {
          animation: spin 1s linear infinite;
          display: inline-block;
        }
        .v2-search-filter-container {
          display: flex;
          align-items: center;
          gap: 16px;
          width: auto;
        }
        @media (max-width: 640px) {
          .v2-search-filter-container {
            width: 100%;
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }
          .v2-search-wrapper {
            width: 100% !important;
          }
          .v2-search-wrapper input {
            width: 100% !important;
          }
          .v2-filter-select {
            width: 100% !important;
          }
        }
      `}} />
    </main>
  );
}
