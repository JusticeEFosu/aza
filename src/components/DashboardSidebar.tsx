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

  const initials = displayName.charAt(0).toUpperCase();

  const creatorLinks = [
    { href: '/creator', icon: 'home', label: 'Home' },
    { href: '/creator/tiers', icon: 'group', label: 'Subscribers' },
    { href: '/messages', icon: 'mail', label: 'Messages' },
    { href: '/creator/payouts', icon: 'payments', label: 'Earnings' },
    { href: '/creator/settings', icon: 'settings', label: 'Settings' }
  ];

  const fanLinks = [
    { href: '/fan', icon: 'home', label: 'Home' },
    { href: '/fan/discover', icon: 'group', label: 'Discover' },
    { href: '/fan#feed', icon: 'dynamic_feed', label: 'Feed' },
    { href: '/messages', icon: 'mail', label: 'Messages' },
    { href: '/fan/settings', icon: 'settings', label: 'Settings' }
  ];

  const links = role === 'creator' ? creatorLinks : fanLinks;

  return (
    <nav className="v2-sidebar">
      <div className="v2-sidebar-header">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="v2-sidebar-avatar" />
        ) : (
          <div className="v2-sidebar-avatar">
            {initials}
          </div>
        )}
        <div>
          <h2 className="v2-sidebar-title">{displayName}</h2>
          <p className="v2-sidebar-subtitle">{isVerified ? 'Verified Account' : (role === 'creator' ? 'Creator Account' : 'Fan Account')}</p>
        </div>
      </div>

      {role === 'creator' && (
        <Link href="/creator/posts" className="v2-sidebar-btn">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
          Post Update
        </Link>
      )}

      <div className="v2-nav-list">
        {links.map(link => {
          const isActive = link.href === '/fan#feed' ? false : pathname === link.href;
          return (
            <Link 
              key={link.href} 
              href={link.href} 
              className={`v2-nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                {link.icon}
              </span>
              {link.label}
            </Link>
          );
        })}
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
  );
}
