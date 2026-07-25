import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import MobileNav from '@/components/MobileNav';
import AnalyticsChartClient from './ChartClient';

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, { data: creatorProfile }] = await Promise.all([
    supabase.from('profiles').select('avatar_url, display_name, full_name').eq('id', user.id).single(),
    supabase.from('creator_profiles').select('*').eq('id', user.id).single()
  ]);

  if (!creatorProfile) redirect('/login');

  const displayName = creatorProfile?.display_name || profile?.display_name || profile?.full_name || 'Creator';
  const avatarUrl = profile?.avatar_url;

  // 1. Fetch Revenue Trends Data (Last 6 Months Mock/Aggregated)
  const { data: transactions } = await supabase
    .from('transactions')
    .select('creator_share, created_at, status')
    .eq('creator_id', user.id)
    .eq('status', 'success')
    .order('created_at', { ascending: true });

  // Group by month for the chart
  const monthlyRevenue: Record<string, number> = {};
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  if (transactions) {
    transactions.forEach(tx => {
      const date = new Date(tx.created_at);
      const month = monthNames[date.getMonth()];
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (tx.creator_share / 100);
    });
  }

  // Ensure we have at least 6 months of data points to look good
  const chartData = monthNames.slice(new Date().getMonth() - 5, new Date().getMonth() + 1).map(month => ({
    name: month,
    value: monthlyRevenue[month] || 0
  }));

  if (chartData.length === 0) {
    chartData.push({ name: 'This Month', value: 0 });
  }

  const totalRevenue = chartData.reduce((sum, item) => sum + item.value, 0);

  // 2. Fetch Audience Health & Tier Performance
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select(`
      status, created_at, cancelled_at,
      tiers (name, amount)
    `)
    .eq('creator_id', user.id);

  const activeSubs = subscriptions?.filter(sub => sub.status === 'active') || [];
  const churnedSubs = subscriptions?.filter(sub => sub.status === 'cancelled') || [];
  
  const tierStats: Record<string, { count: number; revenue: number }> = {};
  activeSubs.forEach(sub => {
    const tierInfo = Array.isArray(sub.tiers) ? sub.tiers[0] : sub.tiers;
    const tierName = tierInfo?.name || 'Tip';
    const amount = (tierInfo?.amount || 0) / 100;
    
    if (!tierStats[tierName]) {
      tierStats[tierName] = { count: 0, revenue: 0 };
    }
    tierStats[tierName].count += 1;
    tierStats[tierName].revenue += amount;
  });

  const mrr = activeSubs.reduce((sum, sub) => {
    const tierInfo = Array.isArray(sub.tiers) ? sub.tiers[0] : sub.tiers;
    return sum + ((tierInfo?.amount || 0) / 100);
  }, 0);

  const now = new Date();
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const prevMonthSubs = (subscriptions || []).filter(sub => {
    const createdAt = new Date(sub.created_at);
    const cancelledAt = sub.cancelled_at ? new Date(sub.cancelled_at) : null;
    return createdAt < startOfCurrentMonth && (!cancelledAt || cancelledAt >= startOfCurrentMonth);
  });

  const prevMrr = prevMonthSubs.reduce((sum, sub) => {
    const tierInfo = Array.isArray(sub.tiers) ? sub.tiers[0] : sub.tiers;
    return sum + ((tierInfo?.amount || 0) / 100);
  }, 0);

  let mrrGrowthPercent = 0;
  let hasMrrData = true;

  if (prevMrr > 0) {
    mrrGrowthPercent = Math.round(((mrr - prevMrr) / prevMrr) * 100);
  } else if (mrr > 0) {
    mrrGrowthPercent = 100;
  } else {
    hasMrrData = false;
  }

  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const newSubsThisMonth = activeSubs.filter(sub => {
     const d = new Date(sub.created_at);
     return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  // Convert to array and sort by revenue
  const topTiers = Object.entries(tierStats)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 3); // Top 3 tiers

  return (
    <main style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%', padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Page Header */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Link href="/creator/payouts" style={{ color: '#004e34', fontSize: '14px', fontFamily: 'var(--font-body, Inter, sans-serif)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span> Back to Earnings
            </Link>
            <div>
              <h1 style={{ fontSize: '32px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', marginBottom: '8px', letterSpacing: '-0.01em' }}>Analytics</h1>
              <p style={{ fontSize: '16px', fontFamily: 'var(--font-body, Inter, sans-serif)', color: '#3f4943' }}>Understand your revenue and audience growth.</p>
            </div>
          </div>

          {/* Grid Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
            
            {/* Revenue Trends Chart (md:col-span-8) */}
            <div style={{ gridColumn: 'span 12', background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }} className="md-col-8">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)', marginBottom: '4px' }}>Revenue Trends (6 Months)</p>
                  <h2 style={{ fontSize: '36px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#004e34', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                    ₦ {totalRevenue.toLocaleString() + '.00'}
                  </h2>
                </div>
                {hasMrrData && (
                  <div style={{
                    padding: '6px 12px',
                    background: mrrGrowthPercent >= 0 ? '#ecfdf5' : '#fef2f2',
                    color: mrrGrowthPercent >= 0 ? '#059669' : '#dc2626',
                    border: `1px solid ${mrrGrowthPercent >= 0 ? '#a7f3d0' : '#fca5a5'}`,
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: 600,
                    fontFamily: 'var(--font-body, Inter, sans-serif)'
                  }}>
                    {mrrGrowthPercent >= 0 ? `+${mrrGrowthPercent}%` : `${mrrGrowthPercent}%`} MRR Growth
                  </div>
                )}
              </div>
              
              <div style={{ marginTop: 'auto' }}>
                <AnalyticsChartClient data={chartData} />
              </div>
            </div>

            {/* Side Cards Wrapper (md:col-span-4) */}
            <div className="md-col-4" style={{ gridColumn: 'span 12', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Audience Health Card */}
              <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '24px', flex: 1, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
                <p style={{ fontSize: '14px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '24px' }}>Audience Health</p>
                
                <div style={{ marginBottom: '24px' }}>
                  <p style={{ fontSize: '12px', color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)', marginBottom: '4px' }}>Active Subscribers</p>
                  <h3 style={{ fontSize: '28px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#004e34' }}>{activeSubs.length}</h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
                  <div>
                    <p style={{ fontSize: '12px', color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)', marginBottom: '4px' }}>New (This Month)</p>
                    <p style={{ fontSize: '16px', fontWeight: 600, color: '#059669', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>+{newSubsThisMonth}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)', marginBottom: '4px' }}>Churned</p>
                    <p style={{ fontSize: '16px', fontWeight: 600, color: '#ba1a1a', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>{churnedSubs.length}</p>
                  </div>
                </div>
              </div>

              {/* Tier Performance Card */}
              <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '24px', flex: 1, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
                <p style={{ fontSize: '14px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '24px' }}>Tier Performance</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {topTiers.length === 0 ? (
                    <p style={{ fontSize: '14px', color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>No active tiers generating revenue.</p>
                  ) : (
                    topTiers.map((tier, idx) => {
                      const percentage = Math.round((tier.revenue / mrr) * 100) || 0;
                      return (
                        <div key={idx}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                            <div>
                              <p style={{ fontSize: '14px', fontWeight: 600, color: '#0b1c30', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>{tier.name}</p>
                              <p style={{ fontSize: '12px', color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>{tier.count} subs • ₦{tier.revenue.toLocaleString()}/mo</p>
                            </div>
                            <p style={{ fontSize: '14px', fontWeight: 700, color: '#004e34', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>{percentage}%</p>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: '#eff4ff', borderRadius: '99px', overflow: 'hidden' }}>
                            <div style={{ width: `${percentage}%`, height: '100%', background: '#004e34', borderRadius: '99px' }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
  );
}
