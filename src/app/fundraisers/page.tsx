import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import FundraisersEditorialGrid from '@/components/FundraisersEditorialGrid';
import LandingNavbar from '@/components/LandingNavbar';

export default async function FundraisersDirectoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let dashboardUrl = '/login';
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    dashboardUrl = profile?.role === 'creator' ? '/creator' : '/fan';
  }

  // Fetch initial active fundraisers
  const { data: fundraisers } = await supabase
    .from('fundraisers')
    .select(`
      id,
      title,
      description,
      target_amount,
      current_amount,
      creator_id,
      profiles!inner ( full_name, display_name, avatar_url, is_suspended, admin_role )
    `)
    .eq('is_active', true)
    .eq('profiles.is_suspended', false)
    .is('profiles.admin_role', null)
    .order('created_at', { ascending: false })
    .limit(30);

  return (
    <div style={{ background: 'var(--az-bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation */}
      <LandingNavbar user={user} dashboardUrl={dashboardUrl} />

      <main style={{ flexGrow: 1, paddingBottom: '64px' }}>
        <div className="az-container" style={{ paddingTop: '64px' }}>

          <header style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h1 className="az-h1" style={{ marginBottom: '16px' }}>Discover Causes</h1>
            <p className="az-body-lg" style={{ margin: '0 auto', maxWidth: '640px' }}>
              Explore and fund meaningful projects, medical needs, and creative endeavors brought to life by the MyAzaa community.
            </p>
          </header>

          <FundraisersEditorialGrid initialFundraisers={fundraisers || []} />

        </div>
      </main>

      {/* Footer */}
      <footer style={{ background: '#ffffff', borderTop: '1px solid var(--az-border)', padding: '48px 0' }}>
        <div className="az-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
          <div>
            <Link href="/" className="az-h3" style={{ color: 'var(--az-primary)', textDecoration: 'none', fontWeight: 800 }}>
              MyAzaa
            </Link>
            <p className="az-label" style={{ marginTop: '4px', color: 'var(--az-text-muted)' }}>
              © {new Date().getFullYear()} MyAzaa. Built for Nigerian Creators.
            </p>
            <p style={{ fontSize: '12px', color: 'var(--az-text-muted)', marginTop: '2px' }}>
              Developed by Justice Fosu (In Active Development)
            </p>
          </div>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link href="/legal/privacy" prefetch={false} className="az-label" style={{ color: 'var(--az-text-muted)', textDecoration: 'none' }}>Privacy</Link>
            <Link href="/legal/terms-of-service" prefetch={false} className="az-label" style={{ color: 'var(--az-text-muted)', textDecoration: 'none' }}>Terms</Link>
            <Link href="mailto:support@myazaa.com" className="az-label" style={{ color: 'var(--az-text-muted)', textDecoration: 'none' }}>Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
