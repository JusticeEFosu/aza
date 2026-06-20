import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import VideoPlayer from '@/components/VideoPlayer';
import Link from 'next/link';

export default async function FanDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, display_name, role')
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

  // Deduplicate subscriptions: keep only the highest-tier subscription per creator
  const subsByCreator: Record<string, any> = {};
  (subscriptions || []).forEach(s => {
    const tierData = s.tiers;
    const amount = Array.isArray(tierData) 
      ? (tierData[0]?.amount || 0) 
      : (tierData as any)?.amount || 0;
      
    if (!subsByCreator[s.creator_id] || amount > subsByCreator[s.creator_id]._amount) {
      subsByCreator[s.creator_id] = { ...s, _amount: amount };
    }
  });
  
  const uniqueSubscriptions = Object.values(subsByCreator);
  const creatorIds = uniqueSubscriptions.map((s: any) => s.creator_id);
  const maxTierPerCreator: Record<string, number> = {};
  uniqueSubscriptions.forEach((s: any) => {
    maxTierPerCreator[s.creator_id] = s._amount;
  });

  // Fetch the feed
  let posts: any[] = [];
  let featuredCreators: any[] = [];

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

    // Build a map of tier names by amount for the feed requirement display
    const tierNamesByAmount: Record<string, string> = {};
    (subscriptions || []).forEach(s => {
      if (s.tiers) {
        tierNamesByAmount[(s.tiers as any).amount] = (s.tiers as any).name;
      }
    });

    posts = (rawPosts || []).map((post: any) => {
      const maxFanTierAmount = maxTierPerCreator[post.creator_id] || 0;
      const hasAccess = post.is_public || maxFanTierAmount >= post.minimum_tier_amount;
      return {
        ...post,
        hasAccess,
        requiredTierName: tierNamesByAmount[post.minimum_tier_amount] || 'Higher Tier',
        content: hasAccess ? post.content : post.content.substring(0, 50) + '...'
      };
    });
  } else {
    // If no subscriptions, fetch featured creators to show in the feed
    const { data: creators } = await supabase
      .from('creator_profiles')
      .select(`
        slug,
        bio,
        subscriber_count,
        profiles ( full_name, avatar_url )
      `)
      .order('subscriber_count', { ascending: false })
      .limit(3);
    featuredCreators = creators || [];
  }

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <div style={{ 
        display: 'flex', 
        flexDirection: 'row',
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        marginBottom: '2.5rem',
        flexWrap: 'wrap',
        gap: '1.5rem'
      }}>
        <div style={{ flex: '1 1 300px' }}>
          <h1 style={{ margin: 0 }}>My Subscriptions</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Welcome back, {profile?.display_name || profile?.full_name}
          </p>
        </div>
        
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          alignItems: 'center',
          background: 'var(--bg-secondary)',
          padding: '0.75rem 1.25rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <Link href="/creators" className="btn btn-primary btn-sm" style={{ whiteSpace: 'nowrap' }}>Discover Creators</Link>
          <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }} />
          <Link href="/fan/settings" className="btn btn-secondary btn-sm" style={{ whiteSpace: 'nowrap' }}>Settings</Link>
          <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }} />
          <form action="/api/auth/signout" method="POST" style={{ margin: 0 }}>
            <button type="submit" className="btn btn-secondary btn-sm" style={{ 
              whiteSpace: 'nowrap',
              color: 'var(--danger)',
              borderColor: 'rgba(239, 68, 68, 0.2)',
              background: 'rgba(239, 68, 68, 0.05)'
            }}>
              Sign Out
            </button>
          </form>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        {/* Subscriptions List */}
        <section>
          {(uniqueSubscriptions.length === 0) ? (
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
              {uniqueSubscriptions.map((sub: any) => {
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
                      flexShrink: 0,
                      overflow: 'hidden'
                    }}>
                      {sub.creator_profiles?.profiles?.avatar_url ? (
                        <img src={sub.creator_profiles.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        creatorName.charAt(0).toUpperCase()
                      )}
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
          <h2 style={{ marginBottom: '1.5rem' }}>{posts.length === 0 ? 'Start Following Creators' : 'Your Feed'}</h2>

          {posts.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border-color)', background: 'transparent' }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Your home feed will show posts from creators you support.</p>
                <p style={{ fontWeight: 600 }}>Explore these featured creators to get started:</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {featuredCreators.map((creator: any) => (
                  <Link 
                    key={creator.slug} 
                    href={`/c/${creator.slug}`}
                    className="glass-card creator-card"
                    style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '2rem' }}
                  >
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--bg-secondary)', marginBottom: '1rem', overflow: 'hidden', border: '2px solid var(--accent-primary)' }}>
                      {creator.profiles?.avatar_url ? (
                        <img src={creator.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-primary)' }}>
                          {creator.profiles?.full_name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <h3 style={{ margin: '0 0 0.5rem 0' }}>{creator.profiles?.full_name}</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '2.5rem' }}>
                      {creator.bio || "Sharing exclusive content with fans."}
                    </p>
                    <div className="btn btn-primary btn-sm btn-full" style={{ marginTop: 'auto' }}>View Profile</div>
                  </Link>
                ))}
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <Link href="/creators" className="btn btn-secondary">Discover More Creators</Link>
              </div>
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
                        fontWeight: 'bold',
                        overflow: 'hidden'
                      }}>
                        {post.creator_profiles?.profiles?.avatar_url ? (
                          <img src={post.creator_profiles.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          creatorName.charAt(0).toUpperCase()
                        )}
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
                        background: post.is_public ? 'var(--bg-secondary)' : (hasAccess ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)'),
                        color: post.is_public ? 'var(--text-secondary)' : (hasAccess ? 'var(--success)' : '#ca8a04'),
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem'
                      }}>
                        {post.is_public ? 'Public' : (hasAccess ? (
                           <><span>💎</span> {post.requiredTierName} Perk (Unlocked)</>
                        ) : (
                           <><span>🔒</span> {post.requiredTierName} Required</>
                        ))}
                      </span>
                    </div>

                    {hasAccess ? (
                      <>
                        {post.image_url && (
                          <div style={{ marginBottom: '1.5rem', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#000' }}>
                            {post.image_url.includes('/video/') ? (
                              <VideoPlayer 
                                src={post.image_url} 
                                poster={post.thumbnail_url}
                              />
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
                      <div style={{ position: 'relative', marginTop: '1rem', display: 'flex', flexDirection: 'column' }}>
                        {post.image_url && (
                          <div style={{ 
                            marginBottom: '1rem', 
                            borderRadius: 'var(--radius-md)', 
                            height: '240px',
                            background: 'linear-gradient(45deg, #1f2937, #111827)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '1rem',
                            color: '#fbbf24',
                            border: '1px solid rgba(251, 191, 36, 0.2)'
                          }}>
                            <div style={{ fontSize: '3rem' }}>🔒</div>
                            <div style={{ textAlign: 'center' }}>
                               <p style={{ fontWeight: 600, margin: 0, color: 'white' }}>Exclusive {post.image_url.includes('/video/') ? 'Video' : 'Photo'}</p>
                               <p style={{ fontSize: '0.875rem', margin: '0.25rem 0 0', opacity: 0.8 }}>Upgrade to {post.requiredTierName} to view</p>
                            </div>
                          </div>
                        )}
                        
                        <div style={{ position: 'relative' }}>
                          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--text-primary)', filter: 'blur(8px)', opacity: 0.3, userSelect: 'none' }}>
                            {post.content || "This post is exclusive to members of the " + post.requiredTierName + ". Upgrade your membership to access this content and all other benefits for this creator."}
                          </p>
                          <div style={{ 
                            position: 'absolute', 
                            top: '50%', 
                            left: '50%', 
                            transform: 'translate(-50%, -50%)', 
                            textAlign: 'center', 
                            width: '100%', 
                            padding: '1.5rem', 
                            borderRadius: '1rem',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--glass-border)',
                            backdropFilter: 'blur(10px)',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
                          }}>
                            <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>Upgrade subscription to unlock</p>
                            <Link href={`/c/${creatorSlug}`} className="btn btn-primary btn-sm">
                              Upgrade Membership
                            </Link>
                          </div>
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
