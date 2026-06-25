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
      status, created_at,
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

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
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
    <main className="v2-main-content" style={{ background: 'var(--v2-surface)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%', padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Page Header */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Link href="/creator/payouts" style={{ color: 'var(--v2-text-variant)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span> Back to Earnings
            </Link>
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: 600, color: 'var(--v2-primary)', marginBottom: '8px', letterSpacing: '-0.01em' }}>Analytics</h1>
              <p style={{ fontSize: '16px', color: 'var(--v2-text-variant)' }}>Understand your revenue and audience growth.</p>
            </div>
          </div>

          {/* Grid Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
            
            {/* Revenue Trends Chart (md:col-span-8) */}
            <div style={{ gridColumn: 'span 12', background: 'var(--v2-surface)', border: '1px solid var(--v2-outline)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column' }} className="md-col-8">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--v2-text-variant)', marginBottom: '4px' }}>Revenue Trends (6 Months)</p>
                  <h2 style={{ fontSize: '36px', fontWeight: 700, color: 'var(--v2-primary)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                    ₦ {totalRevenue.toLocaleString() + '.00'}
                  </h2>
                </div>
                <div style={{ padding: '6px 12px', background: 'rgba(5, 150, 105, 0.1)', color: 'var(--v2-green)', borderRadius: '9999px', fontSize: '12px', fontWeight: 600 }}>
                  +12% MRR Growth
                </div>
              </div>
              
              <div style={{ marginTop: 'auto' }}>
                <AnalyticsChartClient data={chartData} />
              </div>
            </div>

            {/* Side Cards Wrapper (md:col-span-4) */}
            <div className="md-col-4" style={{ gridColumn: 'span 12', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Audience Health Card */}
              <div style={{ background: 'var(--v2-surface-lowest)', border: '1px solid var(--v2-outline)', borderRadius: '12px', padding: '24px', flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--v2-text-variant)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '24px' }}>Audience Health</p>
                
                <div style={{ marginBottom: '24px' }}>
                  <p style={{ fontSize: '12px', color: 'var(--v2-text-variant)', marginBottom: '4px' }}>Active Subscribers</p>
                  <h3 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--v2-primary)' }}>{activeSubs.length}</h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid rgba(126, 117, 118, 0.5)', paddingTop: '16px' }}>
                  <div>
                    <p style={{ fontSize: '12px', color: 'var(--v2-text-variant)', marginBottom: '4px' }}>New (This Month)</p>
                    <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--v2-green)' }}>+{newSubsThisMonth}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: 'var(--v2-text-variant)', marginBottom: '4px' }}>Churned</p>
                    <p style={{ fontSize: '16px', fontWeight: 600, color: '#dc2626' }}>{churnedSubs.length}</p>
                  </div>
                </div>
              </div>

              {/* Tier Performance Card */}
              <div style={{ background: 'var(--v2-surface)', border: '1px solid var(--v2-outline)', borderRadius: '12px', padding: '24px', flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--v2-text-variant)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '24px' }}>Tier Performance</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {topTiers.length === 0 ? (
                    <p style={{ fontSize: '14px', color: 'var(--v2-text-variant)' }}>No active tiers generating revenue.</p>
                  ) : (
                    topTiers.map((tier, idx) => {
                      const percentage = Math.round((tier.revenue / mrr) * 100) || 0;
                      return (
                        <div key={idx}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                            <div>
                              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--v2-primary)' }}>{tier.name}</p>
                              <p style={{ fontSize: '12px', color: 'var(--v2-text-variant)' }}>{tier.count} subs • ₦{tier.revenue.toLocaleString()}/mo</p>
                            </div>
                            <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--v2-green)' }}>{percentage}%</p>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: 'var(--v2-surface-low)', borderRadius: '99px', overflow: 'hidden' }}>
                            <div style={{ width: `${percentage}%`, height: '100%', background: 'var(--v2-green)', borderRadius: '99px' }} />
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
