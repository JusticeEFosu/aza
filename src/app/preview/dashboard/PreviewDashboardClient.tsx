'use client';

import { useState } from 'react';
import Link from 'next/link';
import AnalyticsChart from '@/components/AnalyticsChart';

interface PreviewDashboardProps {
  user: any;
  profile: any;
  creatorProfile: any;
  stats: {
    activeSubsCount: number;
    newSubs7d: number;
    mrr: number;
    totalFundraisers: number;
  };
  checklist: {
    hasProfile: boolean;
    hasBank: boolean;
    hasTiers: boolean;
    isPublished: boolean;
  };
  fundraisers: any[];
  recentActivities: any[];
  transactions: any[];
}

export default function PreviewDashboardClient({
  user,
  profile,
  creatorProfile,
  stats,
  checklist,
  fundraisers,
  recentActivities,
  transactions
}: PreviewDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'subscribers' | 'posts' | 'fundraisers' | 'payouts' | 'settings'>('overview');
  const [checklistExpanded, setChecklistExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const displayName = creatorProfile?.display_name || profile?.display_name || profile?.full_name || 'Creator';
  const avatarUrl = profile?.avatar_url;
  const isVerified = Boolean(creatorProfile?.is_verified);
  const slug = creatorProfile?.slug || '';
  const publicUrl = `https://aza-chi.vercel.app/c/${slug}`;

  // Currency Formatter
  const formatNaira = (amountKobo: number) => {
    const naira = amountKobo / 100;
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0
    }).format(naira);
  };

  const formatShortNaira = (amountKobo: number) => {
    const naira = amountKobo / 100;
    if (naira >= 1_000_000) return `₦${(naira / 1_000_000).toFixed(1)}M`;
    if (naira >= 1_000) return `₦${(naira / 1_000).toFixed(0)}k`;
    return `₦${naira.toLocaleString()}`;
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Checklist computation
  const steps = [
    { key: 'profile', label: 'Upload Profile Photo', done: checklist.hasProfile, href: '/creator/settings?tab=profile' },
    { key: 'bank', label: 'Link Settlement Bank', done: checklist.hasBank, href: '/creator/settings?tab=payouts' },
    { key: 'tier', label: 'Create First Membership Tier', done: checklist.hasTiers, href: '/creator/tiers' },
    { key: 'publish', label: 'Publish to Public', done: checklist.isPublished, href: '/creator' }
  ];
  const completedSteps = steps.filter(s => s.done).length;
  const progressPercent = Math.round((completedSteps / steps.length) * 100);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0d0c', // Dark modern foundation
      color: '#f1f5f9',
      fontFamily: 'var(--font-inter, sans-serif)',
      display: 'flex'
    }}>
      {/* 1. SIDEBAR (Neo-Fintech Minimalist) */}
      <aside style={{
        width: '270px',
        background: '#111614',
        borderRight: '1px solid rgba(255, 255, 255, 0.07)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        padding: '24px 16px',
        boxSizing: 'border-box'
      }}>
        {/* Brand & Preview Badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '16px',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}>
              A
            </div>
            <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff', fontFamily: 'var(--font-montserrat, sans-serif)' }}>
              MyAzaa
            </span>
          </div>
          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            padding: '4px 8px',
            borderRadius: '999px',
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#34d399',
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            V3 Preview
          </span>
        </div>

        {/* Creator Identity Strip */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '12px',
          padding: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '24px'
        }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #10b981' }} />
          ) : (
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#10b981', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontWeight: 600, fontSize: '14px', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {displayName}
              </span>
              {isVerified && <span style={{ color: '#10b981', fontSize: '14px' }}>✓</span>}
            </div>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              {checklist.isPublished ? 'Live & Published' : 'Draft / Private'}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          {[
            { id: 'overview', label: 'Overview', icon: 'dashboard', href: '#' },
            { id: 'subscribers', label: 'Subscribers & Tiers', icon: 'loyalty', href: '/creator/tiers' },
            { id: 'posts', label: 'Content Posts', icon: 'article', href: '/creator/posts' },
            { id: 'fundraisers', label: 'Goals & Fundraisers', icon: 'flag', href: '/creator/fundraisers' },
            { id: 'payouts', label: 'Payouts & Revenue', icon: 'payments', href: '/creator/payouts' },
            { id: 'settings', label: 'Settings', icon: 'tune', href: '/creator/settings' }
          ].map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isActive ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                  color: isActive ? '#10b981' : '#94a3b8',
                  fontSize: '14px',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    e.currentTarget.style.color = '#f1f5f9';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#94a3b8';
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer Link */}
        <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.07)' }}>
          <Link
            href="/creator"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#64748b',
              fontSize: '13px',
              textDecoration: 'none',
              padding: '8px 12px',
              borderRadius: '6px',
              transition: 'color 0.2s'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
            Exit Preview Mode
          </Link>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '36px 48px', maxWidth: '1300px' }}>
        
        {/* Top Header Strip */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: '#ffffff', fontFamily: 'var(--font-montserrat, sans-serif)' }}>
                Overview
              </h1>
              <span style={{
                fontSize: '12px',
                padding: '2px 8px',
                borderRadius: '6px',
                background: checklist.isPublished ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: checklist.isPublished ? '#34d399' : '#fbbf24',
                fontWeight: 600
              }}>
                {checklist.isPublished ? 'Public' : 'Unpublished'}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>
              Real-time snapshot of your memberships, fans, and recurring revenue.
            </p>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={copyShareLink}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#f1f5f9',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                {copied ? 'check' : 'link'}
              </span>
              {copied ? 'Copied URL!' : 'Share Page'}
            </button>

            <Link
              href="/creator/posts"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.25)',
                transition: 'transform 0.15s ease'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
              New Post
            </Link>
          </div>
        </header>

        {/* 3. SLEEK COMPACT SETUP STRIP (Replaces the giant box taking up 70% screen) */}
        {!checklist.isPublished && (
          <div style={{
            background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.06) 0%, rgba(16, 185, 129, 0.02) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '16px',
            padding: '20px 24px',
            marginBottom: '32px',
            backdropFilter: 'blur(8px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '13px'
                }}>
                  {completedSteps}/{steps.length}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>
                    Complete your setup to launch
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#94a3b8' }}>
                    Finish these items so fans can discover your page and join tiers.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setChecklistExpanded(!checklistExpanded)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>{checklistExpanded ? 'Collapse' : 'View checklist'}</span>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  {checklistExpanded ? 'expand_less' : 'expand_more'}
                </span>
              </button>
            </div>

            {checklistExpanded && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '16px' }}>
                {steps.map((step, idx) => (
                  <div
                    key={step.key}
                    style={{
                      background: step.done ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${step.done ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.07)'}`,
                      borderRadius: '10px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: '18px',
                        color: step.done ? '#10b981' : '#64748b'
                      }}
                    >
                      {step.done ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: step.done ? '#ffffff' : '#94a3b8' }}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. STAT METRICS CARDS (Neo-Fintech Card Grid) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '20px',
          marginBottom: '32px'
        }}>
          {/* Card 1: Monthly Recurring Revenue */}
          <div style={{
            background: '#131916',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: '16px',
            padding: '24px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Est. Monthly (MRR)
              </span>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>account_balance_wallet</span>
              </div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '6px' }}>
              {formatNaira(stats.mrr)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
              <span>Recurring monthly active volume</span>
            </div>
          </div>

          {/* Card 2: Active Subscribers */}
          <div style={{
            background: '#131916',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: '16px',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Active Members
              </span>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>group</span>
              </div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '6px' }}>
              {stats.activeSubsCount}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: stats.newSubs7d > 0 ? '#10b981' : '#64748b' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                {stats.newSubs7d > 0 ? 'trending_up' : 'remove'}
              </span>
              <span>{stats.newSubs7d} joined in last 7 days</span>
            </div>
          </div>

          {/* Card 3: Active Goals / Fundraisers */}
          <div style={{
            background: '#131916',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: '16px',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Live Fundraisers
              </span>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>flag</span>
              </div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '6px' }}>
              {stats.totalFundraisers}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
              <Link href="/creator/fundraisers" style={{ color: '#38bdf8', textDecoration: 'none' }}>
                Manage goals →
              </Link>
            </div>
          </div>
        </div>

        {/* 5. SPLIT SECTION: Analytics Chart + Recent Feed */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          
          {/* Revenue Trends */}
          <div style={{
            background: '#131916',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: '16px',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>Revenue Trend</h3>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748b' }}>Daily earnings converted from paid transactions</p>
              </div>
            </div>

            {transactions.length > 0 ? (
              <AnalyticsChart transactions={transactions} formattedMRR={formatShortNaira(stats.mrr)} />
            ) : (
              <div style={{
                height: '240px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px dashed rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                color: '#64748b'
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '36px', marginBottom: '8px', opacity: 0.5 }}>query_stats</span>
                <span style={{ fontSize: '14px' }}>No revenue activity recorded yet</span>
                <span style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>Share your link to start receiving supporters</span>
              </div>
            )}
          </div>

          {/* Activity Stream */}
          <div style={{
            background: '#131916',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>
              Recent Activity
            </h3>

            {recentActivities.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', maxHeight: '280px' }}>
                {recentActivities.map((act: any, i: number) => (
                  <div key={act.id || i} style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: act._type === 'subscription' ? 'rgba(16,185,129,0.15)' : 'rgba(56,189,248,0.15)',
                      color: act._type === 'subscription' ? '#10b981' : '#38bdf8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px'
                    }}>
                      {act._type === 'subscription' ? '⭐' : '💸'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {act.donor_name || act.profiles?.display_name || act.profiles?.full_name || 'Anonymous Fan'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {act._type === 'subscription' ? 'Subscribed to Tier' : 'Direct Tip'}
                      </div>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#10b981' }}>
                      +₦{((act.amount || 0) / 100).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px dashed rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '24px',
                textAlign: 'center',
                color: '#64748b'
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.5 }}>inbox</span>
                <span style={{ fontSize: '13px' }}>Your stream is quiet right now</span>
              </div>
            )}
          </div>

        </div>

      </main>
    </div>
  );
}
