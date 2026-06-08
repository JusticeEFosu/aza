import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function CreatorsPage() {
  const supabase = await createClient();

  const { data: creators } = await supabase
    .from('creator_profiles')
    .select(`
      slug,
      bio,
      subscriber_count,
      profiles ( full_name, avatar_url )
    `)
    .order('subscriber_count', { ascending: false });

  return (
    <div style={{ minHeight: '100vh' }}>
      <section className="landing-section">
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ marginBottom: '2rem' }}>
            <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
              &larr; Home
            </Link>
          </div>
          <h1 style={{ marginBottom: '0.5rem' }}>Discover Creators</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', maxWidth: '500px' }}>
            Browse creators on Aza and find someone worth supporting.
          </p>

          {(!creators || creators.length === 0) ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <h3 style={{ marginBottom: '0.5rem' }}>No creators yet</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Be the first to set up your creator page on Aza.
              </p>
              <Link href="/signup" className="btn btn-primary">
                Start Creating
              </Link>
            </div>
          ) : (
            <div className="creators-grid">
              {creators.map((creator: any) => {
                const name = creator.profiles?.full_name || 'Creator';
                return (
                  <Link
                    key={creator.slug}
                    href={`/c/${creator.slug}`}
                    className="glass-card creator-card"
                  >
                    <div className="creator-avatar" style={{ overflow: 'hidden' }}>
                      {creator.profiles?.avatar_url ? (
                        <img 
                          src={creator.profiles.avatar_url} 
                          alt="" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      ) : (
                        name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <h4>{name}</h4>
                    <p>{creator.bio || 'No bio yet.'}</p>
                    <span className="subscriber-count">
                      {creator.subscriber_count || 0} subscriber{creator.subscriber_count === 1 ? '' : 's'}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-brand">Aza</div>
        <div className="footer-links">
          <Link href="/">Home</Link>
          <Link href="/login">Sign In</Link>
          <Link href="/signup">Create Account</Link>
        </div>
      </footer>
    </div>
  );
}
