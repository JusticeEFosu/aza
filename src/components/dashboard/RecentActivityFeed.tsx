'use client';

import { useState } from 'react';
import Link from 'next/link';

// Utility for relative time formatting
function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return `${diffInSeconds} secs ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 172800) return 'Yesterday';
  return `${Math.floor(diffInSeconds / 86400)} days ago`;
}

type ActivityItem = {
  id: string;
  _type: 'subscription' | 'donation';
  amount: number;
  created_at: string;
  donor_name?: string;
  donor_note?: string;
  fundraiser_id?: string | null;
  status?: string;
  profiles?: {
    full_name?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
  } | null;
  subscriptions?: {
    tiers?: { name: string } | { name: string }[] | null;
  } | null;
};

export default function RecentActivityFeed({
  activities,
  isPublished,
}: {
  activities: ActivityItem[];
  isPublished: boolean;
}) {
  const [activeTab, setActiveTab] = useState<'all' | 'subscriptions' | 'tips' | 'fundraisers'>('all');

  const filteredActivities = activities.filter((item) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'subscriptions') return item._type === 'subscription';
    if (activeTab === 'tips') return item._type === 'donation' && !item.fundraiser_id;
    if (activeTab === 'fundraisers') return item._type === 'donation' && Boolean(item.fundraiser_id);
    return true;
  });

  const tabs: { id: 'all' | 'subscriptions' | 'tips' | 'fundraisers'; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'subscriptions', label: 'Subscriptions' },
    { id: 'tips', label: 'Tips' },
    { id: 'fundraisers', label: 'Fundraisers' },
  ];

  return (
    <section className="v2-activity-section" style={{ marginTop: '32px' }}>
      <div 
        className="v2-activity-header" 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '16px', 
          alignItems: 'stretch',
          marginBottom: '20px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="v2-activity-title" style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: 'var(--v2-primary)' }}>
            Recent Activity
          </h2>
          <Link href="/creator/payouts" className="v2-activity-view-all" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--v2-text-variant)', textDecoration: 'none' }}>
            View All →
          </Link>
        </div>

        {/* 4-Tab Filter Bar */}
        <div 
          style={{ 
            display: 'flex', 
            gap: '8px', 
            overflowX: 'auto', 
            paddingBottom: '4px',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '999px',
                  fontSize: '13px',
                  fontWeight: isActive ? 700 : 500,
                  border: isActive ? '1px solid var(--v2-primary)' : '1px solid var(--v2-outline)',
                  background: isActive ? 'var(--v2-primary)' : 'var(--v2-surface-lowest)',
                  color: isActive ? 'var(--v2-on-primary)' : 'var(--v2-text-variant)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                  fontFamily: 'inherit',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="v2-activity-list" style={{ background: 'var(--v2-surface-lowest)', border: '1px solid var(--v2-outline)', borderRadius: '12px', overflow: 'hidden' }}>
        {filteredActivities.length === 0 ? (
          <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--v2-text-variant)', fontSize: '14px' }}>
            {activities.length === 0 ? (
              isPublished 
                ? "No recent activity yet. Share your page to get your first supporter!"
                : "Complete your setup and publish your page to start getting activity!"
            ) : (
              `No ${activeTab === 'all' ? 'recent' : activeTab} activity to show.`
            )}
          </div>
        ) : (
          filteredActivities.map((item) => {
            if (item._type === 'donation') {
              const donorName = item.donor_name || 'Guest Fan';
              const activitySubtext = item.fundraiser_id ? `Donated to Fundraiser` : `Sent a Tip`;
              return (
                <div 
                  key={item.id} 
                  className="v2-activity-item" 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '16px 20px', 
                    borderBottom: '1px solid var(--v2-outline)' 
                  }}
                >
                  <div className="v2-activity-user" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div 
                      className="v2-activity-avatar" 
                      style={{ 
                        width: '36px', 
                        height: '36px', 
                        borderRadius: '50%', 
                        background: 'rgba(6, 95, 70, 0.1)', 
                        color: 'var(--v2-green)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>volunteer_activism</span>
                    </div>
                    <div>
                      <p className="v2-activity-name" style={{ margin: 0, fontWeight: 600, fontSize: '14px', color: 'var(--v2-primary)' }}>{donorName}</p>
                      <p className="v2-activity-desc" style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--v2-text-variant)' }}>
                        {activitySubtext} {item.donor_note ? `- "${item.donor_note}"` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="v2-activity-right" style={{ textAlign: 'right' }}>
                    <p className="v2-activity-amount" style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: 'var(--v2-green)' }}>
                      + ₦ {(item.amount / 100).toLocaleString()}
                    </p>
                    <p className="v2-activity-time" style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--v2-text-variant)' }}>{formatTimeAgo(item.created_at)}</p>
                  </div>
                </div>
              );
            }

            // Subscription item
            const fanName = item.profiles?.display_name || item.profiles?.full_name || 'Anonymous Fan';
            const fanAvatar = item.profiles?.avatar_url;
            
            const tierInfo = item.subscriptions?.tiers;
            const tierName = Array.isArray(tierInfo) ? tierInfo[0]?.name : tierInfo?.name;
            const activitySubtext = tierName ? `Subscribed to ${tierName}` : `Payment Received (${item.status || 'success'})`;
            
            return (
              <div 
                key={item.id} 
                className="v2-activity-item" 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '16px 20px', 
                  borderBottom: '1px solid var(--v2-outline)' 
                }}
              >
                <div className="v2-activity-user" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div 
                    className="v2-activity-avatar" 
                    style={{ 
                      width: '36px', 
                      height: '36px', 
                      borderRadius: '50%', 
                      overflow: 'hidden', 
                      background: 'var(--v2-surface-low)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {fanAvatar ? (
                      <img src={fanAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--v2-text-variant)' }}>person</span>
                    )}
                  </div>
                  <div>
                    <p className="v2-activity-name" style={{ margin: 0, fontWeight: 600, fontSize: '14px', color: 'var(--v2-primary)' }}>{fanName}</p>
                    <p className="v2-activity-desc" style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--v2-text-variant)' }}>{activitySubtext}</p>
                  </div>
                </div>
                <div className="v2-activity-right" style={{ textAlign: 'right' }}>
                  <p className="v2-activity-amount" style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: 'var(--v2-primary)' }}>
                    ₦ {(item.amount / 100).toLocaleString()}
                  </p>
                  <p className="v2-activity-time" style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--v2-text-variant)' }}>{formatTimeAgo(item.created_at)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
