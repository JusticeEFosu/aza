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
    <div className="v2-admin-layout">
      {/* Mobile Top Header */}
      <div className="v2-admin-mobile-header">
        <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--v2-primary)', letterSpacing: '-0.02em' }}>
          MyAzaa <span style={{ color: 'var(--v2-green)', fontSize: '12px', verticalAlign: 'middle', background: 'var(--v2-surface-lowest)', padding: '4px 8px', borderRadius: '12px', border: '1px solid var(--v2-green)' }}>Admin</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(true)}
          style={{ background: 'transparent', border: 'none', color: 'var(--v2-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>menu</span>
        </button>
      </div>

      {/* Overlay for mobile */}
      <div 
        className={`v2-admin-overlay ${isSidebarOpen ? 'open' : ''}`}
        onClick={closeSidebar}
      />

      {/* Admin Sidebar */}
      <aside className={`v2-admin-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--v2-primary)', letterSpacing: '-0.02em' }}>
            MyAzaa <span style={{ color: 'var(--v2-green)', fontSize: '14px', verticalAlign: 'middle', background: 'var(--v2-surface-lowest)', padding: '4px 8px', borderRadius: '12px', border: '1px solid var(--v2-green)' }}>Admin</span>
          </div>
          <button 
            onClick={closeSidebar}
            style={{ background: 'transparent', border: 'none', color: 'var(--v2-text-variant)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            className="md-flex-none hidden" // hidden on md+
          >
            <span className="material-symbols-outlined" style={{ fontSize: '24px', display: 'none' }}>close</span>
          </button>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, marginTop: '24px' }}>
          <Link href="/admin" onClick={closeSidebar} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', color: pathname === '/admin' ? 'var(--v2-text)' : 'var(--v2-text-variant)', textDecoration: 'none', borderRadius: '8px', background: pathname === '/admin' ? 'var(--v2-surface-low)' : 'transparent', fontWeight: pathname === '/admin' ? 600 : 500 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>dashboard</span>
            Overview
          </Link>
          
          {hasPermission(role, 'canViewUsers') && (
            <Link href="/admin/users" onClick={closeSidebar} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', color: pathname.startsWith('/admin/users') ? 'var(--v2-text)' : 'var(--v2-text-variant)', textDecoration: 'none', borderRadius: '8px', background: pathname.startsWith('/admin/users') ? 'var(--v2-surface-low)' : 'transparent', fontWeight: pathname.startsWith('/admin/users') ? 600 : 500 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>group</span>
              Users
            </Link>
          )}

          {role === 'super_admin' && (
            <Link href="/admin/team" onClick={closeSidebar} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', color: pathname.startsWith('/admin/team') ? 'var(--v2-text)' : 'var(--v2-text-variant)', textDecoration: 'none', borderRadius: '8px', background: pathname.startsWith('/admin/team') ? 'var(--v2-surface-low)' : 'transparent', fontWeight: pathname.startsWith('/admin/team') ? 600 : 500 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>badge</span>
              Team
            </Link>
          )}

          {role === 'super_admin' && (
            <Link href="/admin/analytics" onClick={closeSidebar} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', color: pathname.startsWith('/admin/analytics') ? 'var(--v2-text)' : 'var(--v2-text-variant)', textDecoration: 'none', borderRadius: '8px', background: pathname.startsWith('/admin/analytics') ? 'var(--v2-surface-low)' : 'transparent', fontWeight: pathname.startsWith('/admin/analytics') ? 600 : 500 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>insights</span>
              Analytics
            </Link>
          )}

          {hasPermission(role, 'canViewFinancials') && (
            <Link href="/admin/payouts" onClick={closeSidebar} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', color: pathname.startsWith('/admin/payouts') ? 'var(--v2-text)' : 'var(--v2-text-variant)', textDecoration: 'none', borderRadius: '8px', background: pathname.startsWith('/admin/payouts') ? 'var(--v2-surface-low)' : 'transparent', fontWeight: pathname.startsWith('/admin/payouts') ? 600 : 500 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>account_balance</span>
              Payouts
            </Link>
          )}

          {hasPermission(role, 'canViewReports') && (
            <>
              <Link href="/admin/content" onClick={closeSidebar} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', color: pathname.startsWith('/admin/content') ? 'var(--v2-text)' : 'var(--v2-text-variant)', textDecoration: 'none', borderRadius: '8px', background: pathname.startsWith('/admin/content') ? 'var(--v2-surface-low)' : 'transparent', fontWeight: pathname.startsWith('/admin/content') ? 600 : 500 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>flag</span>
                Content
              </Link>
              <Link href="/admin/moderation" onClick={closeSidebar} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', color: pathname.startsWith('/admin/moderation') ? 'var(--v2-text)' : 'var(--v2-text-variant)', textDecoration: 'none', borderRadius: '8px', background: pathname.startsWith('/admin/moderation') ? 'var(--v2-surface-low)' : 'transparent', fontWeight: pathname.startsWith('/admin/moderation') ? 600 : 500 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>shield</span>
                Moderation
              </Link>
            </>
          )}
        </nav>

        <div style={{ borderTop: '1px solid var(--v2-outline)', paddingTop: '24px' }}>
          <form action="/api/auth/signout" method="POST" style={{ margin: 0, padding: 0 }}>
            <button type="submit" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', color: 'var(--v2-text-variant)', background: 'transparent', border: 'none', borderRadius: '8px', fontWeight: 500, cursor: 'pointer', font: 'inherit', textAlign: 'left' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>exit_to_app</span>
              Exit Admin / Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="v2-admin-main">
        {children}
      </main>
    </div>
  );
}
