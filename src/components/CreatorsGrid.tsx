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
    <div style={{ padding: '16px 0 48px 0' }}>
      <div style={{ marginBottom: '40px', maxWidth: '640px', margin: '0 auto 48px auto' }}>
        <div style={{ position: 'relative' }}>
          <span className="material-symbols-outlined" style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: 'var(--az-outline)', fontSize: '20px' }}>
            search
          </span>
          <input 
            type="text" 
            placeholder="Search creators by name or bio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '16px 20px 16px 52px', 
              fontSize: '16px', 
              borderRadius: '9999px', 
              border: '1px solid var(--az-border)', 
              background: '#ffffff',
              boxShadow: 'var(--az-shadow-card)',
              outline: 'none',
              color: 'var(--az-text-main)',
              fontFamily: 'var(--font-body)'
            }}
          />
        </div>
      </div>

      {creatorsList.length === 0 ? (
        <div className="az-card" style={{ textAlign: 'center', padding: '64px 24px', maxWidth: '500px', margin: '0 auto' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--az-outline)', marginBottom: '16px', display: 'block' }}>search_off</span>
          <h3 className="az-h3" style={{ marginBottom: '8px' }}>No creators found</h3>
          <p className="az-body" style={{ color: 'var(--az-text-muted)' }}>Try adjusting your search query.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '24px' }}>
          {creatorsList.map((creator: any) => {
            const name = creator.display_name || creator.profiles?.display_name || creator.profiles?.full_name || 'Creator';
            const subCount = creator.subscriber_count || 0;
            const displaySubscribers = subCount > 999
              ? (subCount / 1000).toFixed(1) + 'k'
              : subCount;

            return (
              <Link
                key={creator.slug || creator.id}
                href={`/c/${creator.slug}`}
                className="az-card az-card-interactive"
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', textDecoration: 'none' }}
              >
                <div style={{ position: 'relative', marginBottom: '16px', width: '96px', height: '96px', borderRadius: '50%', padding: '2px', border: '2px solid rgba(0, 78, 52, 0.15)' }}>
                  {creator.profiles?.avatar_url ? (
                    <img 
                      src={creator.profiles.avatar_url} 
                      alt={name} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} 
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--az-surface-low)', color: 'var(--az-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '32px' }}>
                      {name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                
                <h3 className="az-h3" style={{ fontSize: '18px', marginBottom: '4px' }}>{name}</h3>
                
                <span style={{ display: 'inline-block', background: 'var(--az-surface-low)', color: 'var(--az-primary)', fontSize: '12px', fontWeight: 600, padding: '2px 10px', borderRadius: '9999px', marginBottom: '12px' }}>
                  {creator.category || 'Creator'}
                </span>

                <p className="az-body" style={{ fontSize: '14px', color: 'var(--az-text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '20px', lineHeight: 1.5 }}>
                  {creator.bio || 'Sharing exclusive content with fans.'}
                </p>

                <div style={{ marginTop: 'auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '12px', borderTop: '1px solid var(--az-border)' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--az-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>group</span>
                    {displaySubscribers} Subscriber{subCount === 1 ? '' : 's'}
                  </span>
                  <span className="az-btn-primary" style={{ padding: '8px 16px', fontSize: '13px', width: '100%' }}>
                    View Profile
                  </span>
                </div>
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
            className="az-btn-primary"
            style={{ padding: '12px 32px', display: 'inline-flex', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Loading...' : 'Load More Creators'}
          </button>
        </div>
      )}
    </div>
  );
}
