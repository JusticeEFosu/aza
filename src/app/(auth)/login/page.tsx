'use client';

import { Suspense, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const supabase = createClient();

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (redirect) {
          router.push(redirect);
        } else {
          const { data: profile } = await supabase.from('profiles').select('role, is_admin, is_suspended').eq('id', user.id).single();
          if (profile?.is_suspended) {
            await supabase.auth.signOut();
            setError('Your account has been suspended. Please contact support.');
          } else if (profile?.is_admin) router.push('/admin');
          else if (profile?.role === 'creator') router.push('/creator');
          else router.push('/fan');
        }
      }
    }
    checkUser();
  }, [supabase, router, redirect]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      if (redirect) {
        router.push(redirect);
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, is_admin, is_suspended')
          .eq('id', data.user.id)
          .single();

        if (profile?.is_suspended) {
          await supabase.auth.signOut();
          setError('Your account has been suspended. Please contact support.');
          setLoading(false);
          return;
        }

        if (profile?.is_admin) {
          router.push('/admin');
        } else if (profile?.role === 'creator') {
          const { data: creatorProfile } = await supabase
            .from('creator_profiles')
            .select('display_name')
            .eq('id', data.user.id)
            .single();

          if (!creatorProfile?.display_name || creatorProfile.display_name.startsWith('Creator ')) {
            router.push('/onboarding');
          } else {
            router.push('/creator');
          }
        } else {
          router.push('/fan');
        }
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
          <Link href="/login" className="v3-auth-tab active">Log In</Link>
          <Link href={`/signup${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`} className="v3-auth-tab">Sign Up</Link>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1.25rem', backgroundColor: '#ffdad6', color: '#ba1a1a', border: '1px solid #ba1a1a', borderRadius: '8px', padding: '12px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="v3-auth-form">
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

          <div className="v3-form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="password" className="v3-form-label">Password</label>
              <a href="#" style={{ fontSize: '12px', fontWeight: 600, color: '#4c4546', textDecoration: 'underline' }}>Forgot?</a>
            </div>
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

          <button
            type="submit"
            className="v3-auth-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ marginRight: '8px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }}></span>
                Logging in...
              </>
            ) : (
              'Log In'
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

export default function LoginPage() {
  return (
    <div className="v3-auth-page">
      <Suspense fallback={
        <div className="v3-auth-main" style={{ textAlign: 'center' }}>
          <span className="spinner" style={{ margin: '0 auto', borderColor: '#000000' }}></span>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
