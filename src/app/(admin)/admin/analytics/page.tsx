import { createAdminClient } from '@/lib/supabase/admin';
import { RevenueChart } from './RevenueChart';
import TimePeriodSelector from './TimePeriodSelector';
import Link from 'next/link';

function getPeriodConfig(period: string) {
  const now = new Date();
  switch (period) {
    case '7d': return { days: 7, label: '7-Day' };
    case '90d': return { days: 90, label: '90-Day' };
    case 'all': return { days: null, label: 'All-Time' };
    default: return { days: 30, label: '30-Day' };
  }
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const period = params?.period || '30d';
  const { days, label } = getPeriodConfig(period);
  const supabase = createAdminClient();

  // Build date filter
  let dateFilter: string | null = null;
  if (days !== null) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    dateFilter = cutoff.toISOString();
  }

  // 1. Fetch transactions
  let txQuery = supabase
    .from('transactions')
    .select('platform_fee, created_at, status, subscription_id, paystack_reference, creator_share, amount')
    .eq('status', 'success');
  if (dateFilter) txQuery = txQuery.gte('created_at', dateFilter);
  const { data: transactions } = await txQuery;

  let donQuery = supabase
    .from('donations')
    .select('paystack_reference, fundraiser_id')
    .eq('status', 'success');
  if (dateFilter) donQuery = donQuery.gte('created_at', dateFilter);
  const { data: donations } = await donQuery;

  // Aggregate revenue by date for chart
  const revenueByDate: Record<string, number> = {};
  const chartDays = days || 365; // fallback for all-time chart
  for (let i = chartDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    revenueByDate[dateStr] = 0;
  }

  let totalPlatformRevenue = 0;
  let subRevenue = 0;
  let tipRevenue = 0;
  let fundraiserRevenue = 0;
  let totalGross = 0;
  let subGross = 0;
  let tipGross = 0;
  let fundraiserGross = 0;

  if (transactions) {
    transactions.forEach(tx => {
      const dateStr = new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (revenueByDate[dateStr] !== undefined) {
        revenueByDate[dateStr] += tx.platform_fee;
      }
      totalPlatformRevenue += tx.platform_fee;
      totalGross += tx.amount;
      
      if (tx.subscription_id) {
        subRevenue += tx.platform_fee;
        subGross += tx.amount;
      } else {
        const donation = donations?.find((d: any) => d.paystack_reference === tx.paystack_reference);
        if (donation?.fundraiser_id) {
          fundraiserRevenue += tx.platform_fee;
          fundraiserGross += tx.amount;
        } else {
          tipRevenue += tx.platform_fee;
          tipGross += tx.amount;
        }
      }
    });
  }

  const chartData = Object.keys(revenueByDate).map(date => ({
    date,
    revenue: revenueByDate[date]
  }));

  // 2. Fetch Creator Leaderboard
  let leaderQuery = supabase
    .from('transactions')
    .select('creator_id, creator_share')
    .eq('status', 'success');
  if (dateFilter) leaderQuery = leaderQuery.gte('created_at', dateFilter);
  const { data: allSuccessTx } = await leaderQuery;

  const creatorEarnings: Record<string, number> = {};
  if (allSuccessTx) {
    allSuccessTx.forEach(tx => {
      creatorEarnings[tx.creator_id] = (creatorEarnings[tx.creator_id] || 0) + tx.creator_share;
    });
  }

  const topCreatorIds = Object.keys(creatorEarnings)
    .sort((a, b) => creatorEarnings[b] - creatorEarnings[a])
    .slice(0, 10);

  let topCreators: any[] = [];
  if (topCreatorIds.length > 0) {
    const { data: creatorProfiles } = await supabase
      .from('creator_profiles')
      .select(`
        id, 
        display_name, 
        slug,
        subscriber_count,
        profiles ( full_name, avatar_url )
      `)
      .in('id', topCreatorIds);

    if (creatorProfiles) {
      topCreators = topCreatorIds.map(id => {
        const cp = creatorProfiles.find((c: any) => c.id === id);
        const profileInfo: any = Array.isArray(cp?.profiles) ? cp.profiles[0] : cp?.profiles;
        
        return {
          id,
          display_name: cp?.display_name || profileInfo?.full_name || 'Unknown',
          slug: cp?.slug,
          avatar_url: profileInfo?.avatar_url,
          subscriber_count: cp?.subscriber_count || 0,
          earnings: creatorEarnings[id]
        };
      });
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', marginBottom: '8px', letterSpacing: '-0.02em' }}>Deep Analytics</h1>
          <p style={{ color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '16px', margin: 0 }}>Business intelligence, platform revenue, and creator leaderboards.</p>
        </div>
        <TimePeriodSelector />
      </div>

      {/* Platform Revenue Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '13px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{label} Platform Revenue</div>
          <div style={{ fontSize: '36px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 800, color: '#004e34', letterSpacing: '-0.03em' }}>
            ₦{(totalPlatformRevenue / 100).toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', fontFamily: 'var(--font-body, Inter, sans-serif)', color: '#6f7a72', marginTop: '4px' }}>
            {transactions?.length || 0} transactions
          </div>
        </div>
        <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '13px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Subscriptions (10%)</div>
          <div style={{ fontSize: '28px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 800, color: '#059669', letterSpacing: '-0.02em' }}>
            ₦{(subRevenue / 100).toLocaleString()}
          </div>
        </div>
        <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '13px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Tips (5%)</div>
          <div style={{ fontSize: '28px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 800, color: '#2563eb', letterSpacing: '-0.02em' }}>
            ₦{(tipRevenue / 100).toLocaleString()}
          </div>
        </div>
        <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '13px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Fundraisers (5%)</div>
          <div style={{ fontSize: '28px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 800, color: '#d97706', letterSpacing: '-0.02em' }}>
            ₦{(fundraiserRevenue / 100).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Gross Volume Breakdown */}
      <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '40px' }}>
        <div style={{ fontSize: '13px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>{label} Gross Volume Processed</div>
        <div style={{ fontSize: '36px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 800, color: '#004e34', letterSpacing: '-0.03em', marginBottom: '16px' }}>
          ₦{(totalGross / 100).toLocaleString()}
        </div>
        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '12px', fontFamily: 'var(--font-body, Inter, sans-serif)', color: '#6f7a72', marginBottom: '4px' }}>Subscriptions</div>
            <div style={{ fontSize: '18px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#059669' }}>₦{(subGross / 100).toLocaleString()}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', fontFamily: 'var(--font-body, Inter, sans-serif)', color: '#6f7a72', marginBottom: '4px' }}>Tips</div>
            <div style={{ fontSize: '18px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#2563eb' }}>₦{(tipGross / 100).toLocaleString()}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', fontFamily: 'var(--font-body, Inter, sans-serif)', color: '#6f7a72', marginBottom: '4px' }}>Fundraisers</div>
            <div style={{ fontSize: '18px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#d97706' }}>₦{(fundraiserGross / 100).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Revenue Chart Section */}
      <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px', marginBottom: '40px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <h2 style={{ fontSize: '20px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', marginBottom: '24px' }}>Platform Revenue Over Time</h2>
        <RevenueChart data={chartData} />
      </div>

      {/* Top Creators Leaderboard */}
      <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #E2E8F0', background: '#f8f9ff' }}>
          <h2 style={{ fontSize: '20px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', marginBottom: '4px' }}>Top Creators Leaderboard</h2>
          <p style={{ margin: 0, fontSize: '14px', fontFamily: 'var(--font-body, Inter, sans-serif)', color: '#3f4943' }}>Ranked by {label.toLowerCase()} earnings generated on MyAzaa.</p>
        </div>
        
        {topCreators.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>No creator earnings data available for this period.</div>
        ) : (
         <div className="v2-table-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ minWidth: '800px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 3fr 1fr 1fr', padding: '16px 24px', background: '#f8f9ff', borderBottom: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rank</span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Creator</span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subscribers</span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Earnings</span>
              </div>
              
              {topCreators.map((creator, index) => (
                <div key={creator.id} style={{ display: 'grid', gridTemplateColumns: '80px 3fr 1fr 1fr', padding: '16px 24px', borderBottom: '1px solid #E2E8F0', alignItems: 'center' }}>
                  <div style={{ fontSize: '20px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 800, color: index < 3 ? '#004e34' : '#6f7a72' }}>
                    #{index + 1}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#eff4ff', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {creator.avatar_url ? (
                        <img src={creator.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span className="material-symbols-outlined" style={{ color: '#004e34' }}>person</span>
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#0b1c30', fontSize: '15px', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>{creator.display_name}</div>
                      <Link href={`/c/${creator.slug}`} target="_blank" style={{ color: '#6f7a72', fontSize: '13px', textDecoration: 'none', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
                        myazaa.com/c/{creator.slug}
                      </Link>
                    </div>
                  </div>
                  <div style={{ fontWeight: 600, color: '#0b1c30', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
                    {creator.subscriber_count}
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 700, color: '#059669', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
                    ₦{(creator.earnings / 100).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Live Ledger */}
      <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginTop: '40px' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #E2E8F0', background: '#f8f9ff' }}>
          <h2 style={{ fontSize: '20px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', marginBottom: '4px' }}>Live Ledger ({label})</h2>
          <p style={{ margin: 0, fontSize: '14px', fontFamily: 'var(--font-body, Inter, sans-serif)', color: '#3f4943' }}>Audit trail of successful transactions.</p>
        </div>
        
        {(!transactions || transactions.length === 0) ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>No transactions found for this period.</div>
        ) : (
          <div className="v2-table-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxHeight: '500px' }}>
            <div style={{ minWidth: '800px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr', padding: '16px 24px', background: '#f8f9ff', borderBottom: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Amount</span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Creator Share</span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Platform Fee</span>
              </div>
              
              {[...transactions].reverse().map((tx: any, idx: number) => {
                let typeStr = 'Subscription';
                let typeColor = '#059669';
                if (!tx.subscription_id) {
                  const donation = donations?.find((d: any) => d.paystack_reference === tx.paystack_reference);
                  if (donation?.fundraiser_id) {
                    typeStr = 'Fundraiser';
                    typeColor = '#d97706';
                  } else {
                    typeStr = 'Tip';
                    typeColor = '#2563eb';
                  }
                }

                return (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr', padding: '16px 24px', borderBottom: '1px solid #E2E8F0', alignItems: 'center' }}>
                    <div style={{ fontSize: '14px', fontFamily: 'var(--font-body, Inter, sans-serif)', color: '#0b1c30' }}>
                      {new Date(tx.created_at).toLocaleString()}
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 8px', borderRadius: '12px', background: `${typeColor}15`, color: typeColor, border: `1px solid ${typeColor}40` }}>
                        {typeStr}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: 600, color: '#0b1c30', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
                      ₦{((tx.amount || 0) / 100).toLocaleString()}
                    </div>
                    <div style={{ textAlign: 'right', color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
                      ₦{((tx.creator_share || 0) / 100).toLocaleString()}
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: 600, color: '#004e34', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
                      ₦{((tx.platform_fee || 0) / 100).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
