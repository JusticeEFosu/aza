'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function FundraisersEditorialGrid({ initialFundraisers }: { initialFundraisers: any[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [fundraisersList, setFundraisersList] = useState(initialFundraisers);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const isFirstRender = useRef(true);

  const fetchFundraisers = async (query: string) => {
    setLoading(true);
    let request = supabase
      .from('fundraisers')
      .select(`
        id,
        title,
        description,
        target_amount,
        current_amount,
        creator_id,
        profiles!inner ( full_name, display_name, avatar_url, is_suspended, admin_role )
      `)
      .eq('is_active', true)
      .eq('profiles.is_suspended', false)
      .is('profiles.admin_role', null)
      .order('created_at', { ascending: false });

    if (query.trim()) {
      request = request.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
    }

    const { data } = await request.limit(30);
    if (data) {
      setFundraisersList(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      fetchFundraisers(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div style={{ padding: '16px 0 48px 0' }}>
      <div style={{ marginBottom: '40px', maxWidth: '640px', margin: '0 auto 48px auto' }}>
        <div style={{ position: 'relative' }}>
          <span className="material-symbols-outlined" style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: 'var(--az-outline)', fontSize: '20px' }}>
            search
          </span>
          <input 
            type="text" 
            placeholder="Search causes or descriptions..."
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

      {fundraisersList.length === 0 ? (
        <div className="az-card" style={{ textAlign: 'center', padding: '64px 24px', maxWidth: '500px', margin: '0 auto' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--az-outline)', marginBottom: '16px', display: 'block' }}>search_off</span>
          <h3 className="az-h3" style={{ marginBottom: '8px' }}>No causes found</h3>
          <p className="az-body" style={{ color: 'var(--az-text-muted)' }}>Try adjusting your search terms.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '32px' }}>
          {fundraisersList.map((fundraiser: any) => {
            const creatorName = fundraiser.profiles?.display_name || fundraiser.profiles?.full_name || 'Creator';
            const progressPercent = fundraiser.target_amount > 0 ? Math.min(100, Math.round((fundraiser.current_amount / fundraiser.target_amount) * 100)) : 0;
            const targetNaira = fundraiser.target_amount / 100;
            const currentNaira = fundraiser.current_amount / 100;
            
            // Extract a short excerpt from description
            const excerpt = fundraiser.description ? fundraiser.description.substring(0, 120) + (fundraiser.description.length > 120 ? '...' : '') : 'Support this cause.';

            return (
              <Link
                key={fundraiser.id}
                href={`/fundraiser/${fundraiser.id}`}
                className="az-card az-card-interactive"
                style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', padding: '28px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {fundraiser.profiles?.avatar_url ? (
                      <img 
                        src={fundraiser.profiles.avatar_url} 
                        alt={creatorName} 
                        style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '50%' }} 
                      />
                    ) : (
                      <div style={{ width: '36px', height: '36px', background: 'var(--az-surface-low)', color: 'var(--az-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700 }}>
                        {creatorName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="az-label" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--az-text-main)' }}>
                      {creatorName}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', background: 'var(--az-surface-low)', color: 'var(--az-primary)', padding: '3px 10px', borderRadius: '9999px' }}>
                    Cause
                  </span>
                </div>

                <h3 className="az-h3" style={{ fontSize: '20px', marginBottom: '12px', lineHeight: 1.3 }}>
                  {fundraiser.title}
                </h3>
                
                <p className="az-body" style={{ fontSize: '14px', color: 'var(--az-text-muted)', marginBottom: '24px', flexGrow: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5 }}>
                  {excerpt}
                </p>

                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--az-primary)' }}>
                      ₦{currentNaira.toLocaleString()}
                    </span>
                    <span style={{ fontSize: '13px', color: 'var(--az-text-muted)', fontWeight: 500 }}>
                      of ₦{targetNaira.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'var(--az-surface-low)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: progressPercent + '%', background: 'var(--az-primary)', borderRadius: '9999px', transition: 'width 0.5s ease' }}></div>
                  </div>
                </div>

                <div style={{ marginTop: '20px' }}>
                  <span className="az-btn-primary" style={{ width: '100%', padding: '10px 16px', fontSize: '14px' }}>
                    Donate to Cause
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
