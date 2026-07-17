import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import MobileNav from '@/components/MobileNav';
import HeaderShareButton from '@/components/HeaderShareButton';
import SetupWidget from '@/components/SetupWidget';
import AnalyticsChart from '@/components/AnalyticsChart';

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
    .select('amount, fundraiser_id, created_at, donor_name, donor_note')
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
          {/* Stat Card 1 */}
          <div className="v2-stat-card">
            <div>
              <p className="v2-stat-label">Total Subscribers</p>
              <h3 className="v2-stat-value">{activeSubsCount.toLocaleString()}</h3>
            </div>
            <div style={{ height: '24px' }}></div>
          </div>

          <div className="v2-stat-card">
            <AnalyticsChart transactions={allTransactions || []} formattedMRR={formatMRR(mrr)} />
          </div>

          <div className="v2-stat-card">
            <div>
              <p className="v2-stat-label">Tips & Fundraisers (All Time)</p>
              <div style={{ display: 'flex', gap: '24px', marginTop: '8px' }}>
                <div>
                  <h3 className="v2-stat-value" style={{ fontSize: '20px' }}>{formatMRR(tipsTotal)}</h3>
                  <p className="v2-stat-label" style={{ fontSize: '12px' }}>General Tips</p>
                </div>
                <div>
                  <h3 className="v2-stat-value" style={{ fontSize: '20px' }}>{formatMRR(fundraisersTotal)}</h3>
                  <p className="v2-stat-label" style={{ fontSize: '12px' }}>Goal Fundraisers</p>
                </div>
              </div>
            </div>
            <div style={{ height: '24px' }}></div>
          </div>
        </div>

        {/* Recent Subscriber Activity */}
        <section className="v2-activity-section">
          <div className="v2-activity-header">
            <h2 className="v2-activity-title">Recent Subscriber Activity</h2>
            <Link href="/creator/payouts" className="v2-activity-view-all">View All</Link>
          </div>
          
          <div className="v2-activity-list">
            {allRecentActivity.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--v2-text-variant)' }}>
                {isPublished 
                  ? "No recent activity yet. Share your page to get your first subscriber or tip!"
                  : "Complete your setup and publish your page to start getting subscribers!"
                }
              </div>
            ) : (
              allRecentActivity.map((item: any) => {
                if (item._type === 'donation') {
                  const donorName = item.donor_name || 'Guest Fan';
                  const activitySubtext = item.fundraiser_id ? `Donated to Fundraiser` : `Sent a Tip`;
                  return (
                    <div key={item.id} className="v2-activity-item">
                      <div className="v2-activity-user">
                        <div className="v2-activity-avatar">
                          <span className="material-symbols-outlined">volunteer_activism</span>
                        </div>
                        <div>
                          <p className="v2-activity-name" style={{ fontWeight: 600 }}>{donorName}</p>
                          <p className="v2-activity-desc">{activitySubtext} {item.donor_note ? ` - "${item.donor_note}"` : ''}</p>
                        </div>
                      </div>
                      <div className="v2-activity-right">
                        <p className="v2-activity-amount" style={{ color: 'var(--v2-green)' }}>+ ₦ {(item.amount / 100).toLocaleString()}</p>
                        <p className="v2-activity-time">{formatTimeAgo(item.created_at)}</p>
                      </div>
                    </div>
                  );
                }

                // Subscription logic
                const fanName = item.profiles?.display_name || item.profiles?.full_name || 'Anonymous Fan';
                const fanAvatar = item.profiles?.avatar_url;
                
                const tierInfo = item.subscriptions?.tiers;
                const tierName = Array.isArray(tierInfo) ? tierInfo[0]?.name : tierInfo?.name;
                const activitySubtext = tierName ? `Subscribed to ${tierName}` : `Payment Received (${item.status})`;
                
                return (
                  <div key={item.id} className="v2-activity-item">
                    <div className="v2-activity-user">
                      <div className="v2-activity-avatar">
                        {fanAvatar ? (
                          <img src={fanAvatar} alt="" />
                        ) : (
                          <span className="material-symbols-outlined">person</span>
                        )}
                      </div>
                      <div>
                        <p className="v2-activity-name" style={{ fontWeight: 600 }}>{fanName}</p>
                        <p className="v2-activity-desc">{activitySubtext}</p>
                      </div>
                    </div>
                    <div className="v2-activity-right">
                      <p className="v2-activity-amount">₦ {(item.amount / 100).toLocaleString()}</p>
                      <p className="v2-activity-time">{formatTimeAgo(item.created_at)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
    </main>
  );
}
