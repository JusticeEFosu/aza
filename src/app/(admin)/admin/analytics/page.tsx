import { createAdminClient } from '@/lib/supabase/admin';
import { RevenueChart } from './RevenueChart';
import AnalyticsControls from './AnalyticsControls';
import Link from 'next/link';

function getPeriodConfig(period: string) {
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
  searchParams: Promise<{ period?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const period = params?.period || '30d';
  const tab = params?.tab || 'growth';
  const { days, label } = getPeriodConfig(period);
  const supabase = createAdminClient();

  // Build date filter
  let dateFilter: string | null = null;
  if (days !== null) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    dateFilter = cutoff.toISOString();
  }

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // =============================================
  // SHARED QUERIES (always fetched)
  // =============================================
  let txQuery = supabase
    .from('transactions')
    .select('platform_fee, created_at, status, subscription_id, paystack_reference, creator_share, amount')
    .eq('status', 'success');
  if (dateFilter) txQuery = txQuery.gte('created_at', dateFilter);

  let donQuery = supabase
    .from('donations')
    .select('paystack_reference, fundraiser_id, donor_name')
    .eq('status', 'success');
  if (dateFilter) donQuery = donQuery.gte('created_at', dateFilter);

  const [{ data: transactions }, { data: donations }] = await Promise.all([txQuery, donQuery]);

  // =============================================
  // TAB-SPECIFIC QUERIES
  // =============================================

  // --- GROWTH TAB ---
  let growthData: any = null;
  if (tab === 'growth') {
    const [
      totalUsersRes, totalCreatorsRes, totalFansRes,
      newUsers7dRes, newUsers30dRes,
      newSubs7dRes, newSubs30dRes,
      activeSubsRes,
      cancelledSubs7dRes, cancelledSubs30dRes,
      activeSubFanIdsRes,
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'creator'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'fan'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
      supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active').gte('created_at', weekAgo),
      supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active').gte('created_at', thirtyDaysAgo),
      supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'cancelled').gte('cancelled_at', weekAgo),
      supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'cancelled').gte('cancelled_at', thirtyDaysAgo),
      supabase.from('subscriptions').select('fan_id').eq('status', 'active'),
    ]);

    const totalUsers = totalUsersRes.count || 0;
    const totalCreators = totalCreatorsRes.count || 0;
    const totalFans = totalFansRes.count || 0;
    const activeSubs = activeSubsRes.count || 0;
    const cancelledSubs7d = cancelledSubs7dRes.count || 0;
    const cancelledSubs30d = cancelledSubs30dRes.count || 0;
    const newSubs7d = newSubs7dRes.count || 0;
    const newSubs30d = newSubs30dRes.count || 0;
    const churnDenom = activeSubs + cancelledSubs30d;
    const uniqueFansWithSubs = new Set((activeSubFanIdsRes.data || []).map((s: any) => s.fan_id)).size;

    growthData = {
      totalUsers, totalCreators, totalFans,
      newUsers7d: newUsers7dRes.count || 0,
      newUsers30d: newUsers30dRes.count || 0,
      newSubs7d, newSubs30d,
      activeSubs,
      cancelledSubs7d, cancelledSubs30d,
      netGrowth7d: newSubs7d - cancelledSubs7d,
      netGrowth30d: newSubs30d - cancelledSubs30d,
      churnRate30d: churnDenom > 0 ? ((cancelledSubs30d / churnDenom) * 100).toFixed(1) : '0.0',
      conversionRate: totalFans > 0 ? ((uniqueFansWithSubs / totalFans) * 100).toFixed(1) : '0.0',
      uniqueFansWithSubs,
    };
  }

  // --- REVENUE TAB ---
  let revenueData: any = null;
  if (tab === 'revenue') {
    const [
      mrrRes,
      activeSubsCountRes,
      tipsThisMonthRes, fundraiserThisMonthRes, allTipsRes,
      failedTx7dRes,
    ] = await Promise.all([
      supabase.from('subscriptions').select('tier_id, tiers ( amount )').eq('status', 'active'),
      supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('donations').select('amount').eq('status', 'success').is('fundraiser_id', null).gte('created_at', thisMonthStart),
      supabase.from('donations').select('amount').eq('status', 'success').not('fundraiser_id', 'is', null).gte('created_at', thisMonthStart),
      supabase.from('donations').select('amount').eq('status', 'success').is('fundraiser_id', null),
      supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('status', 'failed').gte('created_at', weekAgo),
    ]);

    const activeSubs = activeSubsCountRes.count || 0;
    const mrr = mrrRes.data?.reduce((sum: number, sub: any) => {
      const tierData = sub.tiers;
      const amount = Array.isArray(tierData) ? (tierData[0]?.amount || 0) : (tierData as any)?.amount || 0;
      return sum + amount;
    }, 0) || 0;
    const allTipsData = allTipsRes.data || [];

    // Revenue breakdown from transactions
    let subRevenue = 0, tipRevenue = 0, fundraiserRevenue = 0;
    let subGross = 0, tipGross = 0, fundraiserGross = 0;
    let totalPlatformRevenue = 0, totalGross = 0;

    if (transactions) {
      transactions.forEach(tx => {
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

    revenueData = {
      mrr, arpu: activeSubs > 0 ? Math.round(mrr / activeSubs) : 0,
      activeSubs,
      tipsThisMonth: tipsThisMonthRes.data?.reduce((s: number, d: any) => s + (d.amount || 0), 0) || 0,
      fundraiserThisMonth: fundraiserThisMonthRes.data?.reduce((s: number, d: any) => s + (d.amount || 0), 0) || 0,
      avgTipAmount: allTipsData.length > 0 ? Math.round(allTipsData.reduce((s: number, d: any) => s + (d.amount || 0), 0) / allTipsData.length) : 0,
      totalTips: allTipsData.length,
      failedTx7d: failedTx7dRes.count || 0,
      totalPlatformRevenue, totalGross,
      subRevenue, tipRevenue, fundraiserRevenue,
      subGross, tipGross, fundraiserGross,
      txCount: transactions?.length || 0,
    };
  }

  // --- CREATORS TAB ---
  let creatorsData: any = null;
  if (tab === 'creators') {
    const [
      topSubscribedRes, topEarningRes,
      unverifiedRes, unpublishedRes,
      allCreatorIdsRes, recentPostCreatorsRes,
    ] = await Promise.all([
      supabase.from('creator_profiles').select('display_name, slug, subscriber_count').order('subscriber_count', { ascending: false }).limit(10),
      supabase.from('creator_profiles').select('display_name, slug, total_earnings').order('total_earnings', { ascending: false }).limit(10),
      supabase.from('creator_profiles').select('*', { count: 'exact', head: true }).eq('is_verified', false),
      supabase.from('creator_profiles').select('*', { count: 'exact', head: true }).eq('is_published', false),
      supabase.from('creator_profiles').select('id'),
      supabase.from('posts').select('creator_id').gte('created_at', thirtyDaysAgo),
    ]);

    const allCreatorIds = new Set((allCreatorIdsRes.data || []).map((c: any) => c.id));
    const activeCreatorIds = new Set((recentPostCreatorsRes.data || []).map((p: any) => p.creator_id));
    const inactiveCreators = [...allCreatorIds].filter(id => !activeCreatorIds.has(id)).length;

    creatorsData = {
      topSubscribed: (topSubscribedRes.data || []) as any[],
      topEarning: (topEarningRes.data || []) as any[],
      unverified: unverifiedRes.count || 0,
      unpublished: unpublishedRes.count || 0,
      inactive: inactiveCreators,
      totalCreators: allCreatorIds.size,
    };
  }

  // =============================================
  // CHART DATA (for revenue tab)
  // =============================================
  let chartData: { date: string; revenue: number }[] = [];
  if (tab === 'revenue' && transactions) {
    const revenueByDate: Record<string, number> = {};
    const chartDays = days || 365;
    for (let i = chartDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      revenueByDate[dateStr] = 0;
    }
    transactions.forEach(tx => {
      const dateStr = new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (revenueByDate[dateStr] !== undefined) {
        revenueByDate[dateStr] += tx.platform_fee;
      }
    });
    chartData = Object.keys(revenueByDate).map(date => ({ date, revenue: revenueByDate[date] }));
  }

  // =============================================
  // STYLES
  // =============================================
  const font = 'var(--font-body, Inter, sans-serif)';
  const fontH = 'var(--font-heading, Montserrat, sans-serif)';

  // Dense stat row style
  const statRow = (label: string, value: string | number, color?: string, sub?: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ fontSize: '13px', fontFamily: font, color: '#6f7a72' }}>{label}</span>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontSize: '15px', fontFamily: fontH, fontWeight: 700, color: color || '#0b1c30' }}>{value}</span>
        {sub && <div style={{ fontSize: '11px', fontFamily: font, color: '#9ca3af', marginTop: '1px' }}>{sub}</div>}
      </div>
    </div>
  );

  const panelStyle: React.CSSProperties = { background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' };
  const panelTitle = (text: string) => (
    <div style={{ fontSize: '12px', fontFamily: fontH, fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px', paddingBottom: '8px', borderBottom: '2px solid #f1f5f9' }}>
      {text}
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontFamily: fontH, fontWeight: 700, color: '#0b1c30', marginBottom: '4px', letterSpacing: '-0.02em' }}>Analytics</h1>
        <p style={{ color: '#6f7a72', fontFamily: font, fontSize: '14px', margin: 0 }}>Deep dive into platform metrics.</p>
      </div>

      <AnalyticsControls />

      {/* ============================================ */}
      {/* GROWTH TAB                                   */}
      {/* ============================================ */}
      {tab === 'growth' && growthData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {/* Users Panel */}
          <div style={panelStyle}>
            {panelTitle('Users')}
            {statRow('Total Users', growthData.totalUsers.toLocaleString())}
            {statRow('Creators', growthData.totalCreators.toLocaleString())}
            {statRow('Fans', growthData.totalFans.toLocaleString())}
            {statRow('New Users (7d)', `+${growthData.newUsers7d.toLocaleString()}`, '#059669')}
            {statRow('New Users (30d)', `+${growthData.newUsers30d.toLocaleString()}`, '#059669')}
          </div>

          {/* Subscriptions Panel */}
          <div style={panelStyle}>
            {panelTitle('Subscriptions')}
            {statRow('Active Subscriptions', growthData.activeSubs.toLocaleString())}
            {statRow('New Subs (7d)', `+${growthData.newSubs7d.toLocaleString()}`, '#059669')}
            {statRow('New Subs (30d)', `+${growthData.newSubs30d.toLocaleString()}`, '#059669')}
            {statRow('Cancelled (7d)', growthData.cancelledSubs7d.toLocaleString(), growthData.cancelledSubs7d > 0 ? '#dc2626' : '#059669')}
            {statRow('Cancelled (30d)', growthData.cancelledSubs30d.toLocaleString(), growthData.cancelledSubs30d > 0 ? '#dc2626' : '#059669')}
          </div>

          {/* Health Panel */}
          <div style={panelStyle}>
            {panelTitle('Health Indicators')}
            {statRow('Net Growth (7d)',
              `${growthData.netGrowth7d >= 0 ? '+' : ''}${growthData.netGrowth7d}`,
              growthData.netGrowth7d >= 0 ? '#059669' : '#dc2626',
              `+${growthData.newSubs7d} new · -${growthData.cancelledSubs7d} cancelled`
            )}
            {statRow('Net Growth (30d)',
              `${growthData.netGrowth30d >= 0 ? '+' : ''}${growthData.netGrowth30d}`,
              growthData.netGrowth30d >= 0 ? '#059669' : '#dc2626',
              `+${growthData.newSubs30d} new · -${growthData.cancelledSubs30d} cancelled`
            )}
            {statRow('Churn Rate (30d)', `${growthData.churnRate30d}%`,
              parseFloat(growthData.churnRate30d) > 5 ? '#dc2626' : parseFloat(growthData.churnRate30d) > 2 ? '#d97706' : '#059669',
              `${growthData.cancelledSubs30d} of ${growthData.activeSubs + growthData.cancelledSubs30d}`
            )}
            {statRow('Fan Conversion', `${growthData.conversionRate}%`,
              parseFloat(growthData.conversionRate) > 10 ? '#059669' : '#d97706',
              `${growthData.uniqueFansWithSubs} of ${growthData.totalFans} fans`
            )}
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* REVENUE TAB                                  */}
      {/* ============================================ */}
      {tab === 'revenue' && revenueData && (
        <div>
          {/* Top metrics row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            {/* Key Metrics */}
            <div style={panelStyle}>
              {panelTitle('Key Metrics')}
              {statRow('MRR', `₦${(revenueData.mrr / 100).toLocaleString()}`, '#004e34', 'Monthly Recurring Revenue')}
              {statRow('ARPU', `₦${(revenueData.arpu / 100).toLocaleString()}`, '#004e34', 'Avg Revenue Per Subscriber')}
              {statRow('Active Subscribers', revenueData.activeSubs.toLocaleString())}
              {statRow('Failed Transactions (7d)', revenueData.failedTx7d.toLocaleString(), revenueData.failedTx7d > 0 ? '#dc2626' : '#059669')}
            </div>

            {/* Period Breakdown */}
            <div style={panelStyle}>
              {panelTitle(`${label} Platform Revenue`)}
              {statRow('Total Platform Revenue', `₦${(revenueData.totalPlatformRevenue / 100).toLocaleString()}`, '#004e34', `${revenueData.txCount} transactions`)}
              {statRow('Subscriptions (10%)', `₦${(revenueData.subRevenue / 100).toLocaleString()}`, '#059669')}
              {statRow('Tips (5%)', `₦${(revenueData.tipRevenue / 100).toLocaleString()}`, '#2563eb')}
              {statRow('Fundraisers (5%)', `₦${(revenueData.fundraiserRevenue / 100).toLocaleString()}`, '#d97706')}
            </div>

            {/* Gross & Tips */}
            <div style={panelStyle}>
              {panelTitle('Volume & Tips')}
              {statRow(`${label} Gross Volume`, `₦${(revenueData.totalGross / 100).toLocaleString()}`, '#004e34')}
              {statRow('Subs Gross', `₦${(revenueData.subGross / 100).toLocaleString()}`)}
              {statRow('Tips Gross', `₦${(revenueData.tipGross / 100).toLocaleString()}`)}
              {statRow('Fundraiser Gross', `₦${(revenueData.fundraiserGross / 100).toLocaleString()}`)}
              <div style={{ borderTop: '2px solid #f1f5f9', marginTop: '4px', paddingTop: '4px' }}></div>
              {statRow('Tips This Month', `₦${(revenueData.tipsThisMonth / 100).toLocaleString()}`)}
              {statRow('Fundraisers This Month', `₦${(revenueData.fundraiserThisMonth / 100).toLocaleString()}`)}
              {statRow('Avg Tip Amount', `₦${(revenueData.avgTipAmount / 100).toLocaleString()}`, undefined, `${revenueData.totalTips} total tips`)}
            </div>
          </div>

          {/* Revenue Chart */}
          <div style={{ ...panelStyle, marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', fontFamily: fontH, fontWeight: 700, color: '#0b1c30', marginBottom: '16px' }}>Platform Revenue Over Time</div>
            <RevenueChart data={chartData} />
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* CREATORS TAB                                 */}
      {/* ============================================ */}
      {tab === 'creators' && creatorsData && (
        <div>
          {/* Health stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            {[
              { label: 'Total Creators', value: creatorsData.totalCreators, color: '#004e34' },
              { label: 'Unverified', value: creatorsData.unverified, color: creatorsData.unverified > 0 ? '#d97706' : '#059669', sub: 'No bank details' },
              { label: 'Unpublished', value: creatorsData.unpublished, color: creatorsData.unpublished > 0 ? '#d97706' : '#059669', sub: 'Page not live' },
              { label: 'Inactive (30d)', value: creatorsData.inactive, color: creatorsData.inactive > 0 ? '#d97706' : '#059669', sub: 'No recent posts' },
            ].map((stat, i) => (
              <div key={i} style={{ ...panelStyle, padding: '16px 20px' }}>
                <div style={{ fontSize: '11px', fontFamily: fontH, fontWeight: 700, color: '#6f7a72', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{stat.label}</div>
                <div style={{ fontSize: '28px', fontFamily: fontH, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                {stat.sub && <div style={{ fontSize: '11px', fontFamily: font, color: '#9ca3af', marginTop: '2px' }}>{stat.sub}</div>}
              </div>
            ))}
          </div>

          {/* Two tables side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
            {/* Top Subscribed */}
            <div style={{ ...panelStyle, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0', background: '#f8faf9' }}>
                <span style={{ fontSize: '13px', fontFamily: fontH, fontWeight: 700, color: '#0b1c30' }}>Top 10 Most Subscribed</span>
              </div>
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 80px', padding: '8px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '10px', fontFamily: fontH, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>#</span>
                <span style={{ fontSize: '10px', fontFamily: fontH, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>Creator</span>
                <span style={{ fontSize: '10px', fontFamily: fontH, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', textAlign: 'right' }}>Subs</span>
              </div>
              {creatorsData.topSubscribed.length === 0 ? (
                <div style={{ padding: '24px 20px', textAlign: 'center', color: '#9ca3af', fontSize: '13px', fontFamily: font }}>No data yet.</div>
              ) : (
                creatorsData.topSubscribed.map((c: any, i: number) => (
                  <div key={c.slug || i} style={{ display: 'grid', gridTemplateColumns: '32px 1fr 80px', padding: '10px 20px', borderBottom: '1px solid #f8f8f8', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontFamily: fontH, fontWeight: 700, color: i < 3 ? '#d97706' : '#9ca3af' }}>{i + 1}</span>
                    <Link href={`/c/${c.slug}`} style={{ fontSize: '13px', fontFamily: font, fontWeight: 500, color: '#0b1c30', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.display_name || c.slug}
                    </Link>
                    <span style={{ fontSize: '13px', fontFamily: fontH, fontWeight: 700, color: '#059669', textAlign: 'right' }}>
                      {(c.subscriber_count || 0).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Top Earning */}
            <div style={{ ...panelStyle, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0', background: '#f8f9ff' }}>
                <span style={{ fontSize: '13px', fontFamily: fontH, fontWeight: 700, color: '#0b1c30' }}>Top 10 Highest Earning</span>
              </div>
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 100px', padding: '8px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '10px', fontFamily: fontH, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>#</span>
                <span style={{ fontSize: '10px', fontFamily: fontH, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>Creator</span>
                <span style={{ fontSize: '10px', fontFamily: fontH, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', textAlign: 'right' }}>Earnings</span>
              </div>
              {creatorsData.topEarning.length === 0 ? (
                <div style={{ padding: '24px 20px', textAlign: 'center', color: '#9ca3af', fontSize: '13px', fontFamily: font }}>No data yet.</div>
              ) : (
                creatorsData.topEarning.map((c: any, i: number) => (
                  <div key={c.slug || i} style={{ display: 'grid', gridTemplateColumns: '32px 1fr 100px', padding: '10px 20px', borderBottom: '1px solid #f8f8f8', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontFamily: fontH, fontWeight: 700, color: i < 3 ? '#d97706' : '#9ca3af' }}>{i + 1}</span>
                    <Link href={`/c/${c.slug}`} style={{ fontSize: '13px', fontFamily: font, fontWeight: 500, color: '#0b1c30', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.display_name || c.slug}
                    </Link>
                    <span style={{ fontSize: '13px', fontFamily: fontH, fontWeight: 700, color: '#059669', textAlign: 'right' }}>
                      ₦{((c.total_earnings || 0) / 100).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
