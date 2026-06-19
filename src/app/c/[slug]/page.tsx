import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import SubscribeButton from '@/components/SubscribeButton';

export const revalidate = 60;

export default async function CreatorPublicProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  
  // 1. Fetch Creator Profile
  const { data: creator, error: creatorError } = await supabase
    .from('creator_profiles')
    .select(`
      id,
      slug,
      bio,
      display_name,
      is_verified,
      subscriber_count,
      profiles (
        full_name,
        avatar_url
      )
    `)
    .eq('slug', slug)
    .single();

  if (creatorError || !creator) {
    notFound();
  }

  // 2. Fetch active Tiers
  const { data: tiers } = await supabase
    .from('tiers')
    .select('*')
    .eq('creator_id', creator.id)
    .eq('is_active', true)
    .order('amount', { ascending: true });

  // 3. Fetch Posts
  const { data: rawPosts } = await supabase
    .from('posts')
    .select('*')
    .eq('creator_id', creator.id)
    .order('created_at', { ascending: false });

  // 4. Check access
  const { data: { user } } = await supabase.auth.getUser();
  let maxFanTierAmount = 0;
  
  if (user) {
    if (user.id === creator.id) {
        maxFanTierAmount = Infinity;
    } else {
        const { data: subs } = await supabase
          .from('subscriptions')
          .select('tiers ( amount )')
          .eq('fan_id', user.id)
          .eq('creator_id', creator.id)
          .eq('status', 'active');
          
        if (subs && subs.length > 0) {
            // Take the maximum amount from all active subscriptions
            maxFanTierAmount = subs.reduce((max, sub) => {
                const tierData = sub.tiers;
                // Handle both object and array response from Supabase joins
                const amount = Array.isArray(tierData) 
                    ? (tierData[0]?.amount || 0) 
                    : (tierData as any)?.amount || 0;
                return Math.max(max, amount);
            }, 0);
        }
    }
  }

  // 5. Scrub content server-side for security and add tier requirement info
  const posts = (rawPosts || []).map((post: any) => {
    const hasAccess = post.is_public || maxFanTierAmount >= post.minimum_tier_amount;
    const requiredTier = tiers?.find(t => t.amount === post.minimum_tier_amount);
    
    return {
      ...post,
      hasAccess,
      requiredTierName: requiredTier?.name || 'Subscribers',
      content: hasAccess ? post.content : post.content.substring(0, 50) + '...'
    };
  });

  return (
    <div className="container" style={{ maxWidth: '900px', paddingTop: '3rem', paddingBottom: '5rem' }}>
      
      {/* Header Profile Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '3rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ 
            width: '100px', 
            height: '100px', 
            borderRadius: '50%', 
            background: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem',
            color: 'white',
            fontWeight: 'bold',
            boxShadow: 'var(--shadow-md)',
            overflow: 'hidden'
          }}>
            {(creator.profiles as any)?.avatar_url ? (
              <img src={(creator.profiles as any).avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              (creator.profiles as any)?.full_name?.charAt(0).toUpperCase()
            )}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: '2.5rem' }}>
              {creator.display_name || (creator.profiles as any)?.full_name}
              {creator.is_verified && <span style={{ color: 'var(--success)', marginLeft: '0.5rem', fontSize: '1.5rem' }}>✓</span>}
            </h1>
            <p style={{ margin: '0.25rem 0', fontSize: '1rem', color: 'var(--text-muted)' }}>
              @{creator.slug} • {creator.subscriber_count} subscribers
            </p>
          </div>
        </div>
        
        {creator.bio && (
          <div className="glass-card" style={{ padding: '1.5rem', marginTop: '1rem' }}>
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{creator.bio}</p>
          </div>
        )}
      </div>

      {/* Tiers Section */}
      <h2 style={{ marginBottom: '1.5rem', marginTop: '4rem' }}>Select a Membership Tier</h2>
      
      {!tiers || tiers.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>This creator hasn't set up any membership tiers yet.</p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '1.5rem' 
        }}>
          {tiers.map((tier: any, index: number) => {
            const isPopular = index === 1 || (tiers.length === 1 && index === 0);
            return (
            <div key={tier.id} className={`tier-card ${isPopular ? 'popular' : ''}`}>
              {isPopular && <div className="tier-badge">Most Popular</div>}
              
              <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-secondary)' }}>{tier.name}</h3>
                <div style={{ margin: '1rem 0', fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                  ₦{(tier.amount / 100).toLocaleString()}
                  <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>/mo</span>
                </div>
                {tier.description && (
                  <p style={{ fontSize: '0.938rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{tier.description}</p>
                )}
              </div>

              {tier.perks && tier.perks.length > 0 && (
                <div style={{ flex: 1, marginBottom: '2.5rem' }}>
                  <p style={{ fontWeight: 600, fontSize: '0.813rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
                    What's included:
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    {tier.perks.map((perk: string, i: number) => (
                      <li key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', fontSize: '0.938rem', color: 'var(--text-secondary)' }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>✓</span>
                        <span style={{ lineHeight: 1.4 }}>{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ marginTop: 'auto' }}>
                <SubscribeButton tierId={tier.id} planCode={tier.paystack_plan_code} />
              </div>
            </div>
          )})}
        </div>
      )}

      {/* Posts Section */}
      <h2 style={{ marginBottom: '1.5rem', marginTop: '4rem' }}>Recent Posts</h2>
      
      {!posts || posts.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>No posts yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {posts.map((post: any) => {
            const hasAccess = post.hasAccess;
            
            return (
              <div key={post.id} className="glass-card" style={{ padding: '2rem' }}>
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
                          <video 
                            src={post.image_url} 
                            poster={post.thumbnail_url}
                            controls 
                            playsInline 
                            preload="none"
                            style={{ width: '100%', maxHeight: '500px', objectFit: 'contain' }} 
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
                           <p style={{ fontSize: '0.875rem', margin: '0.25rem 0 0', opacity: 0.8 }}>Available for {post.requiredTierName}</p>
                        </div>
                      </div>
                    )}
                    
                    <div style={{ position: 'relative' }}>
                      <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--text-primary)', filter: 'blur(8px)', opacity: 0.3, userSelect: 'none' }}>
                        {post.content || "This post contains exclusive content shared only with subscribers. Subscribe today to unlock this and all other member-only posts from this creator."}
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
                        <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>Subscribe to unlock this post</p>
                        <button className="btn btn-primary btn-sm" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                          View Membership Tiers
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                <div style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  {new Date(post.created_at).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
