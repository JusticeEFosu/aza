import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import VideoPlayer from '@/components/VideoPlayer';
import { getEmbedUrl } from '@/lib/utils/embed';
import Link from 'next/link';
import MobileNav from '@/components/MobileNav';
import ExpandableText from '@/components/ExpandableText';
import ReportPostButton from '@/components/ReportPostButton';
import PostEngagementBar from '@/components/posts/PostEngagementBar';

export default async function FanFeed() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, display_name, role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'fan') redirect('/creator');

  // Fetch active subscriptions with tier data to determine access
  const now = new Date().toISOString();
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select(`
      creator_id,
      tiers ( name, amount )
    `)
    .eq('fan_id', user.id)
    .or(`status.eq.active,and(status.eq.cancelled,current_period_end.gt.${now})`);

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
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const adminSupabase = createAdminClient();
    const { data: rawPosts } = await adminSupabase
      .from('posts')
      .select(`
        *,
        likes:post_likes(count),
        comments:post_comments(count),
        creator_profiles (
          slug,
          display_name,
          profiles ( full_name, display_name, avatar_url )
        )
      `)
      .in('creator_id', creatorIds)
      .order('created_at', { ascending: false })
      .limit(30);
      
    // Fetch user's liked posts
    let userLikedPostIds: string[] = [];
    const { data: likedPosts } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', user.id);
    userLikedPostIds = likedPosts?.map(p => p.post_id) || [];

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
        requiredTierName: tierNamesByAmount[post.minimum_tier_amount] || 'Higher Tier',
        content: hasAccess ? post.content : '',
        image_url: secureImageUrl,
        thumbnail_url: secureThumbnailUrl,
        likesCount: post.likes?.[0]?.count || 0,
        commentsCount: post.comments?.[0]?.count || 0,
        userHasLiked: userLikedPostIds.includes(post.id)
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
        display_name,
        profiles ( full_name, display_name, avatar_url )
      `)
      .order('subscriber_count', { ascending: false })
      .limit(3);
    featuredCreators = creators || [];
  }

  return (
    <main className="v2-fan-main">
        <div className="v2-fan-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <header style={{ marginBottom: '32px' }}>
            <h1 className="v2-dash-title">Your Feed</h1>
            <p className="v2-dash-desc">Latest posts from creators you support.</p>
          </header>

          {posts.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <div style={{ textAlign: 'center', padding: '48px 24px', border: '1px dashed var(--v2-outline)', borderRadius: '12px' }}>
                <p style={{ color: 'var(--v2-text-variant)', marginBottom: '8px' }}>Your home feed will show posts from creators you support.</p>
                <p style={{ fontWeight: 600 }}>Explore these featured creators to get started.</p>
              </div>

              <div className="v2-subs-grid">
                {featuredCreators.map((creator: any) => {
                  const name = creator.display_name || creator.profiles?.display_name || creator.profiles?.full_name;
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {posts.map((post: any) => {
                const creatorName = post.creator_profiles?.display_name || post.creator_profiles?.profiles?.display_name || post.creator_profiles?.profiles?.full_name || 'Unknown';
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
                           <><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>diamond</span> {post.requiredTierName} Perk (Unlocked)</>
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
                        <ExpandableText text={post.content || ''} maxLength={250} />
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
                                 <p style={{ fontSize: '14px', margin: '4px 0 0', opacity: 0.9 }}>Upgrade to {post.requiredTierName} to view</p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div style={{ position: 'relative' }}>
                          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, filter: 'blur(8px)', opacity: 0.3, userSelect: 'none', margin: 0 }}>
                            ██████████ █████ ███████
                            █████ ██████████ ████
                            ██████████ █████ ███████
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
                    
                    <PostEngagementBar 
                      postId={post.id} 
                      initialLikes={post.likesCount}
                      initialComments={post.commentsCount}
                      initialUserHasLiked={post.userHasLiked}
                      hasAccess={post.hasAccess}
                    />
                    
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <ReportPostButton postId={post.id} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
    </main>
  );
}
