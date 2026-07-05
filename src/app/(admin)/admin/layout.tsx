import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Final server-side check (double protection after middleware)
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    redirect('/');
  }

  return (
    <div className="v2-dashboard-layout" style={{ display: 'flex', minHeight: '100vh', background: 'var(--v2-bg-lowest)' }}>
      {/* Admin Sidebar */}
      <aside style={{ width: '260px', background: 'var(--v2-surface)', borderRight: '1px solid var(--v2-outline)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', position: 'fixed', height: '100vh' }}>
        <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--v2-primary)', letterSpacing: '-0.02em' }}>
          MyAzaa <span style={{ color: 'var(--v2-green)', fontSize: '14px', verticalAlign: 'middle', background: 'var(--v2-surface-lowest)', padding: '4px 8px', borderRadius: '12px', border: '1px solid var(--v2-green)' }}>Admin</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', color: 'var(--v2-text)', textDecoration: 'none', borderRadius: '8px', background: 'var(--v2-surface-low)', fontWeight: 600 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>dashboard</span>
            Overview
          </Link>
          <Link href="/admin/users" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', color: 'var(--v2-text-variant)', textDecoration: 'none', borderRadius: '8px', fontWeight: 500 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>group</span>
            Users
          </Link>
          <Link href="/admin/analytics" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', color: 'var(--v2-text-variant)', textDecoration: 'none', borderRadius: '8px', fontWeight: 500 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>insights</span>
            Analytics
          </Link>
          <Link href="/admin/payouts" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', color: 'var(--v2-text-variant)', textDecoration: 'none', borderRadius: '8px', fontWeight: 500 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>account_balance</span>
            Payouts
          </Link>
          <Link href="/admin/content" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', color: 'var(--v2-text-variant)', textDecoration: 'none', borderRadius: '8px', fontWeight: 500 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>flag</span>
            Content
          </Link>
          <Link href="/admin/moderation" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', color: 'var(--v2-text-variant)', textDecoration: 'none', borderRadius: '8px', fontWeight: 500 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>shield</span>
            Moderation
          </Link>
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
      <main style={{ marginLeft: '260px', flex: 1, padding: '40px', maxWidth: '1200px' }}>
        {children}
      </main>
    </div>
  );
}
