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

  const { data: creatorProfile } = await supabase
    .from('creator_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Fetch Subscriptions for MRR and 7d new
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('id, created_at, status, tiers(amount)')
    .eq('creator_id', user.id);

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

  // Fetch successful donations for Fundraisers vs Tips
  const { data: donations } = await supabase
    .from('donations')
    .select('id, amount, fundraiser_id, created_at, donor_name, donor_note')
    .eq('creator_id', user.id)
    .eq('status', 'success')
    .order('created_at', { ascending: false });

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

  // Fetch transactions for recent activity explicitly matching mockup style
  const { data: transactions } = await supabase
    .from('transactions')
    .select(`
      id,
      amount,
      status,
      created_at,
      profiles ( full_name, display_name, avatar_url ),
      subscriptions (
        tiers ( name )
      )
    `)
    .eq('creator_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  // Fetch all successful transactions for the Analytics chart
  const { data: allTransactions } = await supabase
    .from('transactions')
    .select('amount, created_at, status')
    .eq('creator_id', user.id)
    .eq('status', 'success')
    .order('created_at', { ascending: true });

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
  const { data: activeFundraisers } = await supabase
    .from('fundraisers')
    .select('id, title, target_amount, current_amount')
    .eq('creator_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  const shareUrl = `https://aza-chi.vercel.app/c/${creatorProfile?.slug}`; // Should use NEXT_PUBLIC variables later

  const { data: creatorTiers } = await supabase
    .from('tiers')
    .select('id')
    .eq('creator_id', user.id)
    .eq('is_active', true)
    .limit(1);

  const hasTiers = Boolean(creatorTiers && creatorTiers.length > 0);
  const hasBank = Boolean(creatorProfile?.bank_account_number && creatorProfile?.bank_code);
  const hasProfile = Boolean(profile?.avatar_url);
  const isPublished = Boolean(creatorProfile?.is_published);



  return (
    <main className="v2-main-content">
        <header className="v2-dash-header">
          <div>
            <h1 className="v2-dash-title">Overview</h1>
            <p className="v2-dash-desc">Here's what's happening with your community today.</p>
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
        <div className="v2-stats-grid">
          {/* Stat Card 1: Total Subscribers */}
          <div className="v2-stat-card">
            <div>
              <p className="v2-stat-label">Total Subscribers</p>
              <h3 className="v2-stat-value">{activeSubsCount.toLocaleString()}</h3>
            </div>
            <div style={{ height: '24px' }}></div>
          </div>

          {/* Stat Card 2: MRR & Revenue Chart */}
          <div className="v2-stat-card">
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
