import { createAdminClient } from '@/lib/supabase/admin';
import { RevenueChart } from './RevenueChart';
import Link from 'next/link';

export default async function AdminAnalyticsPage() {
  const supabase = createAdminClient();

  // 1. Fetch Transactions for Revenue Chart (Platform Fee)
  // Group by day for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: transactions } = await supabase
    .from('transactions')
    .select('platform_fee, created_at, status')
    .gte('created_at', thirtyDaysAgo.toISOString())
    .eq('status', 'success');

  // Aggregate revenue by date
  const revenueByDate: Record<string, number> = {};
  
  // Initialize last 30 days with 0
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    revenueByDate[dateStr] = 0;
  }

  let totalPlatformRevenue = 0;

  if (transactions) {
    transactions.forEach(tx => {
      const dateStr = new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (revenueByDate[dateStr] !== undefined) {
        revenueByDate[dateStr] += tx.platform_fee;
        totalPlatformRevenue += tx.platform_fee;
      }
    });
  }

  const chartData = Object.keys(revenueByDate).map(date => ({
    date,
    revenue: revenueByDate[date]
  }));

  // 2. Fetch Creator Leaderboard
  // Let's implement a direct query approach
  // Let's implement a direct query approach since we might not have the RPC
  const { data: allSuccessTx } = await supabase
    .from('transactions')
    .select('creator_id, creator_share')
    .eq('status', 'success');

  const creatorEarnings: Record<string, number> = {};
  if (allSuccessTx) {
    allSuccessTx.forEach(tx => {
      creatorEarnings[tx.creator_id] = (creatorEarnings[tx.creator_id] || 0) + tx.creator_share;
    });
  }

  // Sort and get top 10 creator IDs
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
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', marginBottom: '8px', letterSpacing: '-0.02em' }}>Deep Analytics</h1>
        <p style={{ color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '16px' }}>Business intelligence, platform revenue, and creator leaderboards.</p>
      </div>

      {/* Top Level Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '13px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>30-Day Platform Revenue (10% Cut)</div>
          <div style={{ fontSize: '36px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 800, color: '#004e34', letterSpacing: '-0.03em' }}>
            ₦{(totalPlatformRevenue / 100).toLocaleString()}
          </div>
        </div>
        <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '13px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Active Earning Creators</div>
          <div style={{ fontSize: '36px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 800, color: '#004e34', letterSpacing: '-0.03em' }}>
            {Object.keys(creatorEarnings).length}
          </div>
        </div>
        <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '13px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Total Transactions (30 Days)</div>
          <div style={{ fontSize: '36px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 800, color: '#004e34', letterSpacing: '-0.03em' }}>
            {transactions?.length || 0}
          </div>
        </div>
      </div>

      {/* Revenue Chart Section */}
      <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px', marginBottom: '40px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <h2 style={{ fontSize: '20px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', marginBottom: '24px' }}>Net Platform Revenue Over Time</h2>
        <RevenueChart data={chartData} />
      </div>

      {/* Top Creators Leaderboard */}
      <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #E2E8F0', background: '#f8f9ff' }}>
          <h2 style={{ fontSize: '20px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', marginBottom: '4px' }}>Top Creators Leaderboard</h2>
          <p style={{ margin: 0, fontSize: '14px', fontFamily: 'var(--font-body, Inter, sans-serif)', color: '#3f4943' }}>Ranked by lifetime earnings generated on MyAzaa.</p>
        </div>
        
        {topCreators.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>No creator earnings data available.</div>
        ) : (
         <div className="v2-table-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ minWidth: '800px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 3fr 1fr 1fr', padding: '16px 24px', background: '#f8f9ff', borderBottom: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rank</span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Creator</span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subscribers</span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Total Earnings</span>
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
    </div>
  );
}
