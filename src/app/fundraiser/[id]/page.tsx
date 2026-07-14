import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import FundraiserCard from '@/components/FundraiserCard';

export const dynamic = 'force-dynamic';

export default async function FundraiserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Basic UUID validation before querying
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    notFound();
  }

  const supabase = await createClient();
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const adminSupabase = createAdminClient();

  // 1. Fetch Fundraiser and Creator Profile
  const { data: fundraiser, error: fundraiserError } = await supabase
    .from('fundraisers')
    .select(`
      *,
      creator:creator_profiles!inner(
        id,
        slug,
        is_verified,
        profiles (
          full_name,
          avatar_url
        )
      )
    `)
    .eq('id', id)
    .single();

  if (fundraiserError || !fundraiser) {
    notFound();
  }

  // 2. Fetch Top 10 Donations
  const { data: topDonations } = await adminSupabase
    .from('donations')
    .select('id, fundraiser_id, donor_name, donor_note, amount')
    .eq('fundraiser_id', id)
    .eq('status', 'success')
    .order('amount', { ascending: false })
    .limit(10);

  const creator = fundraiser.creator as any;
  const displayName = creator.profiles?.full_name || 'Creator';
  const avatarUrl = creator.profiles?.avatar_url;

  return (
    <div className="v2-profile-page" style={{ minHeight: '100vh', background: 'var(--v2-background)' }}>
      {/* Minimal TopNavBar */}
      <nav className="v2-profile-nav">
        <div className="v2-profile-nav-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <Link href="/" style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--v2-primary)', textDecoration: 'none' }}>MyAzaa</Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link href={`/c/${creator.slug}`} className="v2-sub-btn" style={{ padding: '8px 24px', fontSize: '14px', border: '1px solid var(--v2-outline)' }}>
              Visit Creator Profile
            </Link>
          </div>
        </div>
      </nav>

      <main style={{ width: '100%', padding: '64px 16px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '720px' }}>
          
          {/* Creator Attribution */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px', padding: '16px', background: 'var(--v2-surface-low)', borderRadius: '16px', border: '1px solid var(--v2-outline)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', background: 'var(--v2-surface-high)', flexShrink: 0 }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 600, color: 'var(--v2-text-variant)' }}>
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: 'var(--v2-text-variant)' }}>Fundraiser created by</p>
              <Link href={`/c/${creator.slug}`} style={{ fontSize: '16px', fontWeight: 600, color: 'var(--v2-primary)', textDecoration: 'none' }}>
                {displayName}
                {creator.is_verified && <span style={{ color: 'var(--v2-green)', marginLeft: '4px' }}>✓</span>}
              </Link>
            </div>
          </div>

          {/* The Actual Fundraiser Card */}
          <FundraiserCard 
            fundraiser={fundraiser}
            creatorId={creator.id}
            donations={topDonations || []}
          />
          
        </div>
      </main>
    </div>
  );
}
