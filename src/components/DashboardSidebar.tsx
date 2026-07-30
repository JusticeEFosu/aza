'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardSidebar({ role }: { role: 'creator' | 'fan' }) {
  const pathname = usePathname();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, display_name, avatar_url')
        .eq('id', user.id)
        .single();
      
      let name = profile?.display_name || profile?.full_name || 'User';
      let verified = false;

      if (role === 'creator') {
        const { data: creator } = await supabase
          .from('creator_profiles')
          .select('display_name, is_verified')
          .eq('id', user.id)
          .single();
        if (creator) {
          if (creator.display_name) name = creator.display_name;
          verified = !!creator.is_verified;
        }
      }

      setAvatarUrl(profile?.avatar_url || null);
      setDisplayName(name);
      setIsVerified(verified);
    }
    loadProfile();
  }, [role]);

  // "Silent Check" for unread messages whenever the user navigates
  useEffect(() => {
    async function fetchUnreadCount() {
      try {
        const res = await fetch('/api/messages/unread-count');
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.count || 0);
        }
      } catch (err) {
        console.error('Failed to fetch unread count:', err);
      }
    }
    fetchUnreadCount();
  }, [pathname]);

  const initials = displayName.charAt(0).toUpperCase();

  const creatorLinks = [
    { href: '/creator', icon: 'home', label: 'Home' },
    { href: '/creator/tiers', icon: 'group', label: 'Subscribers' },
    { href: '/creator/fundraisers', icon: 'target', label: 'Fundraisers' },
    { href: '/messages', icon: 'mail', label: 'Messages' },
    { href: '/creator/payouts', icon: 'payments', label: 'Earnings' },
    { href: '/creator/analytics', icon: 'monitoring', label: 'Analytics' },
    { href: '/creator/settings', icon: 'settings', label: 'Settings' }
  ];

  const fanLinks = [
    { href: '/fan', icon: 'home', label: 'Feed' },
    { href: '/fan/subscriptions', icon: 'wallet', label: 'Subscriptions' },
    { href: '/fan/discover', icon: 'group', label: 'Discover' },
    { href: '/messages', icon: 'mail', label: 'Messages' },
    { href: '/fan/settings', icon: 'settings', label: 'Settings' }
  ];

  const links = role === 'creator' ? creatorLinks : fanLinks;

  return (
    <nav className="v2-sidebar" style={{ backgroundColor: 'var(--az-surface-card, #ffffff)', borderRight: '1px solid var(--az-border, #E2E8F0)' }}>
      <div className="v2-sidebar-header">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="v2-sidebar-avatar" style={{ borderRadius: '12px', border: '1px solid var(--az-border, #E2E8F0)' }} />
        ) : (
          <div className="v2-sidebar-avatar" style={{ backgroundColor: 'var(--az-primary, #004e34)', color: '#ffffff', borderRadius: '12px' }}>
            {initials}
          </div>
        )}
        <div>
          <h2 className="v2-sidebar-title" style={{ fontFamily: 'var(--font-heading)', color: 'var(--az-text-main, #0b1c30)', fontWeight: 600 }}>{displayName}</h2>
          <p className="v2-sidebar-subtitle" style={{ fontFamily: 'var(--font-body)', color: 'var(--az-primary, #004e34)', fontWeight: 500 }}>
            {isVerified ? '✓ Verified Account' : (role === 'creator' ? 'Creator Account' : 'Fan Account')}
          </p>
        </div>
      </div>

      {role === 'creator' && (
        <Link href="/creator/posts" className="v2-sidebar-btn" style={{ backgroundColor: 'var(--az-gold-container, #fed65b)', color: 'var(--az-on-gold, #745c00)', fontFamily: 'var(--font-heading)', fontWeight: 600, borderRadius: '8px' }}>
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
          Post Update
        </Link>
      )}

      <div className="v2-nav-list" style={{ marginTop: '20px' }}>
        {links.map(link => {
          const isActive = pathname === link.href;
          return (
            <Link 
              key={link.href} 
              href={link.href}
              className={`v2-nav-item ${isActive ? 'active' : ''}`}
              style={{ 
                color: isActive ? 'var(--az-primary, #004e34)' : 'var(--az-text-secondary, #6f7a72)', 
                backgroundColor: isActive ? 'var(--az-bg, #f8f9ff)' : 'transparent',
                borderLeftColor: isActive ? 'var(--az-primary, #004e34)' : 'transparent',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                  {link.icon}
                </span>
                <span className="v2-nav-label" style={{ fontFamily: 'var(--font-body)', fontWeight: isActive ? 600 : 500 }}>
                  {link.label}
                </span>
              </div>
              
              {link.href === '/messages' && unreadCount > 0 && (
                <div style={{ 
                  backgroundColor: '#dc2626', 
                  color: 'white', 
                  fontSize: '11px', 
                  fontWeight: 700, 
                  height: '20px', 
                  minWidth: '20px', 
                  padding: '0 6px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      <div className="v2-sidebar-footer" style={{ borderTop: '1px solid var(--az-border, #E2E8F0)' }}>
        <Link href="#" className="v2-nav-item" style={{ color: 'var(--az-text-muted, #3f4943)', fontFamily: 'var(--font-body)' }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--az-outline, #6f7a72)' }}>help</span>
          Help
        </Link>
        <form action="/api/auth/signout" method="POST" style={{ display: 'inline' }}>
          <button type="submit" className="v2-nav-item" style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', font: 'inherit', color: 'var(--az-text-muted, #3f4943)', fontFamily: 'var(--font-body)' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--az-outline, #6f7a72)' }}>logout</span>
            Sign Out
          </button>
        </form>
      </div>
    </nav>
  );
}
