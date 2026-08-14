'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/update-password`,
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="v3-auth-page">
      <main className="v3-auth-main">
        <header className="v3-auth-header">
          <Link href="/" style={{ textDecoration: 'none' }}>
            <h1 className="v3-auth-logo">MyAzaa</h1>
          </Link>
        </header>

        <div className="v3-auth-card">
          <div className="v3-auth-tabs">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#201a1b', margin: '0 auto' }}>Reset Password</h2>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1.25rem', backgroundColor: '#ffdad6', color: '#ba1a1a', border: '1px solid #ba1a1a', borderRadius: '8px', padding: '12px' }}>
              {error}
            </div>
          )}

          {success ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#d3e3fd', color: '#0b57d0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>mark_email_read</span>
              </div>
              <h3 style={{ fontSize: '1.125rem', color: '#201a1b', marginBottom: '0.5rem' }}>Check your email</h3>
              <p style={{ color: '#4c4546', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                We've sent a password reset link to <strong>{email}</strong>.
              </p>
              <Link href="/login" className="v3-auth-btn" style={{ textDecoration: 'none', display: 'inline-block', textAlign: 'center' }}>
                Back to Log In
              </Link>
            </div>
          ) : (
            <>
              <p style={{ color: '#4c4546', fontSize: '0.875rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                Enter your email address and we'll send you a link to reset your password.
              </p>
              <form onSubmit={handleResetPassword} className="v3-auth-form">
                <div className="v3-form-group">
                  <label htmlFor="email" className="v3-form-label">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    className="v3-form-input"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="v3-auth-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner" style={{ marginRight: '8px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }}></span>
                      Sending link...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>
              
              <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <Link href="/login" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#4c4546', textDecoration: 'underline' }}>
                  Back to Log In
                </Link>
              </div>
            </>
          )}

          <footer className="v3-auth-footer">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: '16px' }}>lock</span>
            <span className="v3-auth-footer-text">Secured by Paystack</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
