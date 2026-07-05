import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ModerationPage() {
  const supabaseAdmin = createAdminClient();

  // Fetch pending reports with post info and reporter info
  // Since we only have basic foreign keys, we query reports and join profiles and posts
  const { data: reports } = await supabaseAdmin
    .from('content_reports')
    .select(`
      id,
      reason,
      status,
      created_at,
      profiles!reporter_id ( full_name, email ),
      posts!post_id ( id, title, content, image_url, thumbnail_url, creator_id )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  // Get the creator info for the posts
  const creatorIds = reports?.map(r => {
    const post: any = Array.isArray(r.posts) ? r.posts[0] : r.posts;
    return post?.creator_id;
  }).filter(Boolean) || [];
  
  let creatorsMap: Record<string, any> = {};
  if (creatorIds.length > 0) {
    const { data: creators } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .in('id', creatorIds);
      
    creatorsMap = (creators || []).reduce((acc: any, c: any) => {
      acc[c.id] = c;
      return acc;
    }, {});
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--v2-primary)', marginBottom: '8px', letterSpacing: '-0.02em' }}>Moderation Queue</h1>
          <p style={{ color: 'var(--v2-text-variant)', fontSize: '16px' }}>Review and take action on content reported by fans.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '24px' }}>
        {!reports || reports.length === 0 ? (
          <div style={{ padding: '64px', textAlign: 'center', background: 'var(--v2-surface)', border: '1px solid var(--v2-outline)', borderRadius: '16px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--v2-green)', marginBottom: '16px' }}>check_circle</span>
            <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--v2-primary)', margin: '0 0 8px 0' }}>All Caught Up!</h3>
            <p style={{ color: 'var(--v2-text-variant)', margin: 0 }}>There are no pending reports in the queue.</p>
          </div>
        ) : (
          reports.map((report: any) => {
            const post = Array.isArray(report.posts) ? report.posts[0] : report.posts;
            const reporter = Array.isArray(report.profiles) ? report.profiles[0] : report.profiles;
            const creator = post ? creatorsMap[post.creator_id] : null;

            return (
              <div key={report.id} style={{ background: 'var(--v2-surface)', border: '1px solid var(--v2-outline)', borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ padding: '16px 24px', background: '#fff5f5', borderBottom: '1px solid #fed7d7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c53030', fontWeight: 600 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>flag</span>
                    Reported for: {report.reason}
                  </div>
                  <div style={{ fontSize: '12px', color: '#c53030' }}>
                    {new Date(report.created_at).toLocaleString()} by {reporter?.full_name || 'Unknown'} ({reporter?.email})
                  </div>
                </div>

                <div style={{ padding: '24px', display: 'flex', gap: '24px' }}>
                  {/* Post Preview */}
                  <div style={{ flex: 1 }}>
                    {post ? (
                      <>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '18px', color: 'var(--v2-primary)' }}>{post.title}</h4>
                        <div style={{ fontSize: '14px', color: 'var(--v2-text-variant)', marginBottom: '16px' }}>
                          Posted by: <strong>{creator?.full_name || 'Unknown Creator'}</strong> ({creator?.email})
                        </div>
                        
                        {(post.image_url || post.thumbnail_url) && (
                           <div style={{ marginBottom: '16px', borderRadius: '8px', overflow: 'hidden', maxWidth: '300px', background: '#000' }}>
                             {post.thumbnail_url ? (
                               <img src={post.thumbnail_url} alt="Video Thumbnail" style={{ width: '100%', height: 'auto', display: 'block', opacity: 0.8 }} />
                             ) : (
                               <img src={post.image_url} alt="Post image" style={{ width: '100%', height: 'auto', display: 'block' }} />
                             )}
                           </div>
                        )}
                        
                        <p style={{ margin: 0, color: 'var(--v2-text)', whiteSpace: 'pre-wrap', fontSize: '15px', lineHeight: 1.6, padding: '16px', background: 'var(--v2-surface-lowest)', borderRadius: '8px', border: '1px solid var(--v2-outline)' }}>
                          {post.content}
                        </p>
                      </>
                    ) : (
                      <div style={{ color: 'var(--v2-text-variant)', fontStyle: 'italic' }}>Post has already been deleted.</div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ width: '200px', display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '1px solid var(--v2-outline)', paddingLeft: '24px' }}>
                    <form action="/api/admin/moderation/resolve" method="POST">
                      <input type="hidden" name="reportId" value={report.id} />
                      <input type="hidden" name="postId" value={post?.id || ''} />
                      <input type="hidden" name="action" value="delete" />
                      <button type="submit" className="v2-btn" style={{ width: '100%', background: '#ef4444', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                        Delete Post
                      </button>
                    </form>

                    <form action="/api/admin/moderation/resolve" method="POST">
                      <input type="hidden" name="reportId" value={report.id} />
                      <input type="hidden" name="action" value="dismiss" />
                      <button type="submit" className="v2-btn v2-btn-secondary" style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                        Dismiss Report
                      </button>
                    </form>
                    
                    {creator?.id && (
                      <Link href="/admin/users" className="v2-btn v2-btn-outline" style={{ textAlign: 'center', padding: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>group</span>
                        View Creator
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
