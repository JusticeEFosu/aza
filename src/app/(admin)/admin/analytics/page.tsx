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

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Build date filter
  let dateFilter: string | null = null;
  if (days !== null) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    dateFilter = cutoff.toISOString();
  }

  // ==========================================
  // PARALLEL QUERIES
  // ==========================================
  
  let txQuery = supabase
    .from('transactions')
    .select('platform_fee, created_at, status, subscription_id, paystack_reference, creator_share, amount, creator_id')
    .eq('status', 'success');
  if (dateFilter) txQuery = txQuery.gte('created_at', dateFilter);

  let donQuery = supabase
    .from('donations')
    .select('paystack_reference, fundraiser_id, amount')
    .eq('status', 'success');
  if (dateFilter) donQuery = donQuery.gte('created_at', dateFilter);

  // Growth, Health, MRR, and Churn Queries
  const [
    { data: transactions },
    { data: donations },
    mrrRes,
    activeSubsRes,
    cancelledSubs30dRes,
    totalFansRes,
    activeSubFanIdsRes,
    failedTxRes,
    totalUsersRes,
    totalCreatorsRes,
    newUsersRes,
    unpublishedRes,
    unverifiedRes,
    allCreatorIdsRes,
    recentPostCreatorsRes,
    topSubscribedRes
  ] = await Promise.all([
    txQuery,
    donQuery,
    // MRR
    supabase.from('subscriptions').select('tier_id, tiers ( amount )').eq('status', 'active'),
    // Active Subs
    supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    // Cancelled Subs 30d
    supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'cancelled').gte('cancelled_at', thirtyDaysAgo),
    // Total Fans
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'fan'),
    // Fans with active subs
    supabase.from('subscriptions').select('fan_id').eq('status', 'active'),
    // Failed Tx
    supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('status', 'failed').gte('created_at', dateFilter || thirtyDaysAgo),
    // Total Users
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    // Total Creators
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'creator'),
    // New Users
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', dateFilter || thirtyDaysAgo),
    // Creator Health
    supabase.from('creator_profiles').select('*', { count: 'exact', head: true }).eq('is_published', false),
    supabase.from('creator_profiles').select('*', { count: 'exact', head: true }).eq('is_verified', false),
    supabase.from('creator_profiles').select('id'),
    supabase.from('posts').select('creator_id').gte('created_at', thirtyDaysAgo),
    // Top Subscribed
    supabase.from('creator_profiles').select(`
      id, display_name, slug, subscriber_count, profiles ( avatar_url )
    `).order('subscriber_count', { ascending: false }).limit(10)
  ]);

  // ==========================================
  // DATA PROCESSING
  // ==========================================
  
  const revenueByDate: Record<string, number> = {};
  const chartDays = days || 365;
  for (let i = chartDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    revenueByDate[dateStr] = 0;
  }

  let totalPlatformRevenue = 0, subRevenue = 0, tipRevenue = 0, fundraiserRevenue = 0;
  let totalGross = 0, subGross = 0, tipGross = 0, fundraiserGross = 0;
  let totalTipsCount = 0;
  const creatorEarnings: Record<string, number> = {};

  if (transactions) {
    transactions.forEach(tx => {
      // For Chart
      const dateStr = new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (revenueByDate[dateStr] !== undefined) {
        revenueByDate[dateStr] += tx.platform_fee;
      }
      
      // For Breakdown
      totalPlatformRevenue += tx.platform_fee;
      totalGross += tx.amount;
      
      // For Leaderboard
      creatorEarnings[tx.creator_id] = (creatorEarnings[tx.creator_id] || 0) + tx.creator_share;
      
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
          totalTipsCount++;
        }
      }
    });
  }

  const chartData = Object.keys(revenueByDate).map(date => ({ date, revenue: revenueByDate[date] }));
  const avgTipAmount = totalTipsCount > 0 ? Math.round(tipGross / totalTipsCount) : 0;

  // New Growth/Health Metrics
  const activeSubs = activeSubsRes.count || 0;
  const cancelledSubs = cancelledSubs30dRes.count || 0;
  const churnDenom = activeSubs + cancelledSubs;
  const churnRate = churnDenom > 0 ? ((cancelledSubs / churnDenom) * 100).toFixed(1) : '0.0';
  
  const mrr = mrrRes.data?.reduce((sum: number, sub: any) => {
    const tierData = sub.tiers;
    const amount = Array.isArray(tierData) ? (tierData[0]?.amount || 0) : (tierData as any)?.amount || 0;
    return sum + amount;
  }, 0) || 0;
  const arpu = activeSubs > 0 ? Math.round(mrr / activeSubs) : 0;

  const totalFans = totalFansRes.count || 0;
  const uniqueFansWithSubs = new Set((activeSubFanIdsRes.data || []).map((s: any) => s.fan_id)).size;
  const conversionRate = totalFans > 0 ? ((uniqueFansWithSubs / totalFans) * 100).toFixed(1) : '0.0';

  const allCreatorIds = new Set((allCreatorIdsRes.data || []).map((c: any) => c.id));
  const activeCreatorIds = new Set((recentPostCreatorsRes.data || []).map((p: any) => p.creator_id));
  const inactiveCreatorsCount = [...allCreatorIds].filter(id => !activeCreatorIds.has(id)).length;

  // Leaderboards Data
  const topCreatorIds = Object.keys(creatorEarnings).sort((a, b) => creatorEarnings[b] - creatorEarnings[a]).slice(0, 10);
  let topCreators: any[] = [];
  if (topCreatorIds.length > 0) {
    const { data: creatorProfiles } = await supabase
      .from('creator_profiles')
      .select(`id, display_name, slug, subscriber_count, profiles ( full_name, avatar_url )`)
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
          earnings: creatorEarnings[id]
        };
      });
    }
  }
  
  const topSubscribed = (topSubscribedRes.data || []).map(cp => {
    const profileInfo: any = Array.isArray(cp?.profiles) ? cp.profiles[0] : cp?.profiles;
    return {
      ...cp,
      avatar_url: profileInfo?.avatar_url
    };
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', marginBottom: '8px', letterSpacing: '-0.02em' }}>Deep Analytics</h1>
          <p style={{ color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '16px', margin: 0 }}>Business intelligence, platform revenue, and creator leaderboards.</p>
        </div>
        <TimePeriodSelector />
      </div>

      {/* Platform Health Row (NEW) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '13px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Total Users</div>
          <div style={{ fontSize: '36px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 800, color: '#0b1c30', letterSpacing: '-0.03em' }}>
            {totalUsersRes.count?.toLocaleString() || 0}
          </div>
          <div style={{ fontSize: '12px', fontFamily: 'var(--font-body, Inter, sans-serif)', color: '#6f7a72', marginTop: '4px' }}>
            <span style={{ fontWeight: 600 }}>{totalCreatorsRes.count?.toLocaleString() || 0}</span> Creators | <span style={{ fontWeight: 600 }}>{totalFansRes.count?.toLocaleString() || 0}</span> Fans
            <br/>(+{newUsersRes.count?.toLocaleString() || 0} in {label})
          </div>
        </div>
        
        <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '13px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Active Subscriptions</div>
          <div style={{ fontSize: '36px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 800, color: '#059669', letterSpacing: '-0.03em' }}>
            {activeSubs.toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', fontFamily: 'var(--font-body, Inter, sans-serif)', color: '#6f7a72', marginTop: '4px' }}>
            <span style={{ color: cancelledSubs > 0 ? '#dc2626' : '#059669', fontWeight: 600 }}>{cancelledSubs}</span> Cancelled (30d)
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '13px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Churn Rate (30d)</div>
          <div style={{ fontSize: '36px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 800, color: parseFloat(churnRate) > 5 ? '#dc2626' : parseFloat(churnRate) > 2 ? '#d97706' : '#059669', letterSpacing: '-0.03em' }}>
            {churnRate}%
          </div>
          <div style={{ fontSize: '12px', fontFamily: 'var(--font-body, Inter, sans-serif)', color: '#6f7a72', marginTop: '4px' }}>
            <span style={{ fontWeight: 600 }}>{conversionRate}%</span> Fan Conversion
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '13px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Creator Health</div>
          <div style={{ fontSize: '36px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 800, color: '#0b1c30', letterSpacing: '-0.03em' }}>
            {(totalCreatorsRes.count || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', fontFamily: 'var(--font-body, Inter, sans-serif)', color: '#6f7a72', marginTop: '4px' }}>
            <span style={{ color: unpublishedRes.count ? '#d97706' : 'inherit', fontWeight: 600 }}>{unpublishedRes.count}</span> Unpublished | <span style={{ color: unverifiedRes.count ? '#d97706' : 'inherit', fontWeight: 600 }}>{unverifiedRes.count}</span> Unverified
            <br/><span style={{ color: inactiveCreatorsCount ? '#dc2626' : 'inherit', fontWeight: 600 }}>{inactiveCreatorsCount}</span> Inactive (30d)
          </div>
        </div>
      </div>

      {/* Platform Revenue Breakdown (ENRICHED) */}
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
          <div style={{ fontSize: '12px', fontFamily: 'var(--font-body, Inter, sans-serif)', color: '#6f7a72', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #E2E8F0' }}>
            MRR: <span style={{ fontWeight: 700, color: '#059669' }}>₦{(mrr / 100).toLocaleString()}</span>
            <br/>ARPU: <span style={{ fontWeight: 600 }}>₦{(arpu / 100).toLocaleString()}</span>
          </div>
        </div>
        
        <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '13px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Tips (5%)</div>
          <div style={{ fontSize: '28px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 800, color: '#2563eb', letterSpacing: '-0.02em' }}>
            ₦{(tipRevenue / 100).toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', fontFamily: 'var(--font-body, Inter, sans-serif)', color: '#6f7a72', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #E2E8F0' }}>
            Avg Tip: <span style={{ fontWeight: 700, color: '#2563eb' }}>₦{(avgTipAmount / 100).toLocaleString()}</span>
            <br/>Total Tips: <span style={{ fontWeight: 600 }}>{totalTipsCount}</span>
          </div>
        </div>
        
        <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '13px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Fundraisers (5%)</div>
          <div style={{ fontSize: '28px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 800, color: '#d97706', letterSpacing: '-0.02em' }}>
            ₦{(fundraiserRevenue / 100).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Gross Volume Breakdown (ENRICHED) */}
      <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '40px' }}>
        <div style={{ fontSize: '13px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>{label} Gross Volume Processed</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '36px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 800, color: '#004e34', letterSpacing: '-0.03em' }}>
            ₦{(totalGross / 100).toLocaleString()}
          </div>
          {failedTxRes.count !== null && failedTxRes.count !== undefined && failedTxRes.count > 0 && (
             <div style={{ fontSize: '13px', fontWeight: 600, color: '#dc2626', fontFamily: 'var(--font-body, Inter, sans-serif)', background: '#fef2f2', padding: '4px 10px', borderRadius: '12px' }}>
               {failedTxRes.count} failed {failedTxRes.count === 1 ? 'transaction' : 'transactions'}
             </div>
          )}
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

      {/* Leaderboards (Side by Side) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        
        {/* Top 10 Most Subscribed */}
        <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid #E2E8F0', background: '#f8f9ff' }}>
            <h2 style={{ fontSize: '20px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', margin: 0 }}>Top 10 Subscribed</h2>
          </div>
          
          {topSubscribed.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>No creator data available.</div>
          ) : (
            <div className="v2-table-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <div style={{ minWidth: '350px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '50px 3fr 1fr', padding: '16px 24px', background: '#f8f9ff', borderBottom: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rank</span>
                  <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Creator</span>
                  <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Subs</span>
                </div>
                
                {topSubscribed.map((creator, index) => (
                  <div key={creator.id} style={{ display: 'grid', gridTemplateColumns: '50px 3fr 1fr', padding: '16px 24px', borderBottom: '1px solid #E2E8F0', alignItems: 'center' }}>
                    <div style={{ fontSize: '18px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 800, color: index < 3 ? '#004e34' : '#6f7a72' }}>
                      #{index + 1}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#eff4ff', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {creator.avatar_url ? (
                          <img src={creator.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span className="material-symbols-outlined" style={{ color: '#004e34', fontSize: '18px' }}>person</span>
                        )}
                      </div>
                      <div style={{ minWidth: 0, overflow: 'hidden' }}>
                        <div style={{ fontWeight: 600, color: '#0b1c30', fontSize: '14px', fontFamily: 'var(--font-body, Inter, sans-serif)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{creator.display_name || creator.slug}</div>
                        <Link href={`/c/${creator.slug}`} target="_blank" style={{ color: '#6f7a72', fontSize: '12px', textDecoration: 'none', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
                          /c/{creator.slug}
                        </Link>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: 700, color: '#059669', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
                      {creator.subscriber_count}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Top 10 Highest Earning */}
        <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid #E2E8F0', background: '#f8f9ff' }}>
            <h2 style={{ fontSize: '20px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', margin: 0 }}>Top 10 Highest Earning</h2>
          </div>
          
          {topCreators.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>No creator earnings data available.</div>
          ) : (
           <div className="v2-table-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <div style={{ minWidth: '350px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '50px 3fr 1.5fr', padding: '16px 24px', background: '#f8f9ff', borderBottom: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rank</span>
                  <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Creator</span>
                  <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Earnings</span>
                </div>
                
                {topCreators.map((creator, index) => (
                  <div key={creator.id} style={{ display: 'grid', gridTemplateColumns: '50px 3fr 1.5fr', padding: '16px 24px', borderBottom: '1px solid #E2E8F0', alignItems: 'center' }}>
                    <div style={{ fontSize: '18px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 800, color: index < 3 ? '#004e34' : '#6f7a72' }}>
                      #{index + 1}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#eff4ff', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {creator.avatar_url ? (
                          <img src={creator.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span className="material-symbols-outlined" style={{ color: '#004e34', fontSize: '18px' }}>person</span>
                        )}
                      </div>
                      <div style={{ minWidth: 0, overflow: 'hidden' }}>
                        <div style={{ fontWeight: 600, color: '#0b1c30', fontSize: '14px', fontFamily: 'var(--font-body, Inter, sans-serif)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{creator.display_name}</div>
                        <Link href={`/c/${creator.slug}`} target="_blank" style={{ color: '#6f7a72', fontSize: '12px', textDecoration: 'none', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
                          /c/{creator.slug}
                        </Link>
                      </div>
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
      </div>

      {/* Live Ledger (UNCHANGED) */}
      <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
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
