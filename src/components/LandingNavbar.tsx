'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function LandingNavbar({ user, dashboardUrl = '/login' }: { user: any, dashboardUrl?: string }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Prevent scrolling when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; }
  }, [isMobileMenuOpen]);

  return (
    <>
      <nav className="v2-nav">
        <div className="v2-nav-inner">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Link href="/" className="v2-brand">MyAzaa</Link>
            <div className="v2-nav-links">
              <Link href="/creators" className="v2-nav-link active">Creators</Link>
              <Link href="/fundraisers" className="v2-nav-link">Causes</Link>
              <Link href="/how-it-works" className="v2-nav-link">How it Works</Link>
            </div>
          </div>
          <div className="v2-nav-actions">
            {user && (
              <Link href={dashboardUrl} className="v2-btn-outline v2-hidden-mobile">My Dashboard</Link>
            )}
            <button className="v2-mobile-menu" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              <span className="material-symbols-outlined">{isMobileMenuOpen ? 'close' : 'menu'}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div style={{
          position: 'fixed',
          top: '72px', 
          left: 0,
          right: 0,
          bottom: 0,
          background: '#fff',
          zIndex: 9999,
          padding: '32px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          overflowY: 'auto'
        }}>
          <Link href="/creators" onClick={() => setIsMobileMenuOpen(false)} style={{ fontSize: '24px', fontWeight: 600, color: 'var(--v2-primary)', textDecoration: 'none' }}>Creators</Link>
          <Link href="/fundraisers" onClick={() => setIsMobileMenuOpen(false)} style={{ fontSize: '24px', fontWeight: 600, color: 'var(--v2-primary)', textDecoration: 'none' }}>Causes</Link>
          <Link href="/how-it-works" onClick={() => setIsMobileMenuOpen(false)} style={{ fontSize: '24px', fontWeight: 600, color: 'var(--v2-primary)', textDecoration: 'none' }}>How it Works</Link>
          
          <div style={{ borderTop: '1px solid var(--v2-outline)', margin: '16px 0' }}></div>
          
          {user ? (
            <Link href={dashboardUrl} onClick={() => setIsMobileMenuOpen(false)} className="v2-btn-primary" style={{ textAlign: 'center', width: '100%', padding: '16px' }}>My Dashboard</Link>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)} className="v2-btn-primary" style={{ textAlign: 'center', width: '100%', padding: '16px' }}>Create Account</Link>
              <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="v2-btn-outline" style={{ textAlign: 'center', width: '100%', padding: '16px' }}>Log In</Link>
            </div>
          )}
        </div>
      )}
    </>
  );
}
