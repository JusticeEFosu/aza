import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function FanDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'fan') redirect('/creator');

  // Fetch active subscriptions with joined creator profile and tier data
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select(`
      id,
      status,
      current_period_end,
      creator_id,
      tiers ( name, amount ),
      creator_profiles ( slug, profiles ( full_name, avatar_url ) )
    `)
    .eq('fan_id', user.id)
    .eq('status', 'active');

  const creatorIds = (subscriptions || []).map(s => s.creator_id);
  const maxTierPerCreator: Record<string, number> = {};
  
  (subscriptions || []).forEach(s => {
    const amount = (s.tiers as any)?.amount || 0;
    if (amount > (maxTierPerCreator[s.creator_id] || 0)) {
        maxTierPerCreator[s.creator_id] = amount;
    }
  });

  // Fetch the feed
  let posts: any[] = [];
  if (creatorIds.length > 0) {
    const { data: rawPosts } = await supabase
      .from('posts')
      .select(`
        *,
        creator_profiles (
          slug,
          profiles ( full_name, avatar_url )
        )
      `)
      .in('creator_id', creatorIds)
      .order('created_at', { ascending: false })
      .limit(30);

    posts = (rawPosts || []).map((post: any) => {
      const maxFanTierAmount = maxTierPerCreator[post.creator_id] || 0;
      const hasAccess = post.is_public || maxFanTierAmount >= post.minimum_tier_amount;
      return {
        ...post,
        hasAccess,
        content: hasAccess ? post.content : post.content.substring(0, 50) + '...'
      };
    });
  }

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>My Subscriptions</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Welcome back, {profile?.full_name}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <a href="/creators" className="btn btn-primary btn-sm">Discover Creators</a>
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="btn btn-secondary btn-sm">
              Sign Out
            </button>
          </form>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        {/* Subscriptions List */}
        <section>
          {(!subscriptions || subscriptions.length === 0) ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
              <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎧</p>
              <h3 style={{ marginBottom: '0.5rem' }}>No subscriptions yet</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Discover amazing Nigerian creators and support their work
              </p>
              <a href="/creators" className="btn btn-primary">
                Browse Creators
              </a>
            </div>
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
              gap: '1rem' 
            }}>
              {subscriptions.map((sub: any) => {
                const creatorName = sub.creator_profiles?.profiles?.full_name || 'Creator';
                const tierName = sub.tiers?.name || 'Tier';
                
                return (
                  <div key={sub.id} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
                    <div style={{ 
                      width: '48px', 
                      height: '48px', 
                      borderRadius: '50%', 
                      background: 'var(--bg-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-primary)',
                      fontWeight: 'bold',
                      flexShrink: 0
                    }}>
                      {creatorName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {creatorName}
                      </p>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {tierName}
                      </p>
                      {sub.current_period_end && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          Renews: {new Date(sub.current_period_end).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Link href={`/c/${sub.creator_profiles?.slug}`} className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>
                      Visit
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* The Feed */}
        <section>
          <h2 style={{ marginBottom: '1.5rem' }}>Your Feed</h2>
          
          {posts.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--text-muted)' }}>It's quiet here. Your creators haven't posted anything yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px' }}>
              {posts.map((post: any) => {
                const creatorName = post.creator_profiles?.profiles?.full_name || 'Unknown';
                const creatorSlug = post.creator_profiles?.slug || '';
                const { hasAccess } = post;
                
                return (
                  <div key={post.id} className="glass-card" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div style={{ 
                        width: '40px', 
                        height: '40px', 
                        borderRadius: '50%', 
                        background: 'var(--accent-primary)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold'
                      }}>
                        {creatorName.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <Link href={`/c/${creatorSlug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          <span style={{ fontWeight: 600 }}>{creatorName}</span>
                        </Link>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(post.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{post.title}</h3>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '1rem',
                        background: post.is_public ? 'var(--bg-secondary)' : (hasAccess ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'),
                        color: post.is_public ? 'var(--text-secondary)' : (hasAccess ? 'var(--success)' : 'var(--danger)'),
                        fontWeight: 600
                      }}>
                        {post.is_public ? 'Public' : (hasAccess ? 'Unlocked' : 'Locked')}
                      </span>
                    </div>

                    {hasAccess ? (
                      <>
                        {post.image_url && (
                          <div style={{ marginBottom: '1.5rem', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#000' }}>
                            {post.image_url.includes('/video/') ? (
                              <video src={post.image_url} controls playsInline style={{ width: '100%', maxHeight: '500px', objectFit: 'contain' }} />
                            ) : (
                              <img src={post.image_url} alt="Post media" style={{ width: '100%', maxHeight: '500px', objectFit: 'cover' }} />
                            )}
                          </div>
                        )}
                        <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--text-primary)' }}>
                          {post.content}
                        </p>
                      </>
                    ) : (
                      <div style={{ position: 'relative', marginTop: '1rem' }}>
                        <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--text-primary)', filter: 'blur(4px)', opacity: 0.5 }}>
                          {post.content}
                          <br /><br />This is just a teaser of the full content.
                        </p>
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', width: '100%', background: 'rgba(255,255,255,0.7)', padding: '1rem', borderRadius: '1rem', backdropFilter: 'blur(4px)' }}>
                          <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Upgrade subscription to unlock</p>
                          <Link href={`/c/${creatorSlug}`} className="btn btn-primary btn-sm">
                            View Tiers
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
