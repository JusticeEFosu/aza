'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function LandingNavbar({ user, dashboardUrl = '/login' }: { user: any; dashboardUrl?: string }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Prevent scrolling when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMobileMenuOpen]);

  return (
    <>
      <nav style={{ background: '#ffffff', borderBottom: '1px solid var(--az-border)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="az-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '80px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <Link href="/" style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', fontWeight: 800, color: 'var(--az-primary)', textDecoration: 'none', letterSpacing: '-0.02em' }}>
              MyAzaa
            </Link>
            <div className="v2-nav-links" style={{ gap: '24px', alignItems: 'center' }}>
              <Link 
                href="/creators" 
                style={{ 
                  fontFamily: 'var(--font-body)', 
                  fontSize: '15px', 
                  fontWeight: pathname === '/creators' ? 600 : 500, 
                  color: pathname === '/creators' ? 'var(--az-primary)' : 'var(--az-text-muted)', 
                  textDecoration: 'none',
                  borderBottom: pathname === '/creators' ? '2px solid var(--az-primary)' : 'none',
                  paddingBottom: '4px'
                }}
              >
                Creators
              </Link>
              <Link 
                href="/fundraisers" 
                style={{ 
                  fontFamily: 'var(--font-body)', 
                  fontSize: '15px', 
                  fontWeight: pathname === '/fundraisers' ? 600 : 500, 
                  color: pathname === '/fundraisers' ? 'var(--az-primary)' : 'var(--az-text-muted)', 
                  textDecoration: 'none',
                  borderBottom: pathname === '/fundraisers' ? '2px solid var(--az-primary)' : 'none',
                  paddingBottom: '4px'
                }}
              >
                Fundraisers
              </Link>
              <Link 
                href="/how-it-works" 
                style={{ 
                  fontFamily: 'var(--font-body)', 
                  fontSize: '15px', 
                  fontWeight: pathname === '/how-it-works' ? 600 : 500, 
                  color: pathname === '/how-it-works' ? 'var(--az-primary)' : 'var(--az-text-muted)', 
                  textDecoration: 'none',
                  borderBottom: pathname === '/how-it-works' ? '2px solid var(--az-primary)' : 'none',
                  paddingBottom: '4px'
                }}
              >
                How it Works
              </Link>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {user ? (
              <Link href={dashboardUrl} className="az-btn-secondary v2-hidden-mobile" style={{ padding: '8px 18px', fontSize: '14px' }}>
                My Dashboard
              </Link>
            ) : (
              <div className="v2-hidden-mobile" style={{ display: 'flex', gap: '12px' }}>
                <Link href="/login" className="az-btn-secondary" style={{ padding: '8px 18px', fontSize: '14px' }}>
                  Log In
                </Link>
                <Link href="/signup" className="az-btn-primary" style={{ padding: '8px 18px', fontSize: '14px' }}>
                  Create Account
                </Link>
              </div>
            )}
            <button
              className="v2-mobile-menu"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle Menu"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--az-text-main)', padding: '8px' }}
            >
              <span className="material-symbols-outlined">{isMobileMenuOpen ? 'close' : 'menu'}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div style={{
          position: 'fixed',
          top: '80px',
          left: 0,
          right: 0,
          bottom: 0,
          background: 'var(--az-bg)',
          zIndex: 9999,
          padding: '32px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          overflowY: 'auto'
        }}>
          <Link href="/creators" onClick={() => setIsMobileMenuOpen(false)} style={{ fontSize: '20px', fontWeight: 600, color: 'var(--az-text-main)', textDecoration: 'none' }}>Creators</Link>
          <Link href="/fundraisers" onClick={() => setIsMobileMenuOpen(false)} style={{ fontSize: '20px', fontWeight: 600, color: 'var(--az-text-main)', textDecoration: 'none' }}>Fundraisers</Link>
          <Link href="/how-it-works" onClick={() => setIsMobileMenuOpen(false)} style={{ fontSize: '20px', fontWeight: 600, color: 'var(--az-text-main)', textDecoration: 'none' }}>How it Works</Link>

          <div style={{ borderTop: '1px solid var(--az-border)', margin: '12px 0' }}></div>

          {user ? (
            <Link href={dashboardUrl} onClick={() => setIsMobileMenuOpen(false)} className="az-btn-primary" style={{ textAlign: 'center', width: '100%', padding: '14px' }}>
              My Dashboard
            </Link>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)} className="az-btn-primary" style={{ textAlign: 'center', width: '100%', padding: '14px' }}>
                Create Account
              </Link>
              <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="az-btn-secondary" style={{ textAlign: 'center', width: '100%', padding: '14px' }}>
                Log In
              </Link>
            </div>
          )}
        </div>
      )}
    </>
  );
}
