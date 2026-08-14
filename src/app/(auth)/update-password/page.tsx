'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password should be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        setError(updateError.message);
      } else {
        await supabase.auth.signOut();
        setSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 3000);
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
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#201a1b', margin: '0 auto' }}>Update Password</h2>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1.25rem', backgroundColor: '#ffdad6', color: '#ba1a1a', border: '1px solid #ba1a1a', borderRadius: '8px', padding: '12px' }}>
              {error}
            </div>
          )}

          {success ? (
             <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#d3e3fd', color: '#0b57d0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>check_circle</span>
              </div>
              <h3 style={{ fontSize: '1.125rem', color: '#201a1b', marginBottom: '0.5rem' }}>Password updated</h3>
              <p style={{ color: '#4c4546', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Your password has been changed successfully. Redirecting you to login...
              </p>
              <Link href="/login" className="v3-auth-btn" style={{ textDecoration: 'none', display: 'inline-block', textAlign: 'center' }}>
                Go to Log In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleUpdatePassword} className="v3-auth-form">
              <div className="v3-form-group">
                <label htmlFor="password" className="v3-form-label">New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="v3-form-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingRight: '4rem' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#4c4546',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: 600
                    }}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="v3-form-group">
                <label htmlFor="confirmPassword" className="v3-form-label">Confirm New Password</label>
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  className="v3-form-input"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </button>
            </form>
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
