import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import MobileNav from '@/components/MobileNav';
import HeaderShareButton from '@/components/HeaderShareButton';
import SetupWidget from '@/components/SetupWidget';

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
  const hasProfile = Boolean(profile?.avatar_url && creatorProfile?.bio);
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
            {/* Real stats deliberately omitted from sub-text as requested */}
            <div style={{ height: '24px' }}></div>
          </div>

          {/* Stat Card 2 */}
          <div className="v2-stat-card">
            <div>
              <p className="v2-stat-label">Monthly Recurring Revenue</p>
              <h3 className="v2-stat-value">{formatMRR(mrr)}</h3>
            </div>
            {/* Simple Line Chart (SVG) */}
            <div style={{ marginTop: '24px', height: '48px', width: '100%' }}>
              <svg style={{ width: '100%', height: '100%', stroke: 'var(--v2-green)', fill: 'none', strokeWidth: 2 }} preserveAspectRatio="none" viewBox="0 0 100 30">
                <path d="M0,30 L10,25 L20,28 L30,15 L40,20 L50,10 L60,18 L70,5 L80,12 L90,2 L100,0" vectorEffect="non-scaling-stroke"></path>
              </svg>
            </div>
          </div>

          {/* Stat Card 3 */}
          <div className="v2-stat-card">
            <div>
              <p className="v2-stat-label">New Subscribers (7d)</p>
              <h3 className="v2-stat-value">{newSubs7d.toLocaleString()}</h3>
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
            {(!transactions || transactions.length === 0) ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--v2-text-variant)' }}>
                {isPublished 
                  ? "No recent activity yet. Share your page to get your first subscriber!"
                  : "Complete your setup and publish your page to start getting subscribers!"
                }
              </div>
            ) : (
              transactions.map((tx: any) => {
                const fanName = tx.profiles?.display_name || tx.profiles?.full_name || 'Anonymous Fan';
                const fanAvatar = tx.profiles?.avatar_url;
                
                // Extract tier name from nested join
                const tierInfo = tx.subscriptions?.tiers;
                const tierName = Array.isArray(tierInfo) ? tierInfo[0]?.name : tierInfo?.name;
                const activitySubtext = tierName ? `Subscribed to ${tierName}` : `Payment Received (${tx.status})`;
                
                return (
                  <div key={tx.id} className="v2-activity-item">
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
                      <p className="v2-activity-amount">₦ {(tx.amount / 100).toLocaleString()}</p>
                      <p className="v2-activity-time">{formatTimeAgo(tx.created_at)}</p>
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
