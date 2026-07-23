import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import FundraisersEditorialGrid from '@/components/FundraisersEditorialGrid';

export default async function FundraisersDirectoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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
    <div className="v2-profile-page">
      {/* TopNavBar */}
      <nav className="v2-profile-nav">
        <div className="v2-profile-nav-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <Link href="/" style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--v2-primary)', textDecoration: 'none' }}>MyAzaa</Link>
            <div className="v2-profile-nav-links">
              <Link href="/creators" style={{ color: 'var(--v2-text-variant)', fontSize: '14px', fontWeight: 500, textDecoration: 'none' }}>Creators</Link>
              <Link href="/fundraisers" style={{ color: 'var(--v2-primary)', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>Causes</Link>
              <Link href="/how-it-works" style={{ color: 'var(--v2-text-variant)', fontSize: '14px', fontWeight: 500, textDecoration: 'none' }}>How it Works</Link>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {!user ? (
              <>
                <Link href="/login" className="v2-profile-nav-links" style={{ color: 'var(--v2-text-variant)', fontSize: '14px', fontWeight: 500, textDecoration: 'none' }}>Log In</Link>
                <Link href="/signup" className="v2-sub-btn v2-sub-btn-primary" style={{ padding: '8px 24px', fontSize: '14px' }}>Start a Cause</Link>
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
            <h1 className="v2-profile-name" style={{ fontSize: '48px', marginBottom: '16px' }}>Discover Causes</h1>
            <p className="v2-profile-bio" style={{ margin: '0 auto', maxWidth: '600px', fontSize: '18px' }}>
              Explore and fund meaningful projects, medical needs, and creative endeavors brought to life by the MyAzaa community.
            </p>
          </header>

          <FundraisersEditorialGrid initialFundraisers={fundraisers || []} />

        </div>
      </main>
    </div>
  );
}
