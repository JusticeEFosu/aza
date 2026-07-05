import Link from 'next/link';

export const metadata = {
  title: 'Account Suspended | MyAzaa',
  description: 'Your account has been suspended.',
};

export default function SuspendedPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--v2-bg)', padding: '24px' }}>
      <div className="v2-card" style={{ maxWidth: '480px', width: '100%', padding: '40px', textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#ffdad6', color: '#ba1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>block</span>
        </div>
        
        <h1 className="v2-dash-title" style={{ fontSize: '24px', marginBottom: '16px' }}>Account Suspended</h1>
        
        <p style={{ color: 'var(--v2-text-variant)', lineHeight: 1.6, marginBottom: '32px' }}>
          Your access to MyAzaa has been suspended due to a violation of our Terms of Service or suspicious activity. If you believe this was a mistake, please contact our support team to appeal this decision.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <a href="mailto:support@myazaa.com" className="v2-btn v2-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            Contact Support
          </a>
          
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="v2-btn v2-btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
