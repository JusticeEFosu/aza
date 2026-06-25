import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import VideoPlayer from '@/components/VideoPlayer';
import Link from 'next/link';
import SubscriptionCardActions from '@/components/SubscriptionCardActions';
import PostActions from '@/components/PostActions';
import MobileNav from '@/components/MobileNav';

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
      creator_profiles ( slug, bio, profiles ( full_name, display_name, avatar_url ) )
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
  
  let totalMonthlySpendKobo = 0;
  uniqueSubscriptions.forEach((s: any) => {
    maxTierPerCreator[s.creator_id] = s._amount;
    totalMonthlySpendKobo += s._amount;
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
          profiles ( full_name, display_name, avatar_url )
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
        profiles ( full_name, display_name, avatar_url )
      `)
      .order('subscriber_count', { ascending: false })
      .limit(3);
    featuredCreators = creators || [];
  }

  return (
    <div className="v2-fan-dashboard">
      {/* Side Navigation */}
      <nav className="v2-sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 8px', marginBottom: '16px' }}>
          <span className="v2-dash-title" style={{ fontSize: '24px' }}>Aza</span>
        </div>
        
        <div className="v2-nav-list" style={{ marginTop: 0 }}>
          <Link href="/fan" className="v2-nav-item active">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
            Dashboard
          </Link>
          <Link href="/fan/discover" className="v2-nav-item">
            <span className="material-symbols-outlined">group</span>
            Discover Creators
          </Link>
          <Link href="/fan#feed" className="v2-nav-item">
            <span className="material-symbols-outlined">dynamic_feed</span>
            Feed
          </Link>
          <Link href="/fan/settings" className="v2-nav-item">
            <span className="material-symbols-outlined">settings</span>
            Settings
          </Link>
        </div>

        <div className="v2-sidebar-footer">
          <Link href="#" className="v2-nav-item">
            <span className="material-symbols-outlined">help</span>
            Help
          </Link>
          <form action="/api/auth/signout" method="POST" style={{ display: 'inline' }}>
            <button 
              type="submit" 
              className="v2-nav-item" 
              style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', font: 'inherit', color: 'inherit' }}
            >
              <span className="material-symbols-outlined">logout</span>
              Sign Out
            </button>
          </form>
        </div>
      </nav>

      {/* Mobile Top Bar & Drawer */}
      <MobileNav role="fan" />

      {/* Main Content Area */}
      <main className="v2-fan-main">
        <div className="v2-fan-container">
          {/* Header */}
          <header>
            <h1 className="v2-dash-title">Fan Dashboard</h1>
            <p className="v2-dash-desc">Manage your creator subscriptions and billing.</p>
          </header>

          {/* Spend Summary Card */}
          <section className="v2-spend-card">
            <h2 className="v2-spend-label">Total Monthly Spend</h2>
            <div className="v2-spend-value">
              ₦{(totalMonthlySpendKobo / 100).toLocaleString()}
              <span style={{ fontSize: '16px', fontWeight: 400, color: 'var(--v2-text-variant)' }}>/ mo</span>
            </div>
          </section>

          {/* Active Subscriptions Section */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--v2-outline)', paddingBottom: '8px' }}>
              <h3 className="v2-dash-title" style={{ fontSize: '20px' }}>Active Subscriptions</h3>
              <span style={{ fontSize: '14px', background: 'var(--v2-surface-low)', padding: '4px 12px', borderRadius: '99px', fontWeight: 600 }}>
                {uniqueSubscriptions.length} Active
              </span>
            </div>

            <div className="v2-subs-grid">
              {uniqueSubscriptions.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--v2-text-variant)', background: 'var(--v2-surface-lowest)', border: '1px dashed var(--v2-outline)', borderRadius: '12px' }}>
                   You aren't subscribed to anyone yet.
                   <br/>
                   <Link href="/creators" style={{ color: 'var(--v2-primary)', fontWeight: 600, display: 'inline-block', marginTop: '16px' }}>Discover creators</Link>
                </div>
              ) : uniqueSubscriptions.map((sub: any) => {
                const creatorProfile = sub.creator_profiles;
                const fanProfile = creatorProfile?.profiles;
                const creatorName = fanProfile?.display_name || fanProfile?.full_name || 'Creator';
                const creatorAvatar = fanProfile?.avatar_url;
                const categoryOrBio = creatorProfile?.bio ? creatorProfile.bio.substring(0, 40) + '...' : 'Creator';
                const tierInfo = Array.isArray(sub.tiers) ? sub.tiers[0] : sub.tiers;
                
                return (
                  <div key={sub.id} className="v2-sub-card">
                    <div className="v2-sub-badge">
                      <span className="v2-sub-badge-dot"></span> Active
                    </div>
                    
                    <div className="v2-sub-header">
                      {creatorAvatar ? (
                        <img src={creatorAvatar} alt="" className="v2-sub-avatar" />
                      ) : (
                        <div className="v2-sub-avatar">
                          {creatorName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h4 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>{creatorName}</h4>
                        <p style={{ fontSize: '12px', color: 'var(--v2-text-variant)', margin: 0 }}>{categoryOrBio}</p>
                      </div>
                    </div>

                    <div className="v2-sub-details">
                      <div className="v2-sub-detail-row">
                        <span className="v2-sub-label">Tier</span>
                        <span className="v2-sub-val">{tierInfo?.name || 'Standard'}</span>
                      </div>
                      <div className="v2-sub-detail-row">
                        <span className="v2-sub-label">Price</span>
                        <span className="v2-sub-val">₦{((tierInfo?.amount || 0) / 100).toLocaleString()} / mo</span>
                      </div>
                      <div className="v2-sub-detail-row">
                        <span className="v2-sub-label">Renews</span>
                        <span className="v2-sub-val" style={{ fontWeight: 500 }}>
                          {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric'}) : 'N/A'}
                        </span>
                      </div>
                    </div>

                    <SubscriptionCardActions slug={creatorProfile?.slug} subscriptionId={sub.id} />
                  </div>
                );
              })}
            </div>
          </section>

          {/* User Feed */}
          <section id="feed" style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--v2-outline)' }}>
            <h2 className="v2-dash-title" style={{ fontSize: '24px', marginBottom: '24px' }}>
              {posts.length === 0 ? 'Start Following Creators' : 'Your Feed'}
            </h2>

            {posts.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <div style={{ textAlign: 'center', padding: '48px 24px', border: '1px dashed var(--v2-outline)', borderRadius: '12px' }}>
                  <p style={{ color: 'var(--v2-text-variant)', marginBottom: '8px' }}>Your home feed will show posts from creators you support.</p>
                  <p style={{ fontWeight: 600 }}>Explore these featured creators to get started.</p>
                </div>

                <div className="v2-subs-grid">
                  {featuredCreators.map((creator: any) => {
                    const name = creator.profiles?.display_name || creator.profiles?.full_name;
                    return (
                      <Link 
                        key={creator.slug} 
                        href={`/c/${creator.slug}`}
                        className="v2-sub-card"
                        style={{ alignItems: 'center', textAlign: 'center', textDecoration: 'none', borderTopColor: 'transparent' }}
                      >
                        <div className="v2-sub-avatar" style={{ marginBottom: '8px', width: '80px', height: '80px' }}>
                          {creator.profiles?.avatar_url ? (
                            <img src={creator.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                          ) : (
                            name?.charAt(0).toUpperCase()
                          )}
                        </div>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600 }}>{name}</h3>
                        <p style={{ fontSize: '14px', color: 'var(--v2-text-variant)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {creator.bio || "Sharing exclusive content with fans."}
                        </p>
                        <div className="v2-sub-btn v2-sub-btn-primary" style={{ width: '100%', marginTop: 'auto' }}>View Profile</div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px' }}>
                {posts.map((post: any) => {
                  const creatorName = post.creator_profiles?.profiles?.display_name || post.creator_profiles?.profiles?.full_name || 'Unknown';
                  const creatorSlug = post.creator_profiles?.slug || '';
                  const creatorAvatar = post.creator_profiles?.profiles?.avatar_url;
                  const { hasAccess } = post;

                  return (
                    <div key={post.id} className="v2-spend-card" style={{ padding: '32px' }}>
                      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                        <div className="v2-sub-avatar" style={{ width: '48px', height: '48px' }}>
                          {creatorAvatar ? (
                            <img src={creatorAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                          ) : (
                            creatorName.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <Link href={`/c/${creatorSlug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <span style={{ fontWeight: 600, fontSize: '16px' }}>{creatorName}</span>
                          </Link>
                          <span style={{ fontSize: '12px', color: 'var(--v2-text-variant)' }}>
                            {new Date(post.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>{post.title}</h3>
                        <span style={{
                          fontSize: '12px',
                          padding: '4px 12px',
                          borderRadius: '9999px',
                          background: post.is_public ? 'var(--v2-surface-low)' : (hasAccess ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)'),
                          color: post.is_public ? 'var(--v2-text-variant)' : (hasAccess ? 'var(--v2-green)' : '#ca8a04'),
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          {post.is_public ? 'Public' : (hasAccess ? (
                             <><span style={{ fontSize: '14px' }}>💎</span> {post.requiredTierName} Perk (Unlocked)</>
                          ) : (
                             <><span style={{ fontSize: '14px' }}>🔒</span> {post.requiredTierName} Required</>
                          ))}
                        </span>
                      </div>

                      {hasAccess ? (
                        <>
                          {post.image_url && (
                            <div style={{ marginBottom: '24px', borderRadius: '8px', overflow: 'hidden', background: '#000' }}>
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
                          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, margin: 0 }}>
                            {post.content}
                          </p>
                          <PostActions postId={post.id} initialLikes={0} />
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
                                 <p style={{ fontWeight: 600, margin: 0, color: 'white', fontSize: '16px' }}>Exclusive {post.image_url.includes('/video/') ? 'Video' : 'Photo'}</p>
                                 <p style={{ fontSize: '14px', margin: '4px 0 0', opacity: 0.8 }}>Upgrade to {post.requiredTierName} to view</p>
                              </div>
                            </div>
                          )}
                          
                          <div style={{ position: 'relative' }}>
                            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, filter: 'blur(8px)', opacity: 0.3, userSelect: 'none', margin: 0 }}>
                              {post.content || "This post is exclusive to members of the " + post.requiredTierName + ". Upgrade your membership to access this content and all other benefits for this creator."}
                            </p>
                            <div style={{ 
                              position: 'absolute', 
                              top: '50%', 
                              left: '50%', 
                              transform: 'translate(-50%, -50%)', 
                              textAlign: 'center', 
                              width: '100%', 
                              padding: '24px', 
                              borderRadius: '16px',
                              background: 'rgba(255, 255, 255, 0.9)',
                              border: '1px solid var(--v2-outline)',
                              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
                            }}>
                              <p style={{ fontWeight: 600, marginBottom: '16px', fontSize: '16px' }}>Upgrade subscription to unlock</p>
                              <Link href={`/c/${creatorSlug}`} className="v2-sub-btn v2-sub-btn-primary" style={{ display: 'inline-flex', padding: '8px 24px' }}>
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
      </main>
    </div>
  );
}
