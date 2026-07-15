import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import DonationModalWrapper from './DonationModalWrapper'; // A client component to manage modal state

export const dynamic = 'force-dynamic';

export default async function FundraiserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    notFound();
  }

  const supabase = await createClient();
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const adminSupabase = createAdminClient();

  const { data: fundraiser, error: fundraiserError } = await supabase
    .from('fundraisers')
    .select(`
      *,
      profiles (
        avatar_url
      )
    `)
    .eq('id', id)
    .single();

  if (fundraiserError || !fundraiser) {
    notFound();
  }

  const { data: creatorProfile } = await supabase
    .from('creator_profiles')
    .select('id, slug, is_verified, display_name')
    .eq('id', fundraiser.creator_id)
    .single();

  if (!creatorProfile) {
    notFound();
  }

  const { data: topDonations } = await adminSupabase
    .from('donations')
    .select('id, fundraiser_id, donor_name, donor_note, amount')
    .eq('fundraiser_id', id)
    .eq('status', 'success')
    .order('amount', { ascending: false })
    .limit(10);

  const displayName = creatorProfile.display_name || 'Creator';
  const avatarUrl = (fundraiser.profiles as any)?.avatar_url;

  const targetAmount = fundraiser.target_amount / 100;
  const currentAmount = fundraiser.current_amount / 100;
  const progress = targetAmount > 0 ? Math.min(100, Math.round((currentAmount / targetAmount) * 100)) : 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--v2-background)', fontFamily: 'inherit' }}>
      {/* Immersive Header Backdrop */}
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        height: '400px', 
        background: 'linear-gradient(180deg, var(--v2-surface-high) 0%, var(--v2-background) 100%)', 
        zIndex: 0 
      }}></div>

      {/* Navigation */}
      <nav style={{ position: 'relative', zIndex: 10, padding: '24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/" style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--v2-primary)', textDecoration: 'none' }}>MyAzaa</Link>
        <Link href={`/c/${creatorProfile.slug}`} style={{ padding: '10px 24px', fontSize: '14px', fontWeight: 600, color: 'var(--v2-primary)', background: 'var(--v2-surface-lowest)', border: '1px solid var(--v2-outline)', borderRadius: '99px', textDecoration: 'none', transition: 'all 0.2s' }}>
          Visit Creator Profile
        </Link>
      </nav>

      <main style={{ position: 'relative', zIndex: 10, maxWidth: '800px', margin: '0 auto', padding: '40px 24px 120px 24px' }}>
        
        {/* Creator Attribution */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--v2-surface-lowest)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--v2-surface-high)', color: 'var(--v2-text-variant)', fontWeight: 700 }}>
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <span style={{ fontSize: '15px', color: 'var(--v2-text-variant)', fontWeight: 500 }}>
            Fundraiser by <Link href={`/c/${creatorProfile.slug}`} style={{ color: 'var(--v2-primary)', fontWeight: 700, textDecoration: 'none' }}>{displayName}</Link>
            {creatorProfile.is_verified && <span style={{ color: 'var(--v2-green)', marginLeft: '4px' }}>✓</span>}
          </span>
        </div>

        {/* Campaign Title & Description */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 style={{ fontSize: '48px', fontWeight: 800, color: 'var(--v2-primary)', letterSpacing: '-0.02em', marginBottom: '16px', lineHeight: 1.1 }}>
            {fundraiser.title}
          </h1>
          <p style={{ fontSize: '18px', color: 'var(--v2-text-variant)', maxWidth: '600px', margin: '0 auto', lineHeight: 1.5 }}>
            {fundraiser.description}
          </p>
        </div>

        {/* Progress & Action Card */}
        <div style={{ background: 'var(--v2-surface-lowest)', border: '1px solid var(--v2-outline)', borderRadius: '32px', padding: '48px', boxShadow: '0 24px 48px rgba(0,0,0,0.03)', marginBottom: '48px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
            <div>
              <span style={{ fontSize: '36px', fontWeight: 800, color: 'var(--v2-primary)', letterSpacing: '-0.02em' }}>
                ₦{currentAmount.toLocaleString()}
              </span>
              <span style={{ fontSize: '16px', color: 'var(--v2-text-variant)', marginLeft: '8px', fontWeight: 500 }}>raised</span>
            </div>
            <div style={{ fontSize: '16px', color: 'var(--v2-text-variant)', fontWeight: 600 }}>
              of ₦{targetAmount.toLocaleString()} goal
            </div>
          </div>

          <div style={{ height: '16px', background: 'var(--v2-surface-container)', borderRadius: '999px', overflow: 'hidden', marginBottom: '32px' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--v2-green)', transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
          </div>

          <DonationModalWrapper creatorId={creatorProfile.id} fundraiserId={fundraiser.id} title={fundraiser.title} />
        </div>

        {/* Leaderboard Section */}
        {fundraiser.show_leaderboard && topDonations && topDonations.length > 0 && (
          <div style={{ padding: '0 16px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--v2-primary)', marginBottom: '24px', letterSpacing: '-0.01em' }}>Top Supporters</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {topDonations.map((d, index) => {
                let badgeColor = 'var(--v2-surface-low)';
                let textColor = 'var(--v2-text-variant)';
                let border = '1px solid var(--v2-outline)';
                
                if (index === 0) { badgeColor = 'rgba(234, 179, 8, 0.15)'; textColor = '#ca8a04'; border = '1px solid rgba(234, 179, 8, 0.3)'; } // Gold
                if (index === 1) { badgeColor = 'rgba(148, 163, 184, 0.15)'; textColor = '#64748b'; border = '1px solid rgba(148, 163, 184, 0.3)'; } // Silver
                if (index === 2) { badgeColor = 'rgba(180, 83, 9, 0.15)'; textColor = '#92400e'; border = '1px solid rgba(180, 83, 9, 0.3)'; } // Bronze

                return (
                  <div key={d.id} className="v2-leaderboard-item" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px', borderRadius: '20px', background: 'var(--v2-surface-lowest)', border: border, transition: 'transform 0.2s', cursor: 'default' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: badgeColor, color: textColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '16px' }}>
                      #{index + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 700, color: 'var(--v2-primary)', fontSize: '16px' }}>
                        {d.donor_name || 'Anonymous Fan'} <span style={{ color: 'var(--v2-green)', fontWeight: 600 }}>donated ₦{(d.amount / 100).toLocaleString()}</span>
                      </p>
                      {d.donor_note && (
                        <p style={{ margin: '6px 0 0 0', color: 'var(--v2-text-variant)', fontSize: '15px', lineHeight: 1.4 }}>"{d.donor_note}"</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
