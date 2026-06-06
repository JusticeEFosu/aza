import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export const revalidate = 60; // Refresh data every 60 seconds

export default async function CreatorsDiscoveryPage() {
  const supabase = await createClient();
  
  // Fetch verified creators with their profile info
  const { data: creators, error } = await supabase
    .from('creator_profiles')
    .select(`
      id,
      slug,
      bio,
      subscriber_count,
      profiles (
        full_name,
        avatar_url
      )
    `)
    .eq('is_verified', true)
    .order('subscriber_count', { ascending: false });

  if (error) {
    console.error('Error fetching creators:', error);
  }

  return (
    <div className="container" style={{ paddingTop: '3rem', paddingBottom: '5rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Discover Creators</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.25rem', maxWidth: '600px', margin: '0 auto' }}>
          Support the best Nigerian talent. Discover creators and get exclusive access to their content.
        </p>
      </div>

      {!creators || creators.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>
            No verified creators found yet. Be the first!
          </p>
          <Link href="/signup" className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
            Become a Creator
          </Link>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
          gap: '2rem' 
        }}>
          {creators.map((creator: any) => (
            <Link key={creator.id} href={`/c/${creator.slug}`} style={{ textDecoration: 'none' }}>
              <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', transition: 'all var(--transition-fast)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ 
                    width: '60px', 
                    height: '60px', 
                    borderRadius: '50%', 
                    background: 'var(--bg-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    color: 'var(--accent-primary)',
                    border: '1px solid var(--border-color)'
                  }}>
                    {(creator.profiles as any)?.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.125rem' }}>{(creator.profiles as any)?.full_name}</h3>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      @{creator.slug}
                    </p>
                  </div>
                </div>

                <p style={{ 
                  color: 'var(--text-secondary)', 
                  fontSize: '0.938rem', 
                  flex: 1,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {creator.bio || 'Creating awesome content for fans.'}
                </p>

                <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {creator.subscriber_count} subscribers
                  </span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--accent-primary)' }}>
                    View Profile &rarr;
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
