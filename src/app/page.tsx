import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import LandingNavbar from '@/components/LandingNavbar';

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
      id,
      bio,
      cover_url,
      subscriber_count,
      profiles!inner ( full_name, display_name, avatar_url, is_suspended, admin_role ),
      subscription_tiers ( price )
    `)
    .eq('profiles.is_suspended', false)
    .is('profiles.admin_role', null)
    .order('subscriber_count', { ascending: false })
    .limit(4);

  const displayCreators = creators || [];

  return (
    <div style={{ background: 'var(--az-bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* TopNavBar Component */}
      <LandingNavbar user={user} dashboardUrl={dashboardUrl} />

      <main style={{ flexGrow: 1 }}>
        {/* Hero Section */}
        <section style={{ padding: '80px 0', borderBottom: '1px solid var(--az-border)', background: '#ffffff' }}>
          <div className="az-container" style={{ maxWidth: '840px', textAlign: 'center', margin: '0 auto' }}>
            <h1 className="az-h1" style={{ marginBottom: '20px' }}>
              Fund the creators who inspire you.
            </h1>
            <p className="az-body-lg" style={{ marginBottom: '32px', maxWidth: '640px', marginLeft: 'auto', marginRight: 'auto' }}>
              Join the community behind your favourite voices. Empowering Nigerian creativity and the voices that matter most to you.
            </p>
            
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {user ? (
                <>
                  <Link href={dashboardUrl} className="az-btn-primary" style={{ padding: '14px 28px' }}>
                    Go to Dashboard <span className="material-symbols-outlined" style={{ fontSize: '18px', marginLeft: '8px' }}>arrow_forward</span>
                  </Link>
                  <Link href="/fundraisers" className="az-btn-secondary" style={{ padding: '14px 28px' }}>
                    Explore Fundraisers
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/creators" className="az-btn-primary" style={{ padding: '14px 28px' }}>
                    Explore Creators
                  </Link>
                  <Link href="/fundraisers" className="az-btn-secondary" style={{ padding: '14px 28px' }}>
                    Explore Fundraisers
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Featured Creators */}
        {displayCreators.length > 0 && (
          <section style={{ padding: '80px 0', borderBottom: '1px solid var(--az-border)' }}>
            <div className="az-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
                <div>
                  <h2 className="az-h2">Trending Creators</h2>
                  <p className="az-body" style={{ color: 'var(--az-text-muted)', marginTop: '4px' }}>Discover top talent building their communities on MyAzaa.</p>
                </div>
                <Link href="/creators" className="az-label" style={{ color: 'var(--az-primary)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  View all creators &rarr;
                </Link>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '24px' }}>
                {displayCreators.map((creator: any) => {
                  const name = creator.display_name || creator.profiles?.display_name || creator.profiles?.full_name || 'Creator';

                  let displayPrice = 'Free';
                  const tiers = creator.subscription_tiers;
                  if (tiers && tiers.length > 0) {
                    const minAmount = Math.min(...tiers.map((t: any) => t.price));
                    displayPrice = `₦${(minAmount / 100).toLocaleString()}/mo`;
                  }

                  const subCount = creator.subscriber_count || 0;
                  const displaySubscribers = subCount > 999
                    ? (subCount / 1000).toFixed(1) + 'k'
                    : subCount;

                  return (
                    <Link key={creator.slug} href={`/c/${creator.slug}`} className="az-card az-card-interactive" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        {creator.profiles?.avatar_url ? (
                          <img src={creator.profiles.avatar_url} alt={name} style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--az-surface-low)', color: 'var(--az-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '20px' }}>
                            {name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h3 className="az-h3" style={{ fontSize: '18px' }}>{name}</h3>
                          <span style={{ display: 'inline-block', background: 'var(--az-surface-low)', color: 'var(--az-primary)', fontSize: '12px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', marginTop: '2px' }}>
                            {creator.category || 'Creator'}
                          </span>
                        </div>
                      </div>
                      <p className="az-body" style={{ fontSize: '14px', color: 'var(--az-text-muted)', flexGrow: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {creator.bio || 'No bio provided.'}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--az-border)' }}>
                        <span style={{ fontSize: '13px', color: 'var(--az-text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--az-primary)' }}>group</span> {displaySubscribers}
                        </span>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--az-primary)' }}>{displayPrice}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* How It Works Section */}
        <section style={{ padding: '80px 0', background: '#ffffff' }}>
          <div className="az-container">
            <div style={{ textAlign: 'center', marginBottom: '56px' }}>
              <h2 className="az-h2">How it Works</h2>
              <p className="az-body-lg" style={{ marginTop: '8px', maxWidth: '560px', marginLeft: 'auto', marginRight: 'auto' }}>
                Three simple steps to start monetizing your passion and connecting with your truest fans.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px' }}>
              <div className="az-card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: 'var(--az-radius-lg)', background: 'var(--az-surface-low)', color: 'var(--az-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>add_circle</span>
                </div>
                <h3 className="az-h3" style={{ marginBottom: '8px' }}>Create</h3>
                <p className="az-body" style={{ color: 'var(--az-text-muted)', fontSize: '15px' }}>
                  Set up your page in minutes. Define your subscription tiers and what exclusive value you offer.
                </p>
              </div>

              <div className="az-card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: 'var(--az-radius-lg)', background: 'var(--az-surface-low)', color: 'var(--az-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>share</span>
                </div>
                <h3 className="az-h3" style={{ marginBottom: '8px' }}>Share</h3>
                <p className="az-body" style={{ color: 'var(--az-text-muted)', fontSize: '15px' }}>
                  Promote your MyAzaa link across your social platforms. Invite your audience to join your inner circle.
                </p>
              </div>

              <div className="az-card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: 'var(--az-radius-lg)', background: 'var(--az-surface-low)', color: 'var(--az-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>payments</span>
                </div>
                <h3 className="az-h3" style={{ marginBottom: '8px' }}>Earn</h3>
                <p className="az-body" style={{ color: 'var(--az-text-muted)', fontSize: '15px' }}>
                  Get paid directly to your local bank account. Fast payouts, transparent fees, built for Nigeria.
                </p>
              </div>
            </div>

            <div style={{ marginTop: '48px', textAlign: 'center' }}>
              <Link href="/signup" className="az-btn-primary" style={{ padding: '16px 36px', fontSize: '16px' }}>
                Create Your Page Now
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer Component */}
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
            <span style={{ fontSize: '13px', color: 'var(--az-primary)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>lock</span> Secured by Paystack
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
