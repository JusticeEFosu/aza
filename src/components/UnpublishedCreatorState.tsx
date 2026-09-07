import Link from 'next/link';

interface UnpublishedPageProps {
  displayName: string;
  avatarUrl?: string | null;
}

export default function UnpublishedCreatorState({ displayName, avatarUrl }: UnpublishedPageProps) {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'var(--v2-surface-lowest, #f8f9ff)', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      textAlign: 'center',
      fontFamily: 'var(--font-body, Inter, sans-serif)'
    }}>
      {/* Brand Header */}
      <div style={{ marginBottom: '40px' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ 
            fontSize: '32px', 
            fontWeight: 800, 
            letterSpacing: '-0.02em', 
            color: 'var(--v2-primary, #004e34)', 
            fontFamily: 'var(--font-heading, Montserrat, sans-serif)' 
          }}>
            MyAzaa
          </span>
        </Link>
      </div>

      {/* Card */}
      <div style={{ 
        background: '#ffffff', 
        borderRadius: '20px', 
        border: '1px solid #E2E8F0', 
        padding: '48px 32px', 
        maxWidth: '480px', 
        width: '100%',
        boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        {/* Avatar or Placeholder */}
        <div style={{ position: 'relative', marginBottom: '24px' }}>
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt={displayName} 
              style={{ 
                width: '88px', 
                height: '88px', 
                borderRadius: '50%', 
                objectFit: 'cover',
                border: '3px solid #f1f5f9'
              }} 
            />
          ) : (
            <div style={{ 
              width: '88px', 
              height: '88px', 
              borderRadius: '50%', 
              background: '#eff4ff', 
              color: 'var(--v2-primary, #004e34)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontSize: '32px',
              fontWeight: 700
            }}>
              {displayName ? displayName.charAt(0).toUpperCase() : 'C'}
            </div>
          )}
          
          <span 
            className="material-symbols-outlined" 
            style={{ 
              position: 'absolute', 
              bottom: '-4px', 
              right: '-4px', 
              background: '#fed65b', 
              color: '#745c00', 
              borderRadius: '50%', 
              padding: '6px', 
              fontSize: '18px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
            }}
          >
            construction
          </span>
        </div>

        <h1 style={{ 
          fontSize: '24px', 
          fontWeight: 700, 
          color: '#0b1c30', 
          margin: '0 0 12px 0',
          fontFamily: 'var(--font-heading, Montserrat, sans-serif)'
        }}>
          {displayName ? `${displayName} is still setting up` : 'This creator is still setting up'}
        </h1>

        <p style={{ 
          fontSize: '15px', 
          lineHeight: '1.6', 
          color: '#6f7a72', 
          margin: '0 0 32px 0' 
        }}>
          This page hasn't been published yet. The creator is currently putting the finishing touches on their profile, perks, and tiers. Check back soon!
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
          <Link 
            href="/creators" 
            style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '14px 24px', 
              background: 'var(--v2-primary, #004e34)', 
              color: '#ffffff', 
              borderRadius: '10px', 
              fontSize: '15px', 
              fontWeight: 600, 
              textDecoration: 'none',
              fontFamily: 'var(--font-heading, Montserrat, sans-serif)',
              transition: 'all 0.2s ease'
            }}
          >
            Explore Other Creators
          </Link>

          <Link 
            href="/" 
            style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 24px', 
              color: '#6f7a72', 
              fontSize: '14px', 
              fontWeight: 500, 
              textDecoration: 'none'
            }}
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
