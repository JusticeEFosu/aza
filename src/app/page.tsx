import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="auth-page" style={{ flexDirection: 'column', gap: '2rem' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 className="auth-logo" style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>Aza</h1>
        <p style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '1.25rem', 
          maxWidth: '500px', 
          margin: '0 auto 2.5rem',
          lineHeight: 1.6 
        }}>
          Support Nigerian creators you love with monthly subscriptions. Pay in naira, directly.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/signup" className="btn btn-primary btn-lg">
            Get Started
          </Link>
          <Link href="/creators" className="btn btn-secondary btn-lg">
            Browse Creators
          </Link>
        </div>
      </div>
    </div>
  );
}
