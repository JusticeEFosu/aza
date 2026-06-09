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

  // Fetch featured creators for the discovery section
  const { data: creators } = await supabase
    .from('creator_profiles')
    .select(`
      slug,
      bio,
      subscriber_count,
      profiles ( full_name, avatar_url )
    `)
    .order('subscriber_count', { ascending: false })
    .limit(6);

  return (
    <>
      {/* ─── Hero ─────────────────────────────────── */}
      <section className="landing-hero">
        <h1 className="fade-in">
          Support the creators<br />who inspire you.
        </h1>
        <p className="hero-tagline fade-in fade-in-delay-1">
          Support Nigerian creators you love with monthly subscriptions.
          Exclusive content, paid in naira, directly to their bank.
        </p>
        <div className="hero-actions fade-in fade-in-delay-2">
          {user ? (
            <Link href={dashboardUrl} className="btn btn-primary btn-lg">
              Go to My Dashboard
            </Link>
          ) : (
            <>
              <Link href="/signup" className="btn btn-primary btn-lg">
                Start Creating
              </Link>
              <Link href="/signup" className="btn btn-secondary btn-lg">
                Become a Fan
              </Link>
            </>
          )}
        </div>
      </section>

      {/* ─── How It Works ─────────────────────────── */}
      <section className="landing-section landing-section-alt">
        <h2>How It Works</h2>
        <p className="section-subtitle">
          Three simple steps to start earning or supporting.
        </p>
        <div className="steps-grid">
          <div className="glass-card step-card fade-in">
            <span className="step-number">1</span>
            <h3>Create Your Page</h3>
            <p>
              Sign up as a creator, set your subscription tiers, and 
              connect your Nigerian bank account for direct payouts.
            </p>
          </div>
          <div className="glass-card step-card fade-in fade-in-delay-1">
            <span className="step-number">2</span>
            <h3>Share Exclusive Content</h3>
            <p>
              Publish posts, images, and videos. Choose what is public 
              and what is reserved for your paying supporters.
            </p>
          </div>
          <div className="glass-card step-card fade-in fade-in-delay-2">
            <span className="step-number">3</span>
            <h3>Get Paid in Naira</h3>
            <p>
              Fans subscribe via Paystack. You receive 90% of every 
              payment, settled directly to your bank account.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Featured Creators ────────────────────── */}
      {creators && creators.length > 0 && (
        <section className="landing-section">
          <h2>Discover Creators</h2>
          <p className="section-subtitle">
            Find creators worth supporting on Aza.
          </p>
          <div className="creators-grid">
            {creators.map((creator: any) => {
              const name = creator.profiles?.full_name || 'Creator';
              return (
                <Link
                  key={creator.slug}
                  href={`/c/${creator.slug}`}
                  className="glass-card creator-card"
                >
                  <div className="creator-avatar" style={{ overflow: 'hidden' }}>
                    {creator.profiles?.avatar_url ? (
                      <img 
                        src={creator.profiles.avatar_url} 
                        alt="" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    ) : (
                      name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <h4>{name}</h4>
                  <p>{creator.bio || 'No bio yet.'}</p>
                  <span className="subscriber-count">
                    {creator.subscriber_count || 0} subscriber{creator.subscriber_count === 1 ? '' : 's'}
                  </span>
                </Link>
              );
            })}
          </div>
          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <Link href="/creators" className="btn btn-secondary">
              View All Creators
            </Link>
          </div>
        </section>
      )}

      {/* ─── CTA Banner ───────────────────────────── */}
      <section className="landing-section landing-section-alt" style={{ textAlign: 'center' }}>
        <h2>Ready to start?</h2>
        <p className="section-subtitle">
          Whether you create content or love supporting those who do, 
          Aza is built for you.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {user ? (
            <Link href={dashboardUrl} className="btn btn-primary btn-lg">
              Back to My Dashboard
            </Link>
          ) : (
            <>
              <Link href="/signup" className="btn btn-primary btn-lg">
                Join Aza Today
              </Link>
              <Link href="/login" className="btn btn-secondary btn-lg">
                Sign In
              </Link>
            </>
          )}
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────── */}
      <footer className="site-footer">
        <div className="footer-brand">Aza</div>
        <div className="footer-links">
          <Link href="/login">Sign In</Link>
          <Link href="/signup">Create Account</Link>
          <Link href="/creators">Discover</Link>
        </div>
        <p className="footer-copy">
          Aza. Support creators, pay in naira.
        </p>
      </footer>
    </>
  );
}
