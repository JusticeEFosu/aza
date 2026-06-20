'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'fan' | 'creator'>('fan');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
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

      // Redirect based on role
      if (role === 'creator') {
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
    <div className="auth-page">
      <div className="auth-card">
        <div className="glass-card">
          <div className="auth-header">
            <h1 className="auth-logo">Aza</h1>
            <p className="auth-subtitle">
              Join the community of Nigerian creators and fans
            </p>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="auth-form">
            {/* Role Selection */}
            <div className="form-group">
              <label className="form-label">I am a...</label>
              <div className="role-selector">
                <button
                  type="button"
                  className={`role-option ${role === 'fan' ? 'active' : ''}`}
                  onClick={() => setRole('fan')}
                >
                  <span className="role-option-icon">🎧</span>
                  <span className="role-option-title">Fan</span>
                  <span className="role-option-desc">
                    Support creators I love
                  </span>
                </button>
                <button
                  type="button"
                  className={`role-option ${role === 'creator' ? 'active' : ''}`}
                  onClick={() => setRole('creator')}
                >
                  <span className="role-option-icon">🎨</span>
                  <span className="role-option-title">Creator</span>
                  <span className="role-option-desc">
                    Earn from my audience
                  </span>
                </button>
              </div>
            </div>

            {/* Full Name */}
            <div className="form-group">
              <label htmlFor="fullName" className="form-label">Full Name (Legal)</label>
              <input
                id="fullName"
                type="text"
                className="form-input"
                placeholder="Enter your legal full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              <span className="form-hint">Used for banking and payouts.</span>
            </div>

            {/* Display Name */}
            <div className="form-group">
              <label htmlFor="displayName" className="form-label">Display Name / Username</label>
              <input
                id="displayName"
                type="text"
                className="form-input"
                placeholder="e.g. SuperFan99"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <span className="form-hint">How you'll appear to creators and others.</span>
            </div>

            {/* Email */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">Email</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password */}
            <div className="form-group">
              <label htmlFor="password" className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
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
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 500
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn btn-primary btn-lg btn-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Creating account...
                </>
              ) : (
                `Sign up as ${role === 'creator' ? 'a Creator' : 'a Fan'}`
              )}
            </button>
          </form>

          <div className="auth-footer">
            Already have an account?{' '}
            <Link href="/login">Log in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
