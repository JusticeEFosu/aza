'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function CreatorsGrid({ initialCreators }: { initialCreators: any[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [creatorsList, setCreatorsList] = useState(initialCreators);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialCreators.length >= 20);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const isFirstRender = useRef(true);

  const fetchCreators = async (pageNum: number, query: string, append = false) => {
    setLoading(true);
    let request = supabase
      .from('creator_profiles')
      .select(`
        slug,
        id,
        slug,
        bio,
        subscriber_count,
        display_name,
        profiles!inner ( full_name, avatar_url, is_suspended, admin_role )
      `)
      .eq('profiles.is_suspended', false)
      .is('profiles.admin_role', null)
      .order('created_at', { ascending: false });

    if (query.trim()) {
      request = request.or(`display_name.ilike.%${query}%,bio.ilike.%${query}%`);
    }

    const pageSize = 20;
    const from = (pageNum - 1) * pageSize;
    const to = from + pageSize - 1;
    request = request.range(from, to);

    const { data } = await request;
    if (data) {
      if (append) {
        setCreatorsList(prev => [...prev, ...data]);
      } else {
        setCreatorsList(data);
      }
      setHasMore(data.length === pageSize);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setPage(1);
      fetchCreators(1, searchQuery, false);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchCreators(nextPage, searchQuery, true);
  };

  return (
    <div style={{ padding: '32px 0' }}>
      <div style={{ marginBottom: '32px', maxWidth: '600px', margin: '0 auto 48px auto' }}>
        <div style={{ position: 'relative' }}>
          <span className="material-symbols-outlined" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--v2-text-variant)' }}>
            search
          </span>
          <input 
            type="text" 
            placeholder="Search creators by name or bio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '16px 16px 16px 48px', 
              fontSize: '16px', 
              borderRadius: '99px', 
              border: '1px solid var(--v2-outline)', 
              background: 'var(--v2-surface)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {creatorsList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px', background: 'var(--v2-surface-low)', borderRadius: '16px', border: '1px solid var(--v2-outline)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--v2-text-variant)', marginBottom: '16px', display: 'block' }}>search_off</span>
          <h3 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 8px 0' }}>No creators found</h3>
          <p style={{ color: 'var(--v2-text-variant)' }}>Try adjusting your search query.</p>
        </div>
      ) : (
        <div className="v2-subs-grid">
          {creatorsList.map((creator: any) => {
            const name = creator.display_name || creator.profiles?.display_name || creator.profiles?.full_name || 'Creator';
            return (
              <Link
                key={creator.slug}
                href={`/c/${creator.slug}`}
                className="v2-sub-card"
                style={{ alignItems: 'center', textAlign: 'center', textDecoration: 'none', borderTopColor: 'transparent', transition: 'transform 0.2s, box-shadow 0.2s' }}
              >
                <div className="v2-sub-avatar" style={{ marginBottom: '16px', width: '96px', height: '96px' }}>
                  {creator.profiles?.avatar_url ? (
                    <img 
                      src={creator.profiles.avatar_url} 
                      alt="" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} 
                    />
                  ) : (
                    <span style={{ fontSize: '32px' }}>{name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 700, color: 'var(--v2-primary)' }}>{name}</h4>
                <p style={{ fontSize: '14px', color: 'var(--v2-text-variant)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                  {creator.bio || 'Sharing exclusive content with fans.'}
                </p>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-primary)', background: 'var(--v2-surface-low)', padding: '6px 12px', borderRadius: '99px', marginTop: 'auto' }}>
                  {creator.subscriber_count || 0} Subscriber{creator.subscriber_count === 1 ? '' : 's'}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: '48px' }}>
          <button 
            onClick={handleLoadMore} 
            disabled={loading}
            className="v2-sub-btn v2-sub-btn-primary"
            style={{ padding: '12px 32px', display: 'inline-flex', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}
