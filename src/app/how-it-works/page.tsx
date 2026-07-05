import Link from 'next/link';

export const metadata = {
  title: 'How it Works | MyAzaa',
  description: 'Learn how MyAzaa connects creators with fans through direct subscriptions, exclusive content, and powerful tools.',
};

export default function HowItWorksPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--v2-bg)', color: 'var(--v2-text)' }}>
      {/* Top Nav */}
      <header style={{ background: 'var(--v2-surface)', borderBottom: '1px solid var(--v2-outline)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <Link href="/" style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--v2-primary)', textDecoration: 'none' }}>MyAzaa</Link>
            <div className="v2-profile-nav-links">
              <Link href="/creators" style={{ color: 'var(--v2-text-variant)', fontSize: '14px', fontWeight: 500, textDecoration: 'none' }}>Discover</Link>
              <Link href="/how-it-works" style={{ color: 'var(--v2-primary)', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>How it Works</Link>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link href="/login" className="v2-btn v2-btn-secondary">Log in</Link>
            <Link href="/signup" className="v2-btn v2-btn-primary">Sign up</Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ padding: '80px 24px', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
        <h1 className="v2-dash-title" style={{ fontSize: '48px', marginBottom: '24px' }}>How MyAzaa Works</h1>
        <p style={{ fontSize: '20px', color: 'var(--v2-text-variant)', lineHeight: 1.6 }}>
          The premium platform bridging the gap between creators and their biggest fans. Whether you are here to monetize your passion or support the talent you love, everything you need is built right in.
        </p>
      </section>

      {/* Tracks Container */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px 120px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '48px' }}>
        
        {/* Creator Track */}
        <div className="v2-card" style={{ padding: '40px', background: 'linear-gradient(145deg, var(--v2-surface), var(--v2-surface-low))' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(255,107,107,0.1)', color: 'var(--v2-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '32px', fontVariationSettings: "'FILL' 1" }}>brush</span>
          </div>
          <h2 className="v2-dash-title" style={{ fontSize: '32px', marginBottom: '32px' }}>For Creators</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--v2-primary)', fontSize: '20px' }}>payments</span>
                Set Up Your Paywall
              </h3>
              <p style={{ color: 'var(--v2-text-variant)', fontSize: '15px', lineHeight: 1.6 }}>
                Define multiple subscription tiers with custom pricing in Naira. You have complete control over how much access costs, and fans can upgrade seamlessly using Paystack.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--v2-primary)', fontSize: '20px' }}>cloud_upload</span>
                Upload Exclusive Content
              </h3>
              <p style={{ color: 'var(--v2-text-variant)', fontSize: '15px', lineHeight: 1.6 }}>
                Upload high-quality photos and massive video files directly to our secure cloud infrastructure. Build a premium library of content for your true fans.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--v2-primary)', fontSize: '20px' }}>lock</span>
                Gated vs. Public Posts
              </h3>
              <p style={{ color: 'var(--v2-text-variant)', fontSize: '15px', lineHeight: 1.6 }}>
                Keep your feed dynamic. Publish public teaser posts to attract new followers, and lock your premium, high-value posts securely behind your subscription tiers.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--v2-primary)', fontSize: '20px' }}>monitoring</span>
                Track Your Success
              </h3>
              <p style={{ color: 'var(--v2-text-variant)', fontSize: '15px', lineHeight: 1.6 }}>
                Your Creator Dashboard provides real-time analytics. Track your active subscribers, monitor your Monthly Recurring Revenue (MRR) sparkline, and manage your payouts.
              </p>
            </div>
          </div>
        </div>

        {/* Fan Track */}
        <div className="v2-card" style={{ padding: '40px', background: 'linear-gradient(145deg, var(--v2-surface), var(--v2-surface-low))' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(56,189,248,0.1)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '32px', fontVariationSettings: "'FILL' 1" }}>favorite</span>
          </div>
          <h2 className="v2-dash-title" style={{ fontSize: '32px', marginBottom: '32px' }}>For Fans</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#38bdf8', fontSize: '20px' }}>travel_explore</span>
                Discover Talent
              </h3>
              <p style={{ color: 'var(--v2-text-variant)', fontSize: '15px', lineHeight: 1.6 }}>
                Browse the Discover directory to find your next favorite creator. Read their bios, view their public teasers, and see what premium content awaits.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#38bdf8', fontSize: '20px' }}>credit_card</span>
                Subscribe & Support
              </h3>
              <p style={{ color: 'var(--v2-text-variant)', fontSize: '15px', lineHeight: 1.6 }}>
                Choose a subscription tier that works for you and securely check out using Paystack. Your support directly funds the creative work you love.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#38bdf8', fontSize: '20px' }}>dynamic_feed</span>
                Your Personalized Feed
              </h3>
              <p style={{ color: 'var(--v2-text-variant)', fontSize: '15px', lineHeight: 1.6 }}>
                Once subscribed, your Fan Dashboard unlocks. We aggregate all the exclusive, premium posts from every creator you support into one seamless, ad-free feed.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#38bdf8', fontSize: '20px' }}>settings</span>
                Manage Everything
              </h3>
              <p style={{ color: 'var(--v2-text-variant)', fontSize: '15px', lineHeight: 1.6 }}>
                You are always in control. Keep track of your monthly spend and easily manage or cancel any active subscriptions directly from your dashboard.
              </p>
            </div>
          </div>
        </div>

      </div>
      
      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--v2-outline)', padding: '48px 24px', textAlign: 'center', color: 'var(--v2-text-variant)', fontSize: '14px' }}>
        <p>&copy; {new Date().getFullYear()} MyAzaa. All rights reserved.</p>
      </footer>
    </div>
  );
}
