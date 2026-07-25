import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import MobileNav from '@/components/MobileNav';
import HeaderShareButton from '@/components/HeaderShareButton';
import SetupWidget from '@/components/SetupWidget';
import AnalyticsChart from '@/components/AnalyticsChart';
import RecentActivityFeed from '@/components/dashboard/RecentActivityFeed';
import ActiveGoalsCard from '@/components/dashboard/ActiveGoalsCard';

// Utility for relative time formatting
function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return `${diffInSeconds} secs ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 172800) return 'Yesterday';
  return `${Math.floor(diffInSeconds / 86400)} days ago`;
}

export default async function CreatorDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, display_name, role, avatar_url')
    .eq('id', user.id)
    .single();

  if (!profile?.role || profile?.role === 'user') redirect('/onboarding');
  if (profile?.role !== 'creator') redirect('/fan');

  const [
    { data: creatorProfile },
    { data: subscriptions },
    { data: donations },
    { data: transactions },
    { data: allTransactions },
    { data: activeFundraisers },
    { data: creatorTiers }
  ] = await Promise.all([
    supabase.from('creator_profiles').select('*').eq('id', user.id).single(),
    supabase.from('subscriptions').select('id, created_at, status, tiers(amount)').eq('creator_id', user.id),
    supabase.from('donations').select('id, amount, fundraiser_id, created_at, donor_name, donor_note').eq('creator_id', user.id).eq('status', 'success').order('created_at', { ascending: false }),
    supabase.from('transactions').select(`
      id,
      amount,
      status,
      created_at,
      profiles ( full_name, display_name, avatar_url ),
      subscriptions (
        tiers ( name )
      )
    `).eq('creator_id', user.id).order('created_at', { ascending: false }).limit(10),
    supabase.from('transactions').select('amount, created_at, status').eq('creator_id', user.id).eq('status', 'success').order('created_at', { ascending: true }),
    supabase.from('fundraisers').select('id, title, target_amount, current_amount').eq('creator_id', user.id).eq('is_active', true).order('created_at', { ascending: false }),
    supabase.from('tiers').select('id').eq('creator_id', user.id).eq('is_active', true).limit(1)
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

  let fundraisersTotal = 0;
  let tipsTotal = 0;

  if (donations) {
    donations.forEach(d => {
      if (d.fundraiser_id) {
        fundraisersTotal += d.amount;
      } else {
        tipsTotal += d.amount;
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

  // Merge transactions and donations for recent activity
  const allRecentActivity = [
    ...(transactions || []).map((tx: any) => ({
      ...tx,
      _type: 'subscription'
    })),
    ...(donations || []).slice(0, 10).map((d: any) => ({
      ...d,
      _type: 'donation',
      id: d.id || Math.random().toString()
    }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);

  const displayName = creatorProfile?.display_name || profile?.display_name || profile?.full_name || 'Creator';
  const avatarUrl = profile?.avatar_url;
  
  const shareUrl = `https://aza-chi.vercel.app/c/${creatorProfile?.slug}`; // Should use NEXT_PUBLIC variables later

  const hasTiers = Boolean(creatorTiers && creatorTiers.length > 0);
  const hasBank = Boolean(creatorProfile?.bank_account_number && creatorProfile?.bank_code);
  const hasProfile = Boolean(profile?.avatar_url);
  const isPublished = Boolean(creatorProfile?.is_published);



  return (
    <main style={{ padding: '24px 16px' }}>
        <header className="v2-dash-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="az-h1" style={{ fontSize: '32px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', margin: 0 }}>Overview</h1>
            <p className="az-body" style={{ color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)', margin: '4px 0 0 0' }}>Here's what's happening with your community today.</p>
          </div>
          <div className="hidden md:flex">
             {isPublished && <HeaderShareButton url={shareUrl} />}
          </div>
        </header>

        <SetupWidget 
          userId={user.id} 
          hasProfile={hasProfile} 
          hasBank={hasBank} 
          hasTiers={hasTiers} 
          isPublished={isPublished} 
        />

        {/* Stats Grid */}
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

          {/* Stat Card 3: Active Goals Carousel (Renders conditionally if active goals exist) */}
          <ActiveGoalsCard fundraisers={activeFundraisers || []} />
        </div>

        {/* Recent Activity with 4-Tab Filter */}
        <RecentActivityFeed activities={allRecentActivity as any} isPublished={isPublished} />
    </main>
  );
}
