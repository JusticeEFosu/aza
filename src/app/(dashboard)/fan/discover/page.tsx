import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import CreatorsGrid from '@/components/CreatorsGrid';
import MobileNav from '@/components/MobileNav';

export default async function FanDiscoverPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'fan') redirect('/creator');

  const { data: creators } = await supabase
    .from('creator_profiles')
    .select(`
      slug,
      bio,
      subscriber_count,
      display_name,
      profiles ( full_name, avatar_url )
    `)
    .order('subscriber_count', { ascending: false });

  return (
    <div className="v2-fan-dashboard">
      <nav className="v2-sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 8px', marginBottom: '16px' }}>
          <span className="v2-dash-title" style={{ fontSize: '24px' }}>Aza</span>
        </div>
        
        <div className="v2-nav-list" style={{ marginTop: 0 }}>
          <Link href="/fan" className="v2-nav-item">
            <span className="material-symbols-outlined">home</span>
            Dashboard
          </Link>
          <Link href="/fan/discover" className="v2-nav-item active">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
            Discover Creators
          </Link>
          <Link href="/fan#feed" className="v2-nav-item">
            <span className="material-symbols-outlined">dynamic_feed</span>
            Feed
          </Link>
          <Link href="/fan/settings" className="v2-nav-item">
            <span className="material-symbols-outlined">settings</span>
            Settings
          </Link>
        </div>

        <div className="v2-sidebar-footer">
          <Link href="#" className="v2-nav-item">
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
      </nav>

      {/* Mobile Top Bar & Drawer */}
      <MobileNav role="fan" />

      <main className="v2-fan-main">
        <div className="v2-fan-container">
          <header style={{ marginBottom: '32px' }}>
            <h1 className="v2-dash-title">Discover Creators</h1>
            <p className="v2-dash-desc">Find your next favorite creator on Aza.</p>
          </header>

          <CreatorsGrid creators={creators || []} />
        </div>
      </main>
    </div>
  );
}
