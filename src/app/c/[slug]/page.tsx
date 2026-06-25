import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import SubscribeButton from '@/components/SubscribeButton';
import ManageSubscription from '@/components/ManageSubscription';
import VideoPlayer from '@/components/VideoPlayer';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

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
    .eq('slug', slug.toLowerCase())
    .single();

  if (creatorError || !creator) {
    console.log(`Creator NOT found for slug: ${slug}`);
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
  let activeSub: any = null;
  
  if (user) {
    if (user.id === creator.id) {
        maxFanTierAmount = Infinity;
    } else {
        const { data: subs } = await supabase
          .from('subscriptions')
          .select('id, current_period_end, tier_id, tiers ( name, amount )')
          .eq('fan_id', user.id)
          .eq('creator_id', creator.id)
          .eq('status', 'active');
          
        if (subs && subs.length > 0) {
            subs.forEach(sub => {
                const tierData = sub.tiers;
                const amount = Array.isArray(tierData) 
                    ? (tierData[0]?.amount || 0) 
                    : (tierData as any)?.amount || 0;
                if (amount > maxFanTierAmount) {
                    maxFanTierAmount = amount;
                    activeSub = sub;
                }
            });
        }
    }
  }

  const currentTierName = activeSub ? 
    (Array.isArray(activeSub.tiers) ? activeSub.tiers[0]?.name : (activeSub.tiers as any)?.name) || 'Tier' 
    : '';

  // 5. Scrub content
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

  const displayName = creator.display_name || (creator.profiles as any)?.full_name;
  const avatarUrl = (creator.profiles as any)?.avatar_url;

  return (
    <div className="v2-profile-page">
      {/* TopNavBar */}
      <nav className="v2-profile-nav">
        <div className="v2-profile-nav-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <Link href="/" style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--v2-primary)', textDecoration: 'none' }}>MyAzaa</Link>
            <div className="hidden md:flex items-center" style={{ gap: '24px' }}>
              <Link href="/creators" style={{ color: 'var(--v2-text-variant)', fontSize: '14px', fontWeight: 500, textDecoration: 'none' }}>Discover</Link>
              <Link href="#" style={{ color: 'var(--v2-text-variant)', fontSize: '14px', fontWeight: 500, textDecoration: 'none' }}>How it Works</Link>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {!user ? (
              <>
                <Link href="/login" className="hidden md:block" style={{ color: 'var(--v2-text-variant)', fontSize: '14px', fontWeight: 500, textDecoration: 'none' }}>Log In</Link>
                <Link href="/signup" className="v2-sub-btn v2-sub-btn-primary" style={{ padding: '8px 24px', fontSize: '14px' }}>Start Creating</Link>
              </>
            ) : (
              <Link href="/fan" className="v2-sub-btn v2-sub-btn-secondary" style={{ padding: '8px 24px', fontSize: '14px' }}>Dashboard</Link>
            )}
          </div>
        </div>
      </nav>

      <main style={{ width: '100%', paddingBottom: '64px' }}>
        <div className="v2-profile-container">
          
          {/* Profile Header */}
          <div className="v2-profile-header">
            <div className="v2-profile-avatar">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                displayName?.charAt(0).toUpperCase()
              )}
            </div>
            
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h1 className="v2-profile-name">
                {displayName}
                {creator.is_verified && <span style={{ color: 'var(--v2-green)', fontSize: '24px' }}>✓</span>}
              </h1>
              <p className="v2-profile-bio">
                {creator.bio || "Welcome to my creator page! Subscribe to get exclusive access to my content."}
              </p>
              <div>
                <span className="v2-profile-stats">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>group</span>
                  {creator.subscriber_count?.toLocaleString()} Subscribers
                </span>
              </div>
            </div>
          </div>

          {/* Subscription Section */}
          <div id="tiers" style={{ marginBottom: '64px' }}>
            <div style={{ marginBottom: '32px', maxWidth: '768px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--v2-primary)', marginBottom: '8px' }}>Support my work</h2>
              <p style={{ fontSize: '16px', color: 'var(--v2-text-variant)' }}>Choose a tier to unlock exclusive content, early access, and join our private community. You can cancel anytime.</p>
            </div>

            {/* Managed Active Subscription */}
            {activeSub && maxFanTierAmount > 0 && maxFanTierAmount !== Infinity ? (
              <div style={{ marginBottom: '40px' }}>
                <ManageSubscription
                  subscriptionId={activeSub.id}
                  currentTierName={currentTierName}
                  currentTierAmount={maxFanTierAmount}
                  renewalDate={activeSub.current_period_end}
                  tiers={tiers || []}
                  maxFanTierAmount={maxFanTierAmount}
                />
              </div>
            ) : null}

            {/* Bento Grid for Pricing */}
            {!tiers || tiers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', background: 'var(--v2-surface-low)', border: '1px solid var(--v2-outline)', borderRadius: '12px', color: 'var(--v2-text-variant)' }}>
                This creator hasn't set up any membership tiers yet.
              </div>
            ) : (
              <div className="v2-profile-tier-grid">
                {tiers.map((tier: any) => (
                  <div key={tier.id} className="profile-tier-card">
                    <div>
                      <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--v2-primary)', marginBottom: '4px' }}>{tier.name}</h3>
                      <div style={{ fontSize: '40px', fontWeight: 700, color: 'var(--v2-primary)', marginBottom: '24px', letterSpacing: '-0.02em', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                        ₦{(tier.amount / 100).toLocaleString()}
                        <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--v2-text-variant)', letterSpacing: 'normal' }}>/mo</span>
                      </div>
                      
                      {tier.description && (
                        <p style={{ fontSize: '14px', color: 'var(--v2-text-variant)', marginBottom: '24px', lineHeight: 1.5 }}>{tier.description}</p>
                      )}

                      {tier.perks && tier.perks.length > 0 && (
                        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '16px', color: 'var(--v2-text-variant)' }}>
                          {tier.perks.map((perk: string, i: number) => (
                            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--v2-primary)', fontWeight: 700, flexShrink: 0 }}>check</span>
                              <span style={{ lineHeight: 1.4 }}>{perk}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    
                    <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
                       <SubscribeButton 
                         tierId={tier.id} 
                         planCode={tier.paystack_plan_code} 
                         isSubscribed={maxFanTierAmount >= tier.amount}
                       />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Posts Feed */}
          <div style={{ marginBottom: '64px', paddingTop: '64px', borderTop: '1px solid var(--v2-outline)' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--v2-primary)', marginBottom: '32px' }}>Recent Posts</h2>
            
            {!posts || posts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', background: 'var(--v2-surface-low)', border: '1px solid var(--v2-outline)', borderRadius: '12px', color: 'var(--v2-text-variant)' }}>
                No recent posts. Check back later!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '800px' }}>
                {posts.map((post: any) => {
                  const hasAccess = post.hasAccess;
                  
                  return (
                    <div key={post.id} className="v2-profile-post">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: 'var(--v2-primary)' }}>{post.title}</h3>
                        <span style={{ 
                          fontSize: '12px', 
                          padding: '4px 12px', 
                          borderRadius: '999px',
                          background: post.is_public ? 'var(--v2-surface-low)' : (hasAccess ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)'),
                          color: post.is_public ? 'var(--v2-text-variant)' : (hasAccess ? 'var(--v2-green)' : '#ca8a04'),
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          {post.is_public ? 'Public' : (hasAccess ? (
                            <><span style={{ fontSize: '14px' }}>💎</span> {post.requiredTierName} Required</>
                          ) : (
                            <><span style={{ fontSize: '14px' }}>🔒</span> {post.requiredTierName} Required</>
                          ))}
                        </span>
                      </div>

                      {hasAccess ? (
                        <>
                          {post.image_url && (
                            <div style={{ marginBottom: '24px', borderRadius: '8px', overflow: 'hidden', background: '#000' }}>
                              {post.image_url?.includes('/video/') ? (
                                <VideoPlayer
                                  src={post.image_url}
                                  poster={post.thumbnail_url}
                                />
                              ) : (
                                <img src={post.image_url} alt="Post media" style={{ width: '100%', maxHeight: '500px', objectFit: 'cover' }} />
                              )}
                            </div>
                          )}
                          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--v2-primary)', fontSize: '16px', margin: 0 }}>
                            {post.content}
                          </p>
                        </>
                      ) : (
                        <div style={{ position: 'relative', marginTop: '16px', display: 'flex', flexDirection: 'column' }}>
                          {post.image_url && (
                            <div style={{ 
                              marginBottom: '16px', 
                              borderRadius: '8px', 
                              height: '240px',
                              background: 'linear-gradient(45deg, #1f2937, #111827)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '16px',
                              color: '#fbbf24',
                              border: '1px solid rgba(251, 191, 36, 0.2)'
                            }}>
                              <div style={{ fontSize: '48px' }}>🔒</div>
                              <div style={{ textAlign: 'center' }}>
                                 <p style={{ fontWeight: 600, margin: 0, color: 'white', fontSize: '16px' }}>Exclusive {post.image_url?.includes('/video/') ? 'Video' : 'Photo'}</p>
                                 <p style={{ fontSize: '14px', margin: '4px 0 0', opacity: 0.8 }}>Available for {post.requiredTierName}</p>
                              </div>
                            </div>
                          )}
                          
                          <div style={{ position: 'relative' }}>
                            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--v2-primary)', fontSize: '16px', margin: 0, filter: 'blur(8px)', opacity: 0.3, userSelect: 'none' }}>
                              {post.content || "This post contains exclusive content shared only with subscribers. Subscribe today to unlock this and all other member-only posts from this creator."}
                            </p>
                            <div style={{ 
                              position: 'absolute', 
                              top: '50%', left: '50%', transform: 'translate(-50%, -50%)', 
                              textAlign: 'center', width: '100%', 
                              padding: '32px 24px', borderRadius: '16px', 
                              background: 'rgba(255,255,255,0.9)', 
                              border: '1px solid var(--v2-outline)', 
                              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', 
                              backdropFilter: 'blur(8px)' 
                            }}>
                              <p style={{ fontWeight: 600, color: 'var(--v2-primary)', marginBottom: '16px', fontSize: '16px' }}>Unlock this post by subscribing</p>
                              <Link href="#tiers" className="v2-sub-btn v2-sub-btn-primary" style={{ padding: '12px 32px', display: 'inline-flex' }}>
                                View Subscription Tiers
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
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="v2-profile-footer">
        <div className="v2-profile-footer-inner">
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)' }}>
              © 2024 Aza. Built for Nigerian Creators.
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '24px', fontSize: '12px', fontWeight: 600 }}>
            <Link href="/" style={{ color: 'var(--v2-text-variant)', textDecoration: 'none' }}>Privacy</Link>
            <Link href="/" style={{ color: 'var(--v2-text-variant)', textDecoration: 'none' }}>Terms</Link>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', filter: 'grayscale(1)', opacity: 0.7, border: '1px solid var(--v2-outline)', background: 'var(--v2-surface-low)', padding: '4px 8px', borderRadius: '4px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>lock</span>
              Secured by Paystack
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
