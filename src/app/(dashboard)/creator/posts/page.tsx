'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import MobileNav from '@/components/MobileNav';
import VideoPlayer from '@/components/VideoPlayer';
import Link from 'next/link';

export default function CreatorPostsPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('Creator');
  const [avatarUrl, setAvatarUrl] = useState('');

  const supabase = createClient();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, creatorRes] = await Promise.all([
        supabase.from('profiles').select('avatar_url, display_name, full_name').eq('id', user.id).single(),
        supabase.from('creator_profiles').select('display_name').eq('id', user.id).single()
      ]);

      if (profileRes?.data) {
        setAvatarUrl(profileRes.data.avatar_url || '');
        setDisplayName(creatorRes?.data?.display_name || profileRes.data.display_name || profileRes.data.full_name || 'Creator');
      }

      const { data: tierData } = await supabase.from('tiers').select('*').eq('creator_id', user.id).eq('is_active', true).order('amount', { ascending: true });
      setTiers(tierData || []);

      const res = await fetch(`/api/posts?creatorId=${user.id}`);
      const json = await res.json();
      if (json.data) setPosts(json.data);
    } catch (err: any) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try { const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' }); if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Failed'); } await fetchData(); }
    catch (err: any) { alert(err.message); }
  };

  if (loading) {
    return (
      <div className="v2-dashboard-layout" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <span className="spinner" style={{ width: '32px', height: '32px', borderColor: 'rgba(0,0,0,0.1)', borderTopColor: 'var(--v2-primary)' }} />
      </div>
    );
  }

  return (
    <main className="v2-main-content" style={{ maxWidth: '800px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', borderBottom: '1px solid var(--v2-outline)', paddingBottom: '16px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 600, color: 'var(--v2-primary)', margin: 0, letterSpacing: '-0.01em' }}>
            Posts Feed
          </h1>
          <Link 
            href="/creator/posts/compose"
            style={{
              background: 'var(--v2-primary)',
              color: 'var(--v2-on-primary)',
              borderRadius: '8px',
              padding: '10px 24px',
              fontWeight: 600,
              fontSize: '14px',
              border: 'none',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Create Post
          </Link>
        </header>

        {/* Published Posts */}
        {posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px', background: 'var(--v2-surface-lowest)', border: '1px solid var(--v2-outline)', borderRadius: '12px', color: 'var(--v2-text-variant)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }}>article</span>
            <p style={{ fontSize: '16px', fontWeight: 500 }}>No posts yet</p>
            <p style={{ fontSize: '14px', marginTop: '4px' }}>Create your first post to get started.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {posts.map(post => {
              const requiredTier = !post.is_public && tiers.find((t: any) => t.amount === post.minimum_tier_amount);
              return (
                <div key={post.id} style={{ background: 'var(--v2-surface-lowest)', border: '1px solid var(--v2-outline)', borderRadius: '12px', padding: '20px', transition: 'all 0.2s', boxShadow: '0px 4px 20px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: 'var(--v2-primary)' }}>{post.title}</h3>
                      <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '999px', background: post.is_public ? 'var(--v2-surface-low)' : 'var(--v2-surface-container)', color: post.is_public ? 'var(--v2-text-variant)' : 'var(--v2-primary)', fontWeight: 600 }}>
                        {post.is_public ? 'Public' : (requiredTier ? `${requiredTier.name} +` : 'Subscribers')}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Link href={`/creator/posts/compose?edit=${post.id}`} style={{ padding: '6px 14px', background: 'var(--v2-surface-low)', border: '1px solid var(--v2-outline)', borderRadius: '6px', fontSize: '12px', fontWeight: 600, textDecoration: 'none', color: 'var(--v2-primary)' }}>Edit</Link>
                      <button onClick={() => handleDeletePost(post.id)} style={{ padding: '6px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: '#dc2626' }}>Delete</button>
                    </div>
                  </div>

                  {post.image_url && (
                    <div style={{ marginBottom: '12px', borderRadius: '8px', overflow: 'hidden', maxHeight: '240px', background: '#000' }}>
                      {post.image_url.includes('/video/') ? (
                        <VideoPlayer src={post.image_url} poster={post.thumbnail_url} style={{ maxHeight: '240px' }} />
                      ) : (
                        <img src={post.image_url} alt="" style={{ width: '100%', maxHeight: '240px', objectFit: 'cover' }} />
                      )}
                    </div>
                  )}

                  <p style={{ color: 'var(--v2-text-variant)', whiteSpace: 'pre-wrap', fontSize: '14px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {post.content}
                  </p>
                  <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--v2-text-variant)' }}>
                    Published {new Date(post.created_at).toLocaleDateString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
  );
}
