import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import SubscriptionCardActions from '@/components/SubscriptionCardActions';

export default async function FanSubscriptions() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'fan') redirect('/creator');

  // Fetch active subscriptions with joined creator profile and tier data
  const now = new Date().toISOString();
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select(`
      id,
      status,
      current_period_end,
      creator_id,
      tiers ( name, amount ),
      creator_profiles ( slug, bio, display_name, profiles ( full_name, display_name, avatar_url ) )
    `)
    .eq('fan_id', user.id)
    .or(`status.eq.active,and(status.eq.cancelled,current_period_end.gt.${now})`);

  // Deduplicate subscriptions: keep only the highest-tier subscription per creator
  const subsByCreator: Record<string, any> = {};
  (subscriptions || []).forEach(s => {
    const tierData = s.tiers;
    const amount = Array.isArray(tierData) 
      ? (tierData[0]?.amount || 0) 
      : (tierData as any)?.amount || 0;
      
    if (!subsByCreator[s.creator_id] || amount > subsByCreator[s.creator_id]._amount) {
      subsByCreator[s.creator_id] = { ...s, _amount: amount };
    }
  });
  
  const uniqueSubscriptions = Object.values(subsByCreator);

  return (
    <main className="az-container" style={{ paddingTop: '32px', paddingBottom: '64px' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 className="az-h1" style={{ fontSize: '32px', color: 'var(--az-primary, #004e34)' }}>Subscriptions</h1>
        <p className="az-body-lg" style={{ color: 'var(--az-text-muted, #6f7a72)', marginTop: '4px' }}>Manage your active creator memberships.</p>
      </header>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--az-border)', paddingBottom: '12px' }}>
          <h2 className="az-h2" style={{ fontSize: '20px', color: 'var(--az-text-main)' }}>Active Subscriptions</h2>
          <span style={{ fontSize: '14px', background: 'var(--az-surface-low, #f0f4f1)', color: 'var(--az-primary, #004e34)', padding: '4px 14px', borderRadius: '99px', fontWeight: 600 }}>
            {uniqueSubscriptions.length} Subscriptions
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
          {uniqueSubscriptions.length === 0 ? (
            <div className="az-card" style={{ gridColumn: '1 / -1', padding: '48px 24px', textAlign: 'center', borderStyle: 'dashed' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--az-primary, #004e34)', marginBottom: '12px', display: 'block' }}>card_membership</span>
              <p className="az-body" style={{ color: 'var(--az-text-muted)' }}>You aren't subscribed to anyone yet.</p>
              <Link href="/fan/discover" className="az-btn-primary" style={{ display: 'inline-flex', marginTop: '20px', padding: '10px 24px' }}>
                Discover Creators
              </Link>
            </div>
          ) : uniqueSubscriptions.map((sub: any) => {
            const creatorProfile = sub.creator_profiles;
            const fanProfile = creatorProfile?.profiles;
            const creatorName = creatorProfile?.display_name || fanProfile?.display_name || fanProfile?.full_name || 'Creator';
            const creatorAvatar = fanProfile?.avatar_url;
            const categoryOrBio = creatorProfile?.bio ? creatorProfile.bio.substring(0, 40) + '...' : 'Creator';
            const tierInfo = Array.isArray(sub.tiers) ? sub.tiers[0] : sub.tiers;
            
            return (
              <div key={sub.id} className="az-card az-card-interactive" style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    background: sub.status === 'cancelled' ? '#fef2f2' : 'var(--az-surface-low, #f0f4f1)',
                    color: sub.status === 'cancelled' ? '#dc2626' : 'var(--az-primary, #004e34)',
                    border: `1px solid ${sub.status === 'cancelled' ? '#fecaca' : 'var(--az-border)'}`
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: sub.status === 'cancelled' ? '#dc2626' : 'var(--az-primary, #004e34)' }}></span>
                    {sub.status === 'cancelled' ? 'Cancelling' : 'Active'}
                  </span>
                </div>
                
                <Link href={`/c/${creatorProfile?.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--az-primary, #004e34)', flexShrink: 0 }}>
                    {creatorAvatar ? (
                      <img src={creatorAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: 'var(--az-surface-low)', color: 'var(--az-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                        {creatorName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="az-h3" style={{ fontSize: '16px', margin: 0 }}>{creatorName}</h3>
                    <p className="az-body" style={{ fontSize: '12px', color: 'var(--az-text-muted)', margin: '2px 0 0' }}>{categoryOrBio}</p>
                  </div>
                </Link>

                <div style={{ borderTop: '1px solid var(--az-border)', borderBottom: '1px solid var(--az-border)', padding: '12px 0', margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span className="az-label">Tier</span>
                    <span style={{ fontWeight: 600, color: 'var(--az-text-main)' }}>{tierInfo?.name || 'Standard'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span className="az-label">Price</span>
                    <span style={{ fontWeight: 600, color: 'var(--az-primary)' }}>₦{((tierInfo?.amount || 0) / 100).toLocaleString()} / mo</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span className="az-label">{sub.status === 'cancelled' ? 'Ends' : 'Renews'}</span>
                    <span style={{ fontWeight: 500, color: 'var(--az-text-main)' }}>
                      {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric'}) : 'N/A'}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: 'auto' }}>
                  {sub.status === 'active' && <SubscriptionCardActions slug={creatorProfile?.slug} subscriptionId={sub.id} />}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
