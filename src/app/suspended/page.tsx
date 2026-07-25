import Link from 'next/link';

export const metadata = {
  title: 'Account Suspended | MyAzaa',
  description: 'Your account has been suspended.',
};

export default function SuspendedPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--az-bg, #f8f9ff)', padding: '24px' }}>
      <div className="az-card" style={{ maxWidth: '480px', width: '100%', padding: '40px', textAlign: 'center', background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#ffdad6', color: '#ba1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>block</span>
        </div>
        
        <h1 style={{ fontSize: '28px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 800, color: '#0b1c30', marginBottom: '16px' }}>Account Suspended</h1>
        
        <p style={{ color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '15px', lineHeight: 1.6, marginBottom: '32px' }}>
          Your access to MyAzaa has been suspended due to a violation of our Terms of Service or suspicious activity. If you believe this was a mistake, please contact our support team to appeal this decision.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <a href="mailto:support@myazaa.com" className="az-btn-primary" style={{ width: '100%', textAlign: 'center', padding: '12px', fontSize: '15px', textDecoration: 'none' }}>
            Contact Support
          </a>
          
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="az-btn-secondary" style={{ width: '100%', padding: '12px', fontSize: '15px' }}>
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
