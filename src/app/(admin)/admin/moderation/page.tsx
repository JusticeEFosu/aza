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
          <h1 style={{ fontSize: '32px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', marginBottom: '8px', letterSpacing: '-0.02em' }}>Moderation Queue</h1>
          <p style={{ color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '16px' }}>Review and take action on content reported by fans.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '24px' }}>
        {!reports || reports.length === 0 ? (
          <div style={{ padding: '64px', textAlign: 'center', background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>check_circle</span>
            </div>
            <h3 style={{ fontSize: '20px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', margin: '0 0 8px 0' }}>All Caught Up!</h3>
            <p style={{ color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)', margin: 0 }}>There are no pending reports in the queue.</p>
          </div>
        ) : (
          reports.map((report: any) => {
            const post = Array.isArray(report.posts) ? report.posts[0] : report.posts;
            const reporter = Array.isArray(report.profiles) ? report.profiles[0] : report.profiles;
            const creator = post ? creatorsMap[post.creator_id] : null;

            return (
              <div key={report.id} style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <div style={{ padding: '16px 24px', background: '#ffdad6', borderBottom: '1px solid #ba1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ba1a1a', fontWeight: 700, fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>flag</span>
                    Reported for: {report.reason}
                  </div>
                  <div style={{ fontSize: '12px', color: '#ba1a1a', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
                    {new Date(report.created_at).toLocaleString()} by {reporter?.full_name || 'Unknown'} ({reporter?.email})
                  </div>
                </div>

                <div style={{ padding: '24px', display: 'flex', gap: '24px' }}>
                  {/* Post Preview */}
                  <div style={{ flex: 1 }}>
                    {post ? (
                      <>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '18px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30' }}>{post.title}</h4>
                        <div style={{ fontSize: '14px', color: '#6f7a72', fontFamily: 'var(--font-body, Inter, sans-serif)', marginBottom: '16px' }}>
                          Posted by: <strong style={{ color: '#0b1c30' }}>{creator?.full_name || 'Unknown Creator'}</strong> ({creator?.email})
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
                        
                        <p style={{ margin: 0, color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)', whiteSpace: 'pre-wrap', fontSize: '15px', lineHeight: 1.6, padding: '16px', background: '#f8f9ff', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                          {post.content}
                        </p>
                      </>
                    ) : (
                      <div style={{ color: '#6f7a72', fontFamily: 'var(--font-body, Inter, sans-serif)', fontStyle: 'italic' }}>Post has already been deleted.</div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ width: '200px', display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '1px solid #E2E8F0', paddingLeft: '24px' }}>
                    <form action="/api/admin/moderation/resolve" method="POST">
                      <input type="hidden" name="reportId" value={report.id} />
                      <input type="hidden" name="postId" value={post?.id || ''} />
                      <input type="hidden" name="action" value="delete" />
                      <button type="submit" style={{ width: '100%', background: '#ba1a1a', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 600, fontFamily: 'var(--font-body, Inter, sans-serif)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                        Delete Post
                      </button>
                    </form>

                    <form action="/api/admin/moderation/resolve" method="POST">
                      <input type="hidden" name="reportId" value={report.id} />
                      <input type="hidden" name="action" value="dismiss" />
                      <button type="submit" className="az-btn-secondary" style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                        Dismiss Report
                      </button>
                    </form>
                    
                    {creator?.id && (
                      <Link href="/admin/users" className="az-btn-secondary" style={{ textAlign: 'center', padding: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px' }}>
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
