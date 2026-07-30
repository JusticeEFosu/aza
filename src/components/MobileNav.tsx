'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

export default function MobileNav({ role }: { role: 'creator' | 'fan' }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'home';
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initials, setInitials] = useState<string>('A');
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();

      if (profile) {
        setAvatarUrl(profile.avatar_url);
        if (profile.full_name) {
          setInitials(profile.full_name.charAt(0).toUpperCase());
        }
      }
    }
    loadProfile();
  }, []);

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

  const creatorLinks = [
    { href: '/creator', icon: 'home', label: 'Dashboard' },
    { href: '/creator/posts', icon: 'list_alt', label: 'Posts' },
    { href: '/creator/fundraisers', icon: 'target', label: 'Fundraisers' },
    { href: '/messages', icon: 'mail', label: 'Messages' },
    { href: '/creator/payouts', icon: 'payments', label: 'Earnings' },
    { href: '/creator/analytics', icon: 'monitoring', label: 'Analytics' },
    { href: '/creator/settings', icon: 'settings', label: 'Settings' }
  ];

  const fanLinks = [
    { href: '/fan', icon: 'home', label: 'Feed' },
    { href: '/fan/subscriptions', icon: 'wallet', label: 'Subscriptions' },
    { href: '/fan/discover', icon: 'group', label: 'Discover Creators' },
    { href: '/messages', icon: 'mail', label: 'Messages' },
    { href: '/fan/settings', icon: 'settings', label: 'Settings' }
  ];

  const links = role === 'creator' ? creatorLinks : fanLinks;

  return (
    <>
      {/* Fixed Top Bar */}
      <div
        className="v2-mobile-topbar"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '64px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #E2E8F0',
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          boxSizing: 'border-box'
        }}
      >
        <button
          className="v2-mobile-toggle"
          style={{ background: 'transparent', border: 'none', color: '#0b1c30', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
          onClick={() => setIsOpen(true)}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>menu</span>
        </button>

        <span className="v2-dash-title" style={{ fontSize: '24px', margin: 0, color: 'var(--az-primary, #004e34)', fontFamily: 'var(--font-heading)', fontWeight: 700, position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          MyAzaa
        </span>

        <button
          onClick={() => setIsOpen(true)}
          style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="Profile" style={{ width: '36px', height: '36px', borderRadius: '12px', objectFit: 'cover', border: '1px solid var(--az-border, #E2E8F0)' }} />
          ) : (
            <div style={{ width: '36px', height: '36px', borderRadius: '12px', backgroundColor: 'var(--az-primary, #004e34)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '14px' }}>
              {initials}
            </div>
          )}
        </button>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 10000,
            animation: 'fadeIn 0.2s ease'
          }}
        />
      )}

      {/* Slide-out Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0, bottom: 0,
          left: isOpen ? 0 : '-80%',
          width: '80%',
          maxWidth: '320px',
          background: 'var(--az-surface-card, #ffffff)',
          borderRight: '1px solid var(--az-border, #E2E8F0)',
          zIndex: 10001,
          transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isOpen ? '10px 0 25px rgba(0,0,0,0.2)' : 'none'
        }}
      >
        <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="v2-dash-title" style={{ fontSize: '28px', color: 'var(--az-primary, #004e34)', fontFamily: 'var(--font-heading)', fontWeight: 700, margin: 0 }}>MyAzaa</span>
          <button
            onClick={() => setIsOpen(false)}
            style={{ background: 'none', border: 'none', color: 'var(--az-text-muted, #3f4943)', cursor: 'pointer', display: 'flex' }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="v2-nav-list" style={{ marginTop: '16px', padding: '0 16px', flex: 1 }}>
          {links.map(link => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`v2-nav-item ${isActive ? 'active' : ''}`}
                style={{
                  marginBottom: '8px',
                  backgroundColor: isActive ? 'var(--az-primary, #004e34)' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--az-text-muted, #3f4943)',
                  fontFamily: 'var(--font-body)',
                  fontWeight: isActive ? 600 : 500,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px'
                }}
              >
                <span className="material-symbols-outlined" style={{ color: isActive ? '#ffffff' : 'var(--az-outline, #6f7a72)', fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                  {link.icon}
                </span>
                <span style={{ flex: 1 }}>{link.label}</span>
                {link.href === '/messages' && unreadCount > 0 && (
                  <div style={{ backgroundColor: '#dc2626', color: 'white', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '100px' }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </div>
                )}
              </Link>
            )
          })}
        </div>

        <div className="v2-sidebar-footer" style={{ padding: '16px' }}>
          <Link href="#" className="v2-nav-item" style={{ marginBottom: '8px' }}>
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
      </div>

      {/* Sticky Bottom Navigation (Mobile Only) */}
      <nav className="v2-bottom-nav">
        {role === 'creator' ? (
          <>
            <Link href="/creator" className={`v2-bottom-nav-item ${pathname === '/creator' ? 'active' : ''}`}>
              <span className="material-symbols-outlined v2-bottom-nav-icon" style={{ fontVariationSettings: pathname === '/creator' ? "'FILL' 1" : "'FILL' 0" }}>home</span>
              <span className="v2-bottom-nav-label">Home</span>
            </Link>
            <Link href="/creator/tiers" className={`v2-bottom-nav-item ${pathname === '/creator/tiers' ? 'active' : ''}`}>
              <span className="material-symbols-outlined v2-bottom-nav-icon" style={{ fontVariationSettings: pathname === '/creator/tiers' ? "'FILL' 1" : "'FILL' 0" }}>group</span>
              <span className="v2-bottom-nav-label">Subs</span>
            </Link>
            <Link href="/creator/posts" className="v2-bottom-fab">
              <span className="material-symbols-outlined">add</span>
            </Link>
            <Link href="/creator/payouts" className={`v2-bottom-nav-item ${pathname === '/creator/payouts' ? 'active' : ''}`}>
              <span className="material-symbols-outlined v2-bottom-nav-icon" style={{ fontVariationSettings: pathname === '/creator/payouts' ? "'FILL' 1" : "'FILL' 0" }}>payments</span>
              <span className="v2-bottom-nav-label">Earnings</span>
            </Link>
            <Link href="/creator/settings" className={`v2-bottom-nav-item ${pathname === '/creator/settings' ? 'active' : ''}`}>
              <span className="material-symbols-outlined v2-bottom-nav-icon" style={{ fontVariationSettings: pathname === '/creator/settings' ? "'FILL' 1" : "'FILL' 0" }}>settings</span>
              <span className="v2-bottom-nav-label">Settings</span>
            </Link>
          </>
        ) : (
          <>
            <Link href="/fan" className={`v2-bottom-nav-item ${pathname === '/fan' ? 'active' : ''}`}>
              <span className="material-symbols-outlined v2-bottom-nav-icon" style={{ fontVariationSettings: pathname === '/fan' ? "'FILL' 1" : "'FILL' 0" }}>home</span>
              <span className="v2-bottom-nav-label">Feed</span>
            </Link>
            <Link href="/fan/subscriptions" className={`v2-bottom-nav-item ${pathname === '/fan/subscriptions' ? 'active' : ''}`}>
              <span className="material-symbols-outlined v2-bottom-nav-icon" style={{ fontVariationSettings: pathname === '/fan/subscriptions' ? "'FILL' 1" : "'FILL' 0" }}>wallet</span>
              <span className="v2-bottom-nav-label">Subs</span>
            </Link>
            <Link href="/fan/discover" className="v2-bottom-fab">
              <span className="material-symbols-outlined">search</span>
            </Link>
            <Link href="/messages" className={`v2-bottom-nav-item ${pathname === '/messages' ? 'active' : ''}`} style={{ position: 'relative' }}>
              <span className="material-symbols-outlined v2-bottom-nav-icon" style={{ fontVariationSettings: pathname === '/messages' ? "'FILL' 1" : "'FILL' 0" }}>mail</span>
              <span className="v2-bottom-nav-label">Messages</span>
              {unreadCount > 0 && (
                <div style={{ position: 'absolute', top: '4px', right: '16px', backgroundColor: '#dc2626', color: 'white', fontSize: '9px', fontWeight: 700, height: '16px', minWidth: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', padding: '0 4px' }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </div>
              )}
            </Link>
            <Link href="/fan/settings" className={`v2-bottom-nav-item ${pathname === '/fan/settings' ? 'active' : ''}`}>
              <span className="material-symbols-outlined v2-bottom-nav-icon" style={{ fontVariationSettings: pathname === '/fan/settings' ? "'FILL' 1" : "'FILL' 0" }}>settings</span>
              <span className="v2-bottom-nav-label">Settings</span>
            </Link>
          </>
        )}
      </nav>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @media (min-width: 768px) {
          .v2-mobile-topbar { display: none !important; }
        }
        @media (max-width: 767px) {
          .v2-main-content, .v2-fan-main {
            padding-top: 80px !important;
            padding-bottom: 100px !important;
          }
        }
      `}} />
    </>
  );
}
