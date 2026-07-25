import { createClient } from '@/lib/supabase/server';
import AnalyticsChart from '@/components/AnalyticsChart';
import ActiveGoalsCard from '@/components/dashboard/ActiveGoalsCard';

interface DashboardStatsWrapperProps {
  userId: string;
}

export default async function DashboardStatsWrapper({ userId }: DashboardStatsWrapperProps) {
  const supabase = await createClient();

  // Fetch all stats data concurrently
  const [
    { data: subscriptions },
    { data: allTransactions },
    { data: activeFundraisers }
  ] = await Promise.all([
    supabase.from('subscriptions').select('id, created_at, status, tiers(amount)').eq('creator_id', userId),
    supabase.from('transactions').select('amount, created_at, status').eq('creator_id', userId).eq('status', 'success').order('created_at', { ascending: true }),
    supabase.from('fundraisers').select('id, title, target_amount, current_amount').eq('creator_id', userId).eq('is_active', true).order('created_at', { ascending: false })
  ]);

  let mrr = 0;
  let newSubs7d = 0;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  let activeSubsCount = 0;

  if (subscriptions) {
    subscriptions.forEach(sub => {
      if (sub.status === 'active') {
        activeSubsCount++;
        const tierData = Array.isArray(sub.tiers) ? sub.tiers[0] : sub.tiers;
        mrr += (tierData?.amount || 0);
        
        if (new Date(sub.created_at) >= sevenDaysAgo) {
          newSubs7d++;
        }
      }
    });
  }

  // Format MRR (e.g. 4.2M, 50k, etc.)
  const formatMRR = (amountKobo: number) => {
    const amountNaira = amountKobo / 100;
    if (amountNaira >= 1000000) return `₦ ${(amountNaira / 1000000).toFixed(1)}M`;
    if (amountNaira >= 1000) return `₦ ${(amountNaira / 1000).toFixed(1)}k`;
    return `₦ ${amountNaira.toLocaleString()}`;
  };

  return (
    <div className="v2-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
      {/* Stat Card 1: Total Subscribers */}
      <div className="az-card" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px' }}>
        <div>
          <p className="az-label" style={{ margin: 0, color: '#3f4943', fontWeight: 600, fontFamily: 'var(--font-body, Inter, sans-serif)' }}>Total Subscribers</p>
          <h3 style={{ fontSize: '32px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#004e34', margin: '8px 0 0 0' }}>{activeSubsCount.toLocaleString()}</h3>
          {newSubs7d > 0 && (
            <p style={{ fontSize: '13px', color: '#059669', fontFamily: 'var(--font-body, Inter, sans-serif)', margin: '4px 0 0 0', fontWeight: 600 }}>
              +{newSubs7d} in the last 7 days
            </p>
          )}
        </div>
      </div>

      {/* Stat Card 2: MRR & Revenue Chart */}
      <div className="az-card" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px' }}>
        <AnalyticsChart transactions={allTransactions || []} formattedMRR={formatMRR(mrr)} />
      </div>

      {/* Stat Card 3: Active Goals Carousel */}
      <ActiveGoalsCard fundraisers={activeFundraisers || []} />
    </div>
  );
}
