import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
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

  // Fetch actual real creators from the database
  const { data: creators } = await supabase
    .from('creator_profiles')
    .select(`
      slug,
      bio,
      display_name,
      subscriber_count,
      profiles!inner ( full_name, display_name, avatar_url, is_suspended, is_admin ),
      tiers ( amount )
    `)
    .eq('profiles.is_suspended', false)
    .eq('profiles.is_admin', false)
    .order('subscriber_count', { ascending: false })
    .limit(4);

  const displayCreators = creators || [];

  return (
    <div className="landing-v2">
      {/* TopNavBar Component */}
      <nav className="v2-nav">
        <div className="v2-nav-inner">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Link href="/" className="v2-brand">MyAzaa</Link>
            <div className="v2-nav-links">
              <Link href="/creators" className="v2-nav-link active">Discover</Link>
              <Link href="/how-it-works" className="v2-nav-link">How it Works</Link>
            </div>
          </div>
          <div className="v2-nav-actions">
            {user ? (
              <Link href={dashboardUrl} className="v2-btn-outline v2-hidden-mobile">My Dashboard</Link>
            ) : (
              <Link href="/login" className="v2-btn-outline v2-hidden-mobile">Log In</Link>
            )}
            <Link href="/signup" className="v2-btn-primary">Create Account</Link>
            <button className="v2-mobile-menu">
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="v2-main">
        {/* Hero Section */}
        <section className="v2-section v2-border-b v2-hero">
          <div className="v2-hero-content">
            <h1 className="v2-hero-title">
              Fund the creators who inspire you.
            </h1>
            <p className="v2-hero-desc">
              Join the community behind your favorite voices. Empowering Nigerian creativity and the voices that matter most to you.
            </p>
          </div>
          <div className="v2-hero-actions">
            <Link href="/signup" className="v2-btn-primary lg">
              Create Account <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
            </Link>
            <Link href="/creators" className="v2-btn-outline lg">
              Explore Creators
            </Link>
          </div>
        </section>

        {/* Featured Creators */}
        {displayCreators.length > 0 && (
          <section className="v2-section v2-border-b">
            <div className="v2-section-header">
              <div>
                <h2 className="v2-section-title">Trending Creators</h2>
                <p className="v2-section-desc">Discover top talent building their communities on MyAzaa.</p>
              </div>
              <Link href="/creators" className="v2-view-all">View all creators</Link>
            </div>

            <div className="v2-creators-grid">
              {displayCreators.map((creator: any) => {
                const name = creator.display_name || creator.profiles?.display_name || creator.profiles?.full_name || 'Creator';

                // Calculate dynamic price strictly based on DB minimum tier
                let displayPrice = 'Free';
                if (creator.tiers && creator.tiers.length > 0) {
                  const minAmount = Math.min(...creator.tiers.map((t: any) => t.amount));
                  displayPrice = `₦${(minAmount / 100).toLocaleString()}/mo`;
                }

                // Format subscribers (e.g. 1.2k)
                const subCount = creator.subscriber_count || 0;
                const displaySubscribers = subCount > 999
                  ? (subCount / 1000).toFixed(1) + 'k'
                  : subCount;

                return (
                  <Link key={creator.slug} href={`/c/${creator.slug}`} className="v2-creator-card">
                    <div className="v2-card-line"></div>
                    <div className="v2-creator-header">
                      {creator.profiles?.avatar_url ? (
                        <img src={creator.profiles.avatar_url} alt={name} className="v2-creator-avatar" />
                      ) : (
                        <div className="v2-creator-avatar">{name.charAt(0).toUpperCase()}</div>
                      )}
                      <div>
                        <h3 className="v2-creator-name">{name}</h3>
                        <p className="v2-creator-category">{creator.category || 'Creator'}</p>
                      </div>
                    </div>
                    <p className="v2-creator-bio">{creator.bio}</p>
                    <div className="v2-creator-footer">
                      <span className="v2-creator-stats">
                        <span className="material-symbols-outlined">group</span> {displaySubscribers}
                      </span>
                      <span className="v2-creator-price">{displayPrice}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
            <Link href="/creators" className="v2-mobile-all-btn">View all creators</Link>
          </section>
        )}

        {/* How It Works Section */}
        <section className="v2-section v2-bg-lowest">
          <div className="v2-center-content">
            <h2 className="v2-section-title">How it Works</h2>
            <p className="v2-subtitle-center">
              Three simple steps to start monetizing your passion and connecting with your truest fans.
            </p>
          </div>

          <div className="v2-steps-grid">
            <div className="v2-step-line"></div>

            <div className="v2-step">
              <div className="v2-step-icon">
                <span className="material-symbols-outlined">add_circle</span>
              </div>
              <h3 className="v2-step-title">Create</h3>
              <p className="v2-step-desc">Set up your page in minutes. Define your subscription tiers and what exclusive value you offer.</p>
            </div>

            <div className="v2-step">
              <div className="v2-step-icon">
                <span className="material-symbols-outlined">share</span>
              </div>
              <h3 className="v2-step-title">Share</h3>
              <p className="v2-step-desc">Promote your MyAzaa link across your social platforms. Invite your audience to join your inner circle.</p>
            </div>

            <div className="v2-step">
              <div className="v2-step-icon">
                <span className="material-symbols-outlined">payments</span>
              </div>
              <h3 className="v2-step-title">Earn</h3>
              <p className="v2-step-desc">Get paid directly to your local bank account. Fast payouts, transparent fees, built for Nigeria.</p>
            </div>
          </div>

          <div className="v2-cta-wrapper">
            <Link href="/signup" className="v2-btn-primary lg" style={{ display: 'inline-flex' }}>
              Create Your Page Now
            </Link>
          </div>
        </section>
      </main>

      {/* Footer Component */}
      <footer className="v2-footer">
        <div className="v2-footer-inner">
          <div className="v2-footer-left">
            <Link href="/" className="v2-footer-brand">MyAzaa</Link>
            <p className="v2-footer-copy" style={{ marginBottom: '4px' }}>© {new Date().getFullYear()} MyAzaa. Built for Nigerian Creators.</p>
            <p style={{ fontSize: '13px', color: 'var(--v2-text-variant)', fontWeight: 500, margin: 0 }}>Developed by Justice Fosu (In Active Development)</p>
          </div>
          <div className="v2-footer-links">
            <Link href="/legal/privacy" className="v2-footer-link">Privacy</Link>
            <Link href="/legal/terms-of-service" className="v2-footer-link">Terms</Link>
            <Link href="mailto:support@myazaa.com" className="v2-footer-link">Support</Link>
            <span className="v2-secure">
              <span className="material-symbols-outlined">lock</span> Secured by Paystack
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
