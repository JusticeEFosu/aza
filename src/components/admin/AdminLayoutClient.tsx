'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { hasPermission } from '@/lib/permissions';

export default function AdminLayoutClient({
  children,
  role,
}: {
  children: React.ReactNode;
  role: any;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="v2-admin-layout" style={{ background: 'var(--az-bg, #f8f9ff)', minHeight: '100vh' }}>
      {/* Mobile Top Header */}
      <div className="v2-admin-mobile-header" style={{ background: '#ffffff', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ fontSize: '20px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 800, color: '#004e34', letterSpacing: '-0.02em' }}>
          MyAzaa <span style={{ color: '#059669', fontSize: '12px', verticalAlign: 'middle', background: '#ecfdf5', padding: '4px 8px', borderRadius: '12px', border: '1px solid #059669', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>Admin</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(true)}
          style={{ background: 'transparent', border: 'none', color: '#004e34', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>menu</span>
        </button>
      </div>

      {/* Overlay for mobile */}
      <div 
        className={`v2-admin-overlay ${isSidebarOpen ? 'open' : ''}`}
        onClick={closeSidebar}
        style={{ zIndex: 10000 }}
      />

      {/* Admin Sidebar */}
      <aside className={`v2-admin-sidebar ${isSidebarOpen ? 'open' : ''}`} style={{ background: '#ffffff', borderRight: '1px solid #E2E8F0', zIndex: 10001 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '24px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 800, color: '#004e34', letterSpacing: '-0.02em' }}>
            MyAzaa <span style={{ color: '#059669', fontSize: '13px', verticalAlign: 'middle', background: '#ecfdf5', padding: '4px 8px', borderRadius: '12px', border: '1px solid #059669', fontFamily: 'var(--font-body, Inter, sans-serif)', fontWeight: 600 }}>Admin</span>
          </div>
          <button 
            onClick={closeSidebar}
            style={{ background: 'transparent', border: 'none', color: '#3f4943', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            className="md-flex-none hidden"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '24px', display: 'none' }}>close</span>
          </button>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, marginTop: '24px' }}>
          {[
            { href: '/admin', label: 'Overview', icon: 'dashboard', perm: true },
            { href: '/admin/users', label: 'Users', icon: 'group', perm: hasPermission(role, 'canViewUsers') },
            { href: '/admin/team', label: 'Team', icon: 'badge', perm: role === 'super_admin' },
            { href: '/admin/analytics', label: 'Analytics', icon: 'insights', perm: role === 'super_admin' },
            { href: '/admin/payouts', label: 'Payouts', icon: 'account_balance', perm: hasPermission(role, 'canViewFinancials') },
            { href: '/admin/content', label: 'Content', icon: 'flag', perm: hasPermission(role, 'canViewReports') },
            { href: '/admin/moderation', label: 'Moderation', icon: 'shield', perm: hasPermission(role, 'canViewReports') },
            { href: '/admin/fundraisers', label: 'Fundraisers', icon: 'volunteer_activism', perm: hasPermission(role, 'canViewReports') },
          ].map(item => {
            if (!item.perm) return null;
            const isActive = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
            return (
              <Link 
                key={item.href}
                href={item.href} 
                onClick={closeSidebar} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  padding: '12px 16px', 
                  color: isActive ? '#ffffff' : '#3f4943', 
                  textDecoration: 'none', 
                  borderRadius: '8px', 
                  background: isActive ? '#004e34' : 'transparent', 
                  fontWeight: isActive ? 600 : 500,
                  fontFamily: 'var(--font-body, Inter, sans-serif)',
                  fontSize: '14px'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: isActive ? '#ffffff' : '#6f7a72' }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '24px' }}>
          <form action="/api/auth/signout" method="POST" style={{ margin: 0, padding: 0 }}>
            <button type="submit" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', color: '#ba1a1a', background: 'transparent', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '14px', textAlign: 'left' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>exit_to_app</span>
              Exit Admin / Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="v2-admin-main" style={{ background: '#f8f9ff', padding: '32px 24px', flexGrow: 1 }}>
        {children}
      </main>
    </div>
  );
}
