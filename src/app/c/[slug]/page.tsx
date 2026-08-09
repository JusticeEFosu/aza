import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import SubscribeButton from '@/components/SubscribeButton';
import ManageSubscription from '@/components/ManageSubscription';
import VideoPlayer from '@/components/VideoPlayer';
import { getEmbedUrl } from '@/lib/utils/embed';
import Link from 'next/link';
import ExpandableText from '@/components/ExpandableText';
import ReportPostButton from '@/components/ReportPostButton';
import DashboardSidebar from '@/components/DashboardSidebar';
import MobileNav from '@/components/MobileNav';
import ProfileContentTabs from '@/components/ProfileContentTabs';
import InitiateMessageButton from '@/components/messages/InitiateMessageButton';
import PostEngagementBar from '@/components/posts/PostEngagementBar';
import PollBlock from '@/components/posts/PollBlock';
import TipButton from '@/components/TipButton';

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
      social_links,
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

  // 3. Fetch Posts using Admin client to bypass RLS and show locked teasers
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const adminSupabase = createAdminClient();
  const { data: rawPosts } = await adminSupabase
    .from('posts')
    .select('*, likes:post_likes(count), comments:post_comments(count)')
    .eq('creator_id', creator.id)
    .order('created_at', { ascending: false });

  // 4. Check access and get user's liked posts
  const { data: { user } } = await supabase.auth.getUser();
  
  let userLikedPostIds: string[] = [];
  if (user) {
    const { data: likedPosts } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', user.id);
    userLikedPostIds = likedPosts?.map(p => p.post_id) || [];
  }
  let maxFanTierAmount = 0;
  let activeSub: any = null;
  let userRole: 'fan' | 'creator' | null = null;
  
  if (user) {
    const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profileData?.role) {
      userRole = profileData.role as 'fan' | 'creator';
    }

    if (user.id === creator.id) {
        maxFanTierAmount = Infinity;
    } else {
          const now = new Date().toISOString();
          const { data: subs } = await supabase
          .from('subscriptions')
          .select('id, current_period_end, tier_id, tiers ( name, amount )')
          .eq('fan_id', user.id)
          .eq('creator_id', creator.id)
          .or(`status.eq.active,and(status.eq.cancelled,current_period_end.gt.${now})`);
          
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
    
    const isVideo = post.image_url?.includes('/video/');
    let secureImageUrl = post.image_url;
    let secureThumbnailUrl = post.thumbnail_url;

    if (!hasAccess) {
      if (isVideo) {
        secureImageUrl = null;
      } else if (post.image_url) {
        secureImageUrl = post.image_url.replace('/upload/', '/upload/e_blur:1000/');
      }
    }

    return {
      ...post,
      hasAccess,
      requiredTierName: requiredTier?.name || 'Subscribers',
      content: hasAccess ? post.content : '',
      image_url: secureImageUrl,
      thumbnail_url: secureThumbnailUrl,
      likesCount: post.likes?.[0]?.count || 0,
      commentsCount: post.comments?.[0]?.count || 0,
      userHasLiked: userLikedPostIds.includes(post.id)
    };
  });

  const displayName = creator.display_name || (creator.profiles as any)?.full_name;
  const avatarUrl = (creator.profiles as any)?.avatar_url;

  // 6. Fetch Active Fundraisers and their top 10 donations
  const { data: fundraisers } = await supabase
    .from('fundraisers')
    .select('*')
    .eq('creator_id', creator.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  // fundraiserDonations fetch removed since teasers do not display the leaderboard

  const isAppView = user && userRole;
  const socialLinks = creator.social_links as Record<string, string> | null;

  const content = (
    <div className={`v2-profile-page ${isAppView ? 'v2-profile-app-view' : ''}`}>
      {/* TopNavBar */}
      {!isAppView && (
        <nav className="v2-profile-nav">
          <div className="v2-profile-nav-inner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <Link href="/" style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--v2-primary)', textDecoration: 'none' }}>MyAzaa</Link>
              <div className="v2-desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <Link href="/creators" style={{ color: 'var(--v2-text-variant)', fontSize: '14px', fontWeight: 500, textDecoration: 'none' }}>Discover</Link>
                <Link href="/how-it-works" style={{ color: 'var(--v2-text-variant)', fontSize: '14px', fontWeight: 500, textDecoration: 'none' }}>How it Works</Link>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {!user ? (
                <>
                  <Link href="/login" className="v2-desktop-only" style={{ color: 'var(--v2-text-variant)', fontSize: '14px', fontWeight: 500, textDecoration: 'none' }}>Log In</Link>
                  <Link href="/signup" className="v2-sub-btn v2-sub-btn-primary" style={{ padding: '8px 24px', fontSize: '14px' }}>Start Creating</Link>
                </>
              ) : (
                <Link href="/fan" className="v2-sub-btn v2-sub-btn-secondary" style={{ padding: '8px 24px', fontSize: '14px' }}>Dashboard</Link>
              )}
            </div>
          </div>
        </nav>
      )}

      <main className="v2-profile-main" style={{ width: '100%', paddingBottom: '64px' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <span className="v2-profile-stats">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>group</span>
                  {creator.subscriber_count?.toLocaleString()} Subscribers
                </span>
                
                {user && user.id !== creator.id && (
                  <InitiateMessageButton creatorId={creator.id} creatorName={displayName || 'Creator'} />
                )}
                
                {/* Global Tip Button (Only if verified) */}
                {creator.is_verified && (
                  <TipButton creatorId={creator.id} creatorName={displayName || 'Creator'} />
                )}
                
                {socialLinks && (
                  <div style={{ display: 'flex', gap: '16px' }}>
                    {socialLinks.x || socialLinks.twitter ? (
                      <a href={socialLinks.x || socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="v2-social-link" style={{ color: 'var(--v2-text-variant)', display: 'flex', transition: 'color 0.2s' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                      </a>
                    ) : null}
                    {socialLinks.instagram ? (
                      <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="v2-social-link" style={{ color: 'var(--v2-text-variant)', display: 'flex', transition: 'color 0.2s' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                      </a>
                    ) : null}
                    {socialLinks.youtube ? (
                      <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="v2-social-link" style={{ color: 'var(--v2-text-variant)', display: 'flex', transition: 'color 0.2s' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                      </a>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>

            {/* Fundraisers Section (Only if verified) */}
            {creator.is_verified && fundraisers && fundraisers.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', maxWidth: '800px', marginBottom: '48px' }}>
                {fundraisers.map((f: any) => {
                  const targetAmount = f.target_amount / 100;
                  const currentAmount = f.current_amount / 100;
                  const progress = targetAmount > 0 ? Math.min(100, Math.round((currentAmount / targetAmount) * 100)) : 0;
                  
                  return (
                    <Link 
                      key={f.id} 
                      href={`/fundraiser/${f.id}`}
                      className="v2-fundraiser-teaser"
                      style={{ 
                        display: 'block', 
                        padding: '24px', 
                        background: 'var(--v2-surface-low)', 
                        border: '1px solid var(--v2-outline)', 
                        borderRadius: '24px', 
                        textDecoration: 'none', 
                        transition: 'all 0.2s'
                      }}
                    >
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-green)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Fundraiser Goal</span>
                      <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 12px 0', color: 'var(--v2-primary)' }}>{f.title}</h3>
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>
                          <span style={{ color: 'var(--v2-primary)' }}>₦{currentAmount.toLocaleString()} <span style={{ color: 'var(--v2-text-variant)', fontWeight: 400 }}>raised</span></span>
                        </div>
                        <div style={{ height: '8px', background: 'var(--v2-surface-container)', borderRadius: '999px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${progress}%`, background: 'var(--v2-green)' }}></div>
                        </div>
                      </div>
                      <div style={{ color: 'var(--v2-green)', fontSize: '14px', fontWeight: 600, marginTop: '16px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        View Goal <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

          {/* Main Content Tabs */}
          <ProfileContentTabs 
            defaultTab={activeSub ? 'posts' : 'membership'}
            membershipContent={
              <>
                <div id="tiers" style={{ marginBottom: '64px' }}>
              {activeSub && maxFanTierAmount > 0 && maxFanTierAmount !== Infinity ? (
                <ManageSubscription
                  subscriptionId={activeSub.id}
                  currentTierName={currentTierName}
                  currentTierAmount={maxFanTierAmount}
                  renewalDate={activeSub.current_period_end}
                  tiers={(tiers as any) || []}
                  maxFanTierAmount={maxFanTierAmount}
                />
              ) : (
                <>
                  <div style={{ marginBottom: '32px', maxWidth: '768px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--v2-primary)', marginBottom: '8px' }}>Support my work</h2>
                    <p style={{ fontSize: '16px', color: 'var(--v2-text-variant)' }}>Choose a tier to unlock exclusive content, early access, and join our private community. You can cancel anytime.</p>
                  </div>
                  
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
                </>
              )}
            </div>
              </>
            }
            postsContent={
              <>
                <div style={{ marginBottom: '64px' }}>
            
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
                            <><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>diamond</span> {post.requiredTierName} Required</>
                          ) : (
                            <><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>lock</span> {post.requiredTierName} Required</>
                          ))}
                        </span>
                      </div>

                      {hasAccess ? (
                        <>
                          {post.embed_url ? (
                            <div style={{ marginBottom: '24px', borderRadius: '8px', overflow: 'hidden', background: '#000', aspectRatio: '16/9' }}>
                              <iframe
                                src={getEmbedUrl(post.embed_url) || ''}
                                style={{ width: '100%', height: '100%', border: 'none' }}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          ) : post.image_url ? (
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
                          ) : null}
                          <ExpandableText text={post.content || ''} maxLength={250} style={{ color: 'var(--v2-primary)' }} />
                        </>
                      ) : (
                        <div style={{ position: 'relative', marginTop: '16px', display: 'flex', flexDirection: 'column' }}>
                          {(post.embed_url || post.image_url || post.thumbnail_url) && (
                            <div style={{ 
                              marginBottom: '16px', 
                              borderRadius: '8px',
                              overflow: 'hidden',
                              position: 'relative',
                              background: '#000',
                              aspectRatio: (post.thumbnail_url || post.embed_url) ? '16/9' : 'auto',
                              minHeight: '240px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {post.thumbnail_url ? (
                                <img src={post.thumbnail_url} alt="Locked Video" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} />
                              ) : post.image_url ? (
                                <img src={post.image_url} alt="Locked Photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--v2-text-variant)' }}>
                                   <span className="material-symbols-outlined" style={{ fontSize: '48px', opacity: 0.5 }}>play_circle</span>
                                </div>
                              )}
                              <div style={{ 
                                position: 'absolute',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                color: 'white',
                                textShadow: '0 2px 4px rgba(0,0,0,0.8)'
                              }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '48px' }}>lock</span>
                                <div style={{ textAlign: 'center' }}>
                                   <p style={{ fontWeight: 600, margin: 0, fontSize: '16px' }}>Exclusive {post.thumbnail_url ? 'Video' : 'Photo'}</p>
                                   <p style={{ fontSize: '14px', margin: '4px 0 0', opacity: 0.9 }}>Available for {post.requiredTierName}</p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div style={{ position: 'relative' }}>
                            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--v2-primary)', fontSize: '16px', margin: 0, filter: 'blur(8px)', opacity: 0.3, userSelect: 'none' }}>
                              ██████████ █████ ███████
                              █████ ██████████ ████
                              ██████████ █████ ███████
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
                      
                      <PostEngagementBar 
                        postId={post.id} 
                        initialLikes={post.likesCount}
                        initialComments={post.commentsCount}
                        initialUserHasLiked={post.userHasLiked}
                        hasAccess={post.hasAccess}
                      />
                      
                      {post.has_poll && post.hasAccess && <PollBlock postId={post.id} />}
                      
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <ReportPostButton postId={post.id} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
              </>
            }
          />

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
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 767px) {
          .v2-profile-main {
            padding-bottom: 120px !important;
          }
        }
      `}} />
    </div>
  );

  if (isAppView && userRole) {
    return (
      <div className="v2-dashboard-layout">
        <DashboardSidebar role={userRole} />
        <MobileNav role={userRole} />
        {content}
      </div>
    );
  }

  return content;
}
