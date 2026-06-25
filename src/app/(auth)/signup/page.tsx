'use client';

import { Suspense, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const initialRole = searchParams.get('role') === 'creator' ? 'creator' : 'fan';

  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'fan' | 'creator'>(initialRole);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const supabase = createClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            display_name: displayName || fullName,
            role: role,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      // 1. If redirect param exists, use it
      if (redirect) {
        router.push(redirect);
      } 
      // 2. Otherwise default to role-based dashboard
      else if (role === 'creator') {
        router.push('/creator');
      } else {
        router.push('/fan');
      }
      
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="v3-auth-main">
      <header className="v3-auth-header">
        <Link href="/" style={{ textDecoration: 'none' }}>
          <h1 className="v3-auth-logo">MyAzaa</h1>
        </Link>
      </header>

      <div className="v3-auth-card">
        <div className="v3-auth-tabs">
          <Link href={`/login${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`} className="v3-auth-tab">Log In</Link>
          <Link href="/signup" className="v3-auth-tab active">Sign Up</Link>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1.25rem', backgroundColor: '#ffdad6', color: '#ba1a1a', border: '1px solid #ba1a1a', borderRadius: '8px', padding: '12px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="v3-auth-form">
          {/* Role Selection */}
          <div className="v3-form-group">
            <label className="v3-form-label">I am a...</label>
            <div className="v3-role-selector">
              <button
                type="button"
                className={`v3-role-option ${role === 'creator' ? 'active' : ''}`}
                onClick={() => setRole('creator')}
              >
                <div className="v3-role-content">
                  <span className="v3-role-title">Creator</span>
                  <span className="v3-role-desc">Earn from my audience</span>
                </div>
              </button>
              <button
                type="button"
                className={`v3-role-option ${role === 'fan' ? 'active' : ''}`}
                onClick={() => setRole('fan')}
              >
                <div className="v3-role-content">
                  <span className="v3-role-title">Fan</span>
                  <span className="v3-role-desc">Support creators I love</span>
                </div>
              </button>
            </div>
          </div>

          {/* Full Name */}
          <div className="v3-form-group">
            <label htmlFor="fullName" className="v3-form-label">Full Name (Legal)</label>
            <input
              id="fullName"
              type="text"
              className="v3-form-input"
              placeholder="Enter your legal full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          {/* Display Name */}
          <div className="v3-form-group">
            <label htmlFor="displayName" className="v3-form-label">Display Name / Username</label>
            <input
              id="displayName"
              type="text"
              className="v3-form-input"
              placeholder="e.g. SuperFan99"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          {/* Email */}
          <div className="v3-form-group">
            <label htmlFor="email" className="v3-form-label">Email</label>
            <input
              id="email"
              type="email"
              className="v3-form-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password */}
          <div className="v3-form-group">
            <label htmlFor="password" className="v3-form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="v3-form-input"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
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

          {/* Submit */}
          <button
            type="submit"
            className="v3-auth-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ marginRight: '8px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }}></span>
                Creating account...
              </>
            ) : (
              `Sign up as ${role === 'creator' ? 'a Creator' : 'a Fan'}`
            )}
          </button>
        </form>

        <footer className="v3-auth-footer">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: '16px' }}>lock</span>
          <span className="v3-auth-footer-text">Secured by Paystack</span>
        </footer>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <div className="v3-auth-page">
      <Suspense fallback={
        <div className="v3-auth-main" style={{ textAlign: 'center' }}>
          <span className="spinner" style={{ margin: '0 auto', borderColor: '#000000' }}></span>
        </div>
      }>
        <SignupForm />
      </Suspense>
    </div>
  );
}
