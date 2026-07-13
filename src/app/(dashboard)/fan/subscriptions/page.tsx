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
    <main className="v2-fan-main">
      <div className="v2-fan-container">
        <header>
          <h1 className="v2-dash-title">Subscriptions</h1>
          <p className="v2-dash-desc">Manage your active creator memberships.</p>
        </header>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--v2-outline)', paddingBottom: '8px' }}>
            <h3 className="v2-dash-title" style={{ fontSize: '20px' }}>Active Subscriptions</h3>
            <span style={{ fontSize: '14px', background: 'var(--v2-surface-low)', padding: '4px 12px', borderRadius: '99px', fontWeight: 600 }}>
              {uniqueSubscriptions.length} Subscriptions
            </span>
          </div>

          <div className="v2-subs-grid">
            {uniqueSubscriptions.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--v2-text-variant)', background: 'var(--v2-surface-lowest)', border: '1px dashed var(--v2-outline)', borderRadius: '12px' }}>
                 You aren't subscribed to anyone yet.
                 <br/>
                 <Link href="/creators" style={{ color: 'var(--v2-primary)', fontWeight: 600, display: 'inline-block', marginTop: '16px' }}>Discover creators</Link>
              </div>
            ) : uniqueSubscriptions.map((sub: any) => {
              const creatorProfile = sub.creator_profiles;
              const fanProfile = creatorProfile?.profiles;
              const creatorName = creatorProfile?.display_name || fanProfile?.display_name || fanProfile?.full_name || 'Creator';
              const creatorAvatar = fanProfile?.avatar_url;
              const categoryOrBio = creatorProfile?.bio ? creatorProfile.bio.substring(0, 40) + '...' : 'Creator';
              const tierInfo = Array.isArray(sub.tiers) ? sub.tiers[0] : sub.tiers;
              
              return (
                <Link href={`/c/${creatorProfile?.slug}`} key={sub.id} className="v2-sub-card" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column' }}>
                  <div className="v2-sub-badge" style={sub.status === 'cancelled' ? { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' } : {}}>
                    <span className="v2-sub-badge-dot" style={sub.status === 'cancelled' ? { background: '#991b1b' } : {}}></span> {sub.status === 'cancelled' ? 'Cancelling' : 'Active'}
                  </div>
                  
                  <div className="v2-sub-header">
                    {creatorAvatar ? (
                      <img src={creatorAvatar} alt="" className="v2-sub-avatar" />
                    ) : (
                      <div className="v2-sub-avatar">
                        {creatorName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>{creatorName}</h4>
                      <p style={{ fontSize: '12px', color: 'var(--v2-text-variant)', margin: 0 }}>{categoryOrBio}</p>
                    </div>
                  </div>

                  <div className="v2-sub-details">
                    <div className="v2-sub-detail-row">
                      <span className="v2-sub-label">Tier</span>
                      <span className="v2-sub-val">{tierInfo?.name || 'Standard'}</span>
                    </div>
                    <div className="v2-sub-detail-row">
                      <span className="v2-sub-label">Price</span>
                      <span className="v2-sub-val">₦{((tierInfo?.amount || 0) / 100).toLocaleString()} / mo</span>
                    </div>
                    <div className="v2-sub-detail-row">
                      <span className="v2-sub-label">{sub.status === 'cancelled' ? 'Ends' : 'Renews'}</span>
                      <span className="v2-sub-val" style={{ fontWeight: 500 }}>
                        {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric'}) : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {sub.status === 'active' && <SubscriptionCardActions slug={creatorProfile?.slug} subscriptionId={sub.id} />}
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
