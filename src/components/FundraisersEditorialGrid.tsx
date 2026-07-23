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
    <div style={{ padding: '0 16px' }}>
      <style>{`
        .editorial-masonry {
          column-count: 1;
          column-gap: 32px;
          max-width: 1200px;
          margin: 0 auto;
        }
        @media (min-width: 768px) {
          .editorial-masonry { column-count: 2; }
        }
        @media (min-width: 1024px) {
          .editorial-masonry { column-count: 3; }
        }
        .editorial-card {
          break-inside: avoid;
          margin-bottom: 32px;
          background: #ffffff;
          border-radius: 16px;
          padding: 40px 32px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.03);
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          text-decoration: none;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
          cursor: pointer;
          border: 1px solid rgba(0,0,0,0.02);
        }
        .editorial-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 40px 80px rgba(0,0,0,0.06);
        }
        .editorial-card-btn {
          opacity: 0;
          transition: opacity 0.3s ease, transform 0.3s ease;
          transform: translateY(10px);
          background: var(--v2-primary);
          color: white;
          padding: 12px 24px;
          border-radius: 99px;
          font-weight: 600;
          font-size: 14px;
          text-align: center;
          margin-top: 32px;
        }
        .editorial-card:hover .editorial-card-btn {
          opacity: 1;
          transform: translateY(0);
        }
        .editorial-progress-bg {
          width: 100%;
          height: 2px;
          background: var(--v2-outline);
          margin-top: 24px;
          border-radius: 2px;
          overflow: hidden;
        }
        .editorial-progress-fill {
          height: 100%;
          background: var(--v2-green);
          border-radius: 2px;
        }
      `}</style>

      <div style={{ marginBottom: '48px', maxWidth: '600px', margin: '0 auto 64px auto' }}>
        <div style={{ position: 'relative' }}>
          <span className="material-symbols-outlined" style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: 'var(--v2-text-variant)' }}>
            search
          </span>
          <input 
            type="text" 
            placeholder="Search causes or descriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '20px 20px 20px 56px', 
              fontSize: '16px', 
              borderRadius: '99px', 
              border: '1px solid rgba(0,0,0,0.05)', 
              background: '#fff',
              boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
              outline: 'none',
              fontFamily: 'inherit'
            }}
          />
        </div>
      </div>

      {fundraisersList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 24px', opacity: 0.5 }}>
          <h3 style={{ fontSize: '24px', fontWeight: 300, margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>No causes found</h3>
          <p style={{ fontSize: '16px' }}>Try adjusting your search terms.</p>
        </div>
      ) : (
        <div className="editorial-masonry">
          {fundraisersList.map((fundraiser: any) => {
            const creatorName = fundraiser.profiles?.display_name || fundraiser.profiles?.full_name || 'Creator';
            const progressPercent = Math.min(100, Math.round((fundraiser.current_amount / fundraiser.target_amount) * 100));
            const targetNaira = fundraiser.target_amount / 100;
            const currentNaira = fundraiser.current_amount / 100;
            
            // Extract a short excerpt from description
            const excerpt = fundraiser.description ? fundraiser.description.substring(0, 120) + (fundraiser.description.length > 120 ? '...' : '') : 'Support this cause.';

            return (
              <Link
                key={fundraiser.id}
                href={`/fundraiser/${fundraiser.id}`}
                className="editorial-card"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                  {fundraiser.profiles?.avatar_url ? (
                    <img 
                      src={fundraiser.profiles.avatar_url} 
                      alt="" 
                      style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '50%' }} 
                    />
                  ) : (
                    <div style={{ width: '32px', height: '32px', background: 'var(--v2-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '14px', fontWeight: 600 }}>
                      {creatorName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--v2-text-variant)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                    {creatorName}
                  </span>
                </div>

                <h3 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--v2-primary)', margin: '0 0 16px 0', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  {fundraiser.title}
                </h3>
                
                <p style={{ fontSize: '15px', lineHeight: 1.6, color: '#666', margin: '0 0 32px 0', fontWeight: 400 }}>
                  {excerpt}
                </p>

                <div style={{ marginTop: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--v2-primary)' }}>
                      ₦{currentNaira.toLocaleString()}
                    </span>
                    <span style={{ fontSize: '13px', color: 'var(--v2-text-variant)' }}>
                      of ₦{targetNaira.toLocaleString()}
                    </span>
                  </div>
                  <div className="editorial-progress-bg">
                    <div className="editorial-progress-fill" style={{ width: progressPercent + '%' }}></div>
                  </div>
                </div>

                <div className="editorial-card-btn">
                  Donate to this cause
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
