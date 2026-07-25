import Link from 'next/link';
import LandingNavbar from '@/components/LandingNavbar';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'How it Works | MyAzaa',
  description: 'Learn how MyAzaa connects creators with fans through direct subscriptions, exclusive content, and powerful tools.',
};

export default async function HowItWorksPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  let dashboardUrl = '/login';
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    dashboardUrl = profile?.role === 'creator' ? '/creator' : '/fan';
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9ff', color: '#0b1c30' }}>
      <LandingNavbar user={user} dashboardUrl={dashboardUrl} />

      {/* Hero Section */}
      <section style={{ padding: '120px 24px 60px 24px', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '48px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 800, color: '#0b1c30', letterSpacing: '-0.03em', marginBottom: '24px' }}>How MyAzaa Works</h1>
        <p style={{ fontSize: '18px', fontFamily: 'var(--font-body, Inter, sans-serif)', color: '#3f4943', lineHeight: 1.6, margin: 0 }}>
          The premium platform bridging the gap between creators and their biggest fans. Whether you are here to monetize your passion or support the talent you love, everything you need is built right in.
        </p>
      </section>

      {/* Tracks Container */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px 120px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '48px' }}>
        
        {/* Creator Track */}
        <div style={{ padding: '40px', background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: '#ecfdf5', color: '#004e34', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>brush</span>
          </div>
          <h2 style={{ fontSize: '28px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 800, color: '#0b1c30', marginBottom: '32px' }}>For Creators</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#004e34', fontSize: '20px' }}>payments</span>
                Set Up Your Paywall
              </h3>
              <p style={{ color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '15px', lineHeight: 1.6, margin: 0 }}>
                Define multiple subscription tiers with custom pricing in Naira. You have complete control over how much access costs, and fans can upgrade seamlessly using Paystack.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: '18px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#004e34', fontSize: '20px' }}>cloud_upload</span>
                Upload Exclusive Content
              </h3>
              <p style={{ color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '15px', lineHeight: 1.6, margin: 0 }}>
                Upload high-quality photos and massive video files directly to our secure cloud infrastructure. Build a premium library of content for your true fans.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: '18px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#004e34', fontSize: '20px' }}>lock</span>
                Gated vs. Public Posts
              </h3>
              <p style={{ color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '15px', lineHeight: 1.6, margin: 0 }}>
                Keep your feed dynamic. Publish public teaser posts to attract new followers, and lock your premium, high-value posts securely behind your subscription tiers.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: '18px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#004e34', fontSize: '20px' }}>monitoring</span>
                Track Your Success
              </h3>
              <p style={{ color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '15px', lineHeight: 1.6, margin: 0 }}>
                Your Creator Dashboard provides real-time analytics. Track your active subscribers, monitor your Monthly Recurring Revenue (MRR) sparkline, and manage your payouts.
              </p>
            </div>
          </div>
        </div>

        {/* Fan Track */}
        <div style={{ padding: '40px', background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: '#eff4ff', color: '#004e34', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>favorite</span>
          </div>
          <h2 style={{ fontSize: '28px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 800, color: '#0b1c30', marginBottom: '32px' }}>For Fans</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#004e34', fontSize: '20px' }}>travel_explore</span>
                Discover Talent
              </h3>
              <p style={{ color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '15px', lineHeight: 1.6, margin: 0 }}>
                Browse the Discover directory to find your next favorite creator. Read their bios, view their public teasers, and see what premium content awaits.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: '18px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#004e34', fontSize: '20px' }}>credit_card</span>
                Subscribe & Support
              </h3>
              <p style={{ color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '15px', lineHeight: 1.6, margin: 0 }}>
                Choose a subscription tier that works for you and securely check out using Paystack. Your support directly funds the creative work you love.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: '18px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#004e34', fontSize: '20px' }}>dynamic_feed</span>
                Your Personalized Feed
              </h3>
              <p style={{ color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '15px', lineHeight: 1.6, margin: 0 }}>
                Once subscribed, your Fan Dashboard unlocks. We aggregate all the exclusive, premium posts from every creator you support into one seamless, ad-free feed.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: '18px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#004e34', fontSize: '20px' }}>settings</span>
                Manage Everything
              </h3>
              <p style={{ color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '15px', lineHeight: 1.6, margin: 0 }}>
                You are always in control. Keep track of your monthly spend and easily manage or cancel any active subscriptions directly from your dashboard.
              </p>
            </div>
          </div>
        </div>

      </div>
      
      {/* Footer */}
      <footer style={{ background: '#ffffff', borderTop: '1px solid #E2E8F0', padding: '32px 24px', textAlign: 'center', color: '#6f7a72', fontSize: '14px', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
        <p style={{ margin: 0 }}>&copy; {new Date().getFullYear()} MyAzaa. All rights reserved.</p>
      </footer>
    </div>
  );
}
