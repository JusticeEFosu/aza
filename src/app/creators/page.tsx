import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import CreatorsGrid from '@/components/CreatorsGrid';

export default async function CreatorsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: creators } = await supabase
    .from('creator_profiles')
    .select(`
      slug,
      bio,
      subscriber_count,
      display_name,
      profiles!inner ( full_name, avatar_url, is_suspended, is_admin )
    `)
    .eq('profiles.is_suspended', false)
    .eq('profiles.is_admin', false)
    .order('subscriber_count', { ascending: false });

  return (
    <div className="v2-profile-page">
      {/* TopNavBar */}
      <nav className="v2-profile-nav">
        <div className="v2-profile-nav-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <Link href="/" style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--v2-primary)', textDecoration: 'none' }}>MyAzaa</Link>
            <div className="v2-profile-nav-links">
              <Link href="/creators" style={{ color: 'var(--v2-primary)', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>Discover</Link>
              <Link href="#" style={{ color: 'var(--v2-text-variant)', fontSize: '14px', fontWeight: 500, textDecoration: 'none' }}>How it Works</Link>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {!user ? (
              <>
                <Link href="/login" className="v2-profile-nav-links" style={{ color: 'var(--v2-text-variant)', fontSize: '14px', fontWeight: 500, textDecoration: 'none' }}>Log In</Link>
                <Link href="/signup" className="v2-sub-btn v2-sub-btn-primary" style={{ padding: '8px 24px', fontSize: '14px' }}>Start Creating</Link>
              </>
            ) : (
              <Link href="/fan" className="v2-sub-btn v2-sub-btn-secondary" style={{ padding: '8px 24px', fontSize: '14px' }}>Dashboard</Link>
            )}
          </div>
        </div>
      </nav>

      <main style={{ width: '100%', paddingBottom: '64px' }}>
        <div className="v2-profile-container" style={{ paddingTop: '64px' }}>

          <header style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h1 className="v2-profile-name" style={{ fontSize: '48px', marginBottom: '16px' }}>Discover Creators</h1>
            <p className="v2-profile-bio" style={{ margin: '0 auto', maxWidth: '600px', fontSize: '18px' }}>
              Browse the best creators on Aza and find someone worth supporting. Search by name or category to find your next favorite creator.
            </p>
          </header>

          <CreatorsGrid creators={creators || []} />

        </div>
      </main>

      {/* Footer */}
      <footer className="v2-profile-footer">
        <div className="v2-profile-footer-inner">
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)', lineHeight: '1.5' }}>
              © {new Date().getFullYear()} MyAzaa. Built for Nigerian Creators.<br/>
              <span style={{ fontWeight: 500 }}>Developed by Justice Fosu (In Active Development)</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '24px', fontSize: '12px', fontWeight: 600 }}>
            <Link href="/" style={{ color: 'var(--v2-text-variant)', textDecoration: 'none' }}>Privacy</Link>
            <Link href="/" style={{ color: 'var(--v2-text-variant)', textDecoration: 'none' }}>Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
