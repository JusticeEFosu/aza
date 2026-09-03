import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import InlineDonationForm from './InlineDonationForm';

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
    .select(`*, profiles ( avatar_url )`)
    .eq('id', id)
    .single();

  if (fundraiserError || !fundraiser) notFound();

  const { data: creatorProfile } = await supabase
    .from('creator_profiles')
    .select('id, slug, is_verified, display_name')
    .eq('id', fundraiser.creator_id)
    .single();

  if (!creatorProfile) notFound();

  const { data: topDonations } = await adminSupabase
    .from('donations')
    .select('id, fundraiser_id, donor_name, donor_note, amount')
    .eq('fundraiser_id', id)
    .eq('status', 'success')
    .order('amount', { ascending: false })
    .limit(10);

  const displayName = creatorProfile.display_name || 'Creator';
  const avatarUrl = (fundraiser.profiles as any)?.avatar_url;
  const targetAmount = fundraiser.target_amount && fundraiser.target_amount > 0 ? fundraiser.target_amount / 100 : null;
  const hasTarget = targetAmount !== null;
  const currentAmount = fundraiser.current_amount / 100;
  const isOverFunded = targetAmount !== null && currentAmount >= targetAmount;
  const progress = targetAmount !== null && targetAmount > 0 ? Math.min(100, Math.round((currentAmount / targetAmount) * 100)) : 0;
  const isHardCappedAndMet = hasTarget && fundraiser.auto_close_on_goal && targetAmount !== null && currentAmount >= targetAmount;
  const isClosed = !fundraiser.is_active || isHardCappedAndMet;

  return (
    <div className="v2-profile-page" style={{ minHeight: '100vh' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 20px 80px 20px' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <Link href="/" style={{ fontSize: '20px', fontWeight: 800, color: 'var(--v2-primary)', textDecoration: 'none' }}>MyAzaa</Link>
          <Link href={`/c/${creatorProfile.slug}`} style={{ fontSize: '13px', color: 'var(--v2-text-variant)', textDecoration: 'none' }}>View Profile →</Link>
        </div>

        {/* Creator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', background: 'var(--v2-surface-low)', flexShrink: 0 }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--v2-text-variant)', fontSize: '14px' }}>{displayName.charAt(0).toUpperCase()}</div>
            )}
          </div>
          <Link href={`/c/${creatorProfile.slug}`} style={{ fontSize: '14px', fontWeight: 600, color: 'var(--v2-primary)', textDecoration: 'none' }}>
            {displayName}{creatorProfile.is_verified && <span style={{ color: 'var(--v2-green)', marginLeft: '4px' }}>✓</span>}
          </Link>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 8px 0', lineHeight: 1.3 }}>{fundraiser.title}</h1>
        {fundraiser.description && (
          <p style={{ fontSize: '15px', color: 'var(--v2-text-variant)', lineHeight: 1.6, margin: '0 0 24px 0' }}>{fundraiser.description}</p>
        )}

        {/* Progress or Ongoing Metric */}
        {hasTarget && targetAmount !== null ? (
          <>
            <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span><strong>₦{currentAmount.toLocaleString()}</strong> raised</span>
              <span style={{ color: 'var(--v2-text-variant)' }}>₦{targetAmount.toLocaleString()} goal</span>
            </div>
            <div style={{ height: '8px', background: 'var(--v2-surface-low)', borderRadius: '4px', overflow: 'hidden', marginBottom: isOverFunded ? '8px' : '24px' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'var(--v2-green)', borderRadius: '4px', transition: 'width 1s ease' }}></div>
            </div>
            {isOverFunded && !isClosed && (
              <p style={{ fontSize: '12px', color: 'var(--v2-green)', fontWeight: 600, margin: '0 0 24px 0' }}>✦ Goal surpassed (Stretch mode)</p>
            )}
          </>
        ) : (
          <div style={{ marginBottom: '24px', background: 'var(--v2-surface-low)', padding: '16px 20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--v2-text-variant)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', fontWeight: 600 }}>Total Raised</span>
              <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--v2-green)' }}>₦{currentAmount.toLocaleString()}</span>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-green)', background: 'var(--v2-surface-container)', padding: '6px 12px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>all_inclusive</span>
              Ongoing Cause
            </span>
          </div>
        )}

        {/* Donate form or Closed Notice */}
        {isClosed ? (
          <div style={{ padding: '24px', borderRadius: '12px', background: 'var(--v2-surface-low)', border: '1px solid var(--v2-border)', textAlign: 'center', marginBottom: '24px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '36px', color: isHardCappedAndMet ? 'var(--v2-green)' : 'var(--v2-text-variant)', marginBottom: '8px', display: 'block' }}>
              {isHardCappedAndMet ? 'celebration' : 'lock'}
            </span>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 700 }}>
              {isHardCappedAndMet ? 'Goal Fully Funded!' : 'Fundraiser Closed'}
            </h3>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--v2-text-variant)' }}>
              {isHardCappedAndMet
                ? 'This fundraiser reached its target and has stopped accepting new donations. Thank you to everyone who contributed!'
                : 'This fundraiser is currently closed and no longer accepting donations.'}
            </p>
          </div>
        ) : (
          <InlineDonationForm creatorId={creatorProfile.id} fundraiserId={fundraiser.id} />
        )}

        {/* Supporters */}
        {fundraiser.show_leaderboard && topDonations && topDonations.length > 0 && (
          <div style={{ marginTop: '32px', borderTop: '1px solid var(--v2-border)', paddingTop: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--v2-text-variant)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 16px 0' }}>Top Supporters</h3>
            {topDonations.map((d, i) => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'baseline', gap: '8px', padding: '10px 0', borderBottom: i < topDonations.length - 1 ? '1px solid var(--v2-border)' : 'none', fontSize: '14px' }}>
                <span style={{ color: 'var(--v2-text-variant)', fontWeight: 600, width: '20px', flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontWeight: 600 }}>{d.donor_name || 'Anonymous'}</span>
                <span style={{ color: 'var(--v2-green)', fontWeight: 600, marginLeft: 'auto', flexShrink: 0 }}>₦{(d.amount / 100).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--v2-text-variant)', marginTop: '32px', opacity: 0.5 }}>
          Payments secured by Paystack
        </p>
      </div>
    </div>
  );
}
