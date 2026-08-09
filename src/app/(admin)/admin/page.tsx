import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';

export default async function AdminDashboard() {
  const admin = createAdminClient();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // --- All queries in parallel ---
  const [
    // Revenue (existing)
    todayTxRes, yesterdayTxRes, thisMonthTxRes, lastMonthTxRes,
    // Growth (existing + expanded)
    newUsersRes, newSubsRes, activeSubsRes, unsettledRes,
    // Activity feed (existing)
    recentTxRes, recentDonationsRes,
    // User totals
    totalUsersRes, totalCreatorsRes, totalFansRes,
    // Churn
    cancelledSubs7dRes, cancelledSubs30dRes,
    // MRR
    mrrRes,
    // Tips & fundraiser revenue
    tipsThisMonthRes, fundraiserThisMonthRes, allTipsRes,
    // Failed transactions
    failedTx7dRes,
    // Top creators
    topSubscribedRes, topEarningRes,
    // Creator health
    unverifiedCreatorsRes, unpublishedCreatorsRes,
    // Inactive creators
    allCreatorIdsRes, recentPostCreatorsRes,
    // Conversion rate
    activeSubFanIdsRes,
  ] = await Promise.all([
    // --- Existing revenue queries ---
    admin.from('transactions').select('platform_fee, amount').eq('status', 'success').gte('created_at', todayStart),
    admin.from('transactions').select('platform_fee, amount').eq('status', 'success').gte('created_at', yesterdayStart).lt('created_at', todayStart),
    admin.from('transactions').select('platform_fee, amount').eq('status', 'success').gte('created_at', thisMonthStart),
    admin.from('transactions').select('platform_fee, amount').eq('status', 'success').gte('created_at', lastMonthStart).lt('created_at', thisMonthStart),
    // --- Existing growth queries ---
    admin.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
    admin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active').gte('created_at', weekAgo),
    admin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    admin.from('transactions').select('creator_id', { count: 'exact', head: false }).eq('status', 'success').eq('settled', false),
    // --- Existing activity feed ---
    admin.from('transactions').select(`
      id, amount, platform_fee, created_at, subscription_id, paystack_reference,
      creator_profiles ( slug, display_name ),
      profiles!transactions_fan_id_fkey ( full_name )
    `).eq('status', 'success').order('created_at', { ascending: false }).limit(10),
    admin.from('donations').select('paystack_reference, fundraiser_id, donor_name').eq('status', 'success'),
    // --- NEW: User totals ---
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'creator'),
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'fan'),
    // --- NEW: Churn ---
    admin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'cancelled').gte('cancelled_at', weekAgo),
    admin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'cancelled').gte('cancelled_at', thirtyDaysAgo),
    // --- NEW: MRR (join active subs → tiers for price) ---
    admin.from('subscriptions').select('tier_id, tiers ( amount )').eq('status', 'active'),
    // --- NEW: Tips & fundraiser revenue this month ---
    admin.from('donations').select('amount').eq('status', 'success').is('fundraiser_id', null).gte('created_at', thisMonthStart),
    admin.from('donations').select('amount').eq('status', 'success').not('fundraiser_id', 'is', null).gte('created_at', thisMonthStart),
    // --- NEW: All tips (for average calculation) ---
    admin.from('donations').select('amount').eq('status', 'success').is('fundraiser_id', null),
    // --- NEW: Failed transactions ---
    admin.from('transactions').select('*', { count: 'exact', head: true }).eq('status', 'failed').gte('created_at', weekAgo),
    // --- NEW: Top creators ---
    admin.from('creator_profiles').select('display_name, slug, subscriber_count').order('subscriber_count', { ascending: false }).limit(5),
    admin.from('creator_profiles').select('display_name, slug, total_earnings').order('total_earnings', { ascending: false }).limit(5),
    // --- NEW: Creator health ---
    admin.from('creator_profiles').select('*', { count: 'exact', head: true }).eq('is_verified', false),
    admin.from('creator_profiles').select('*', { count: 'exact', head: true }).eq('is_published', false),
    // --- NEW: Inactive creators (all creators + recent posters) ---
    admin.from('creator_profiles').select('id'),
    admin.from('posts').select('creator_id').gte('created_at', thirtyDaysAgo),
    // --- NEW: Conversion rate (fans with active subs) ---
    admin.from('subscriptions').select('fan_id').eq('status', 'active'),
  ]);

  // ========================
  // REVENUE CALCULATIONS
  // ========================
  const todayRev = todayTxRes.data?.reduce((s: number, t: any) => s + t.platform_fee, 0) || 0;
  const yesterdayRev = yesterdayTxRes.data?.reduce((s: number, t: any) => s + t.platform_fee, 0) || 0;
  const thisMonthRev = thisMonthTxRes.data?.reduce((s: number, t: any) => s + t.platform_fee, 0) || 0;
  const lastMonthRev = lastMonthTxRes.data?.reduce((s: number, t: any) => s + t.platform_fee, 0) || 0;
  const thisMonthGross = thisMonthTxRes.data?.reduce((s: number, t: any) => s + (t.amount || 0), 0) || 0;
  const lastMonthGross = lastMonthTxRes.data?.reduce((s: number, t: any) => s + (t.amount || 0), 0) || 0;

  const todayChange = yesterdayRev > 0 ? Math.round(((todayRev - yesterdayRev) / yesterdayRev) * 100) : (todayRev > 0 ? 100 : 0);
  const monthChange = lastMonthRev > 0 ? Math.round(((thisMonthRev - lastMonthRev) / lastMonthRev) * 100) : (thisMonthRev > 0 ? 100 : 0);
  const grossChange = lastMonthGross > 0 ? Math.round(((thisMonthGross - lastMonthGross) / lastMonthGross) * 100) : (thisMonthGross > 0 ? 100 : 0);

  // ========================
  // PENDING PAYOUTS
  // ========================
  const unsettledByCreator: Record<string, number> = {};
  unsettledRes.data?.forEach((t: any) => {
    unsettledByCreator[t.creator_id] = (unsettledByCreator[t.creator_id] || 0) + 1;
  });
  const pendingPayoutCount = Object.keys(unsettledByCreator).length;

  // ========================
  // GROWTH & CHURN
  // ========================
  const totalUsers = totalUsersRes.count || 0;
  const totalCreators = totalCreatorsRes.count || 0;
  const totalFans = totalFansRes.count || 0;
  const newUsers7d = newUsersRes.count || 0;
  const newSubs7d = newSubsRes.count || 0;
  const activeSubs = activeSubsRes.count || 0;
  const cancelledSubs7d = cancelledSubs7dRes.count || 0;
  const cancelledSubs30d = cancelledSubs30dRes.count || 0;
  const netSubGrowth7d = newSubs7d - cancelledSubs7d;
  const churnDenominator = activeSubs + cancelledSubs30d;
  const churnRate30d = churnDenominator > 0
    ? ((cancelledSubs30d / churnDenominator) * 100).toFixed(1)
    : '0.0';

  // ========================
  // MRR & ARPU
  // ========================
  const mrr = mrrRes.data?.reduce((sum: number, sub: any) => {
    const tierData = sub.tiers;
    const amount = Array.isArray(tierData)
      ? (tierData[0]?.amount || 0)
      : (tierData as any)?.amount || 0;
    return sum + amount;
  }, 0) || 0;
  const arpu = activeSubs > 0 ? Math.round(mrr / activeSubs) : 0;

  // ========================
  // TIPS & FUNDRAISER REVENUE
  // ========================
  const tipsThisMonth = tipsThisMonthRes.data?.reduce((s: number, d: any) => s + (d.amount || 0), 0) || 0;
  const fundraiserThisMonth = fundraiserThisMonthRes.data?.reduce((s: number, d: any) => s + (d.amount || 0), 0) || 0;
  const allTipsData = allTipsRes.data || [];
  const avgTipAmount = allTipsData.length > 0
    ? Math.round(allTipsData.reduce((s: number, d: any) => s + (d.amount || 0), 0) / allTipsData.length)
    : 0;
  const failedTx7d = failedTx7dRes.count || 0;

  // ========================
  // CREATOR HEALTH
  // ========================
  const unverifiedCreators = unverifiedCreatorsRes.count || 0;
  const unpublishedCreators = unpublishedCreatorsRes.count || 0;

  // Inactive = creators with zero posts in the last 30 days
  const allCreatorIds = new Set((allCreatorIdsRes.data || []).map((c: any) => c.id));
  const activeCreatorIds = new Set((recentPostCreatorsRes.data || []).map((p: any) => p.creator_id));
  const inactiveCreators = [...allCreatorIds].filter(id => !activeCreatorIds.has(id)).length;

  // ========================
  // CONVERSION RATE
  // ========================
  const uniqueFansWithSubs = new Set((activeSubFanIdsRes.data || []).map((s: any) => s.fan_id)).size;
  const conversionRate = totalFans > 0
    ? ((uniqueFansWithSubs / totalFans) * 100).toFixed(1)
    : '0.0';

  // ========================
  // ACTIVITY FEED (existing logic)
  // ========================
  const recentActivity = (recentTxRes.data || []).map((tx: any) => {
    const creatorName = tx.creator_profiles?.display_name || tx.creator_profiles?.slug || 'Creator';
    const fanProfile = Array.isArray(tx.profiles) ? tx.profiles[0] : tx.profiles;
    const fanName = fanProfile?.full_name || 'Someone';

    let type = 'subscription';
    let icon = 'card_membership';
    let color = '#059669';
    let label = `${fanName} subscribed to ${creatorName}`;

    if (!tx.subscription_id) {
      const donation = recentDonationsRes.data?.find((d: any) => d.paystack_reference === tx.paystack_reference);
      if (donation?.fundraiser_id) {
        type = 'fundraiser';
        icon = 'volunteer_activism';
        color = '#d97706';
        label = `${donation.donor_name || fanName} donated to ${creatorName}'s fundraiser`;
      } else {
        type = 'tip';
        icon = 'favorite';
        color = '#2563eb';
        label = `${donation?.donor_name || fanName} tipped ${creatorName}`;
      }
    }

    return { ...tx, type, icon, color, label };
  });

  const topSubscribed = (topSubscribedRes.data || []) as any[];
  const topEarning = (topEarningRes.data || []) as any[];

  // ========================
  // STYLES
  // ========================
  const cardStyle = { background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' };
  const labelStyle: React.CSSProperties = { fontSize: '13px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' };
  const valueStyle: React.CSSProperties = { fontSize: '36px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 800, color: '#004e34', letterSpacing: '-0.02em' };
  const smallValueStyle: React.CSSProperties = { ...valueStyle, fontSize: '32px' };
  const sectionStyle: React.CSSProperties = { marginBottom: '40px' };
  const sectionTitleStyle: React.CSSProperties = { fontSize: '18px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' };
  const gridStyle = (minWidth = '200px'): React.CSSProperties => ({ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}, 1fr))`, gap: '20px' });

  const changeIndicator = (value: number) => (
    <span style={{ fontSize: '14px', fontWeight: 600, color: value >= 0 ? '#059669' : '#dc2626', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
      {value >= 0 ? '↑' : '↓'} {Math.abs(value)}%
    </span>
  );

  return (
    <div>
      <h1 style={{ fontSize: '32px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', marginBottom: '8px', letterSpacing: '-0.02em' }}>Admin Dashboard</h1>
      <p style={{ color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)', marginBottom: '40px', fontSize: '16px' }}>Here&apos;s what&apos;s happening on your platform right now.</p>

      {/* ============================================ */}
      {/* SECTION 1: REVENUE                          */}
      {/* ============================================ */}
      <div style={{ ...sectionStyle }}>
        <div style={gridStyle('260px')}>
          <div style={cardStyle}>
            <div style={labelStyle}>Gross Volume (This Month)</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
              <div style={valueStyle}>₦{(thisMonthGross / 100).toLocaleString()}</div>
              {lastMonthGross > 0 && (
                <span style={{ fontSize: '14px', fontWeight: 600, color: grossChange >= 0 ? '#059669' : '#dc2626', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
                  {grossChange >= 0 ? '↑' : '↓'} {Math.abs(grossChange)}% vs last month
                </span>
              )}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={labelStyle}>Today&apos;s Platform Revenue</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
              <div style={valueStyle}>₦{(todayRev / 100).toLocaleString()}</div>
              {yesterdayRev > 0 && (
                <span style={{ fontSize: '14px', fontWeight: 600, color: todayChange >= 0 ? '#059669' : '#dc2626', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
                  {todayChange >= 0 ? '↑' : '↓'} {Math.abs(todayChange)}% vs yesterday
                </span>
              )}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={labelStyle}>Platform Revenue (This Month)</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
              <div style={valueStyle}>₦{(thisMonthRev / 100).toLocaleString()}</div>
              {lastMonthRev > 0 && (
                <span style={{ fontSize: '14px', fontWeight: 600, color: monthChange >= 0 ? '#059669' : '#dc2626', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
                  {monthChange >= 0 ? '↑' : '↓'} {Math.abs(monthChange)}% vs last month
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* SECTION 2: GROWTH & HEALTH                  */}
      {/* ============================================ */}
      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>
          <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#059669' }}>trending_up</span>
          Growth &amp; Health
        </h2>
        <div style={gridStyle()}>
          {/* Total Users */}
          <div style={cardStyle}>
            <div style={labelStyle}>Total Users</div>
            <div style={smallValueStyle}>{totalUsers.toLocaleString()}</div>
            <div style={{ fontSize: '13px', color: '#6f7a72', fontFamily: 'var(--font-body, Inter, sans-serif)', marginTop: '4px' }}>
              {totalCreators.toLocaleString()} creators · {totalFans.toLocaleString()} fans
            </div>
          </div>

          {/* New Users (7d) */}
          <div style={cardStyle}>
            <div style={labelStyle}>New Users (7d)</div>
            <div style={smallValueStyle}>{newUsers7d.toLocaleString()}</div>
          </div>

          {/* New Subscribers (7d) */}
          <div style={cardStyle}>
            <div style={labelStyle}>New Subscribers (7d)</div>
            <div style={smallValueStyle}>{newSubs7d.toLocaleString()}</div>
          </div>

          {/* Active Subscriptions */}
          <div style={cardStyle}>
            <div style={labelStyle}>Active Subscriptions</div>
            <div style={smallValueStyle}>{activeSubs.toLocaleString()}</div>
          </div>

          {/* Cancelled Subs (7d) */}
          <div style={cardStyle}>
            <div style={labelStyle}>Cancelled Subs (7d)</div>
            <div style={{ ...smallValueStyle, color: cancelledSubs7d > 0 ? '#dc2626' : '#004e34' }}>
              {cancelledSubs7d.toLocaleString()}
            </div>
          </div>

          {/* Churn Rate (30d) */}
          <div style={cardStyle}>
            <div style={labelStyle}>Churn Rate (30d)</div>
            <div style={{ ...smallValueStyle, color: parseFloat(churnRate30d) > 5 ? '#dc2626' : parseFloat(churnRate30d) > 2 ? '#d97706' : '#059669' }}>
              {churnRate30d}%
            </div>
            <div style={{ fontSize: '12px', color: '#6f7a72', fontFamily: 'var(--font-body, Inter, sans-serif)', marginTop: '4px' }}>
              {cancelledSubs30d} cancelled / {churnDenominator} total
            </div>
          </div>

          {/* Net Sub Growth (7d) */}
          <div style={cardStyle}>
            <div style={labelStyle}>Net Sub Growth (7d)</div>
            <div style={{ ...smallValueStyle, color: netSubGrowth7d >= 0 ? '#059669' : '#dc2626' }}>
              {netSubGrowth7d >= 0 ? '+' : ''}{netSubGrowth7d.toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: '#6f7a72', fontFamily: 'var(--font-body, Inter, sans-serif)', marginTop: '4px' }}>
              +{newSubs7d} new · -{cancelledSubs7d} cancelled
            </div>
          </div>

          {/* Pending Payouts */}
          <div style={cardStyle}>
            <div style={labelStyle}>Pending Payouts</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
              <div style={{ ...smallValueStyle, color: pendingPayoutCount > 0 ? '#d97706' : '#004e34' }}>{pendingPayoutCount}</div>
              {pendingPayoutCount > 0 && (
                <Link href="/admin/payouts" style={{ fontSize: '13px', fontWeight: 600, color: '#2563eb', textDecoration: 'none', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
                  Review →
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* SECTION 3: REVENUE INTELLIGENCE             */}
      {/* ============================================ */}
      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>
          <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#2563eb' }}>insights</span>
          Revenue Intelligence
        </h2>
        <div style={gridStyle()}>
          {/* MRR */}
          <div style={cardStyle}>
            <div style={labelStyle}>MRR</div>
            <div style={smallValueStyle}>₦{(mrr / 100).toLocaleString()}</div>
            <div style={{ fontSize: '12px', color: '#6f7a72', fontFamily: 'var(--font-body, Inter, sans-serif)', marginTop: '4px' }}>
              Monthly Recurring Revenue
            </div>
          </div>

          {/* ARPU */}
          <div style={cardStyle}>
            <div style={labelStyle}>ARPU</div>
            <div style={smallValueStyle}>₦{(arpu / 100).toLocaleString()}</div>
            <div style={{ fontSize: '12px', color: '#6f7a72', fontFamily: 'var(--font-body, Inter, sans-serif)', marginTop: '4px' }}>
              Avg Revenue Per Subscriber
            </div>
          </div>

          {/* Tips Revenue (This Month) */}
          <div style={cardStyle}>
            <div style={labelStyle}>Tips (This Month)</div>
            <div style={smallValueStyle}>₦{(tipsThisMonth / 100).toLocaleString()}</div>
          </div>

          {/* Fundraiser Revenue (This Month) */}
          <div style={cardStyle}>
            <div style={labelStyle}>Fundraisers (This Month)</div>
            <div style={smallValueStyle}>₦{(fundraiserThisMonth / 100).toLocaleString()}</div>
          </div>

          {/* Average Tip Amount */}
          <div style={cardStyle}>
            <div style={labelStyle}>Avg Tip Amount</div>
            <div style={smallValueStyle}>₦{(avgTipAmount / 100).toLocaleString()}</div>
            <div style={{ fontSize: '12px', color: '#6f7a72', fontFamily: 'var(--font-body, Inter, sans-serif)', marginTop: '4px' }}>
              Across {allTipsData.length.toLocaleString()} total tips
            </div>
          </div>

          {/* Failed Transactions */}
          <div style={cardStyle}>
            <div style={labelStyle}>Failed Transactions (7d)</div>
            <div style={{ ...smallValueStyle, color: failedTx7d > 0 ? '#dc2626' : '#059669' }}>
              {failedTx7d.toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: '#6f7a72', fontFamily: 'var(--font-body, Inter, sans-serif)', marginTop: '4px' }}>
              {failedTx7d === 0 ? 'All clear ✓' : 'May need investigation'}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* SECTION 4: CREATOR HEALTH & LEADERBOARDS    */}
      {/* ============================================ */}
      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>
          <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#d97706' }}>workspace_premium</span>
          Creator Health
        </h2>

        {/* Health stat cards */}
        <div style={{ ...gridStyle(), marginBottom: '24px' }}>
          <div style={cardStyle}>
            <div style={labelStyle}>Unverified Creators</div>
            <div style={{ ...smallValueStyle, color: unverifiedCreators > 0 ? '#d97706' : '#059669' }}>
              {unverifiedCreators.toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: '#6f7a72', fontFamily: 'var(--font-body, Inter, sans-serif)', marginTop: '4px' }}>
              No bank details set up
            </div>
          </div>

          <div style={cardStyle}>
            <div style={labelStyle}>Unpublished Creators</div>
            <div style={{ ...smallValueStyle, color: unpublishedCreators > 0 ? '#d97706' : '#059669' }}>
              {unpublishedCreators.toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: '#6f7a72', fontFamily: 'var(--font-body, Inter, sans-serif)', marginTop: '4px' }}>
              Page not live yet
            </div>
          </div>

          <div style={cardStyle}>
            <div style={labelStyle}>Inactive Creators (30d)</div>
            <div style={{ ...smallValueStyle, color: inactiveCreators > 0 ? '#d97706' : '#059669' }}>
              {inactiveCreators.toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: '#6f7a72', fontFamily: 'var(--font-body, Inter, sans-serif)', marginTop: '4px' }}>
              No posts in 30 days
            </div>
          </div>

          <div style={cardStyle}>
            <div style={labelStyle}>Fan Conversion Rate</div>
            <div style={{ ...smallValueStyle, color: parseFloat(conversionRate) > 10 ? '#059669' : parseFloat(conversionRate) > 3 ? '#d97706' : '#dc2626' }}>
              {conversionRate}%
            </div>
            <div style={{ fontSize: '12px', color: '#6f7a72', fontFamily: 'var(--font-body, Inter, sans-serif)', marginTop: '4px' }}>
              {uniqueFansWithSubs.toLocaleString()} of {totalFans.toLocaleString()} fans subscribe
            </div>
          </div>
        </div>

        {/* Leaderboards side-by-side */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {/* Top 5 Most Subscribed */}
          <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', background: '#f8faf9' }}>
              <h3 style={{ fontSize: '15px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', margin: 0 }}>
                Top 5 Most Subscribed
              </h3>
            </div>
            {topSubscribed.length === 0 ? (
              <div style={{ padding: '32px 24px', textAlign: 'center', color: '#6f7a72', fontSize: '14px', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>No creators yet.</div>
            ) : (
              <div>
                {topSubscribed.map((creator: any, idx: number) => (
                  <div key={creator.slug || idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 24px', borderBottom: idx < topSubscribed.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: idx === 0 ? '#fef3c7' : idx === 1 ? '#f3f4f6' : idx === 2 ? '#fef0e6' : '#f8faf9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: idx === 0 ? '#d97706' : '#6f7a72', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', flexShrink: 0 }}>
                      {idx + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link href={`/c/${creator.slug}`} style={{ fontSize: '14px', fontWeight: 600, color: '#0b1c30', textDecoration: 'none', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
                        {creator.display_name || creator.slug}
                      </Link>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#059669', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', flexShrink: 0 }}>
                      {(creator.subscriber_count || 0).toLocaleString()} subs
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top 5 Highest Earning */}
          <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', background: '#f8f9ff' }}>
              <h3 style={{ fontSize: '15px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', margin: 0 }}>
                Top 5 Highest Earning
              </h3>
            </div>
            {topEarning.length === 0 ? (
              <div style={{ padding: '32px 24px', textAlign: 'center', color: '#6f7a72', fontSize: '14px', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>No creators yet.</div>
            ) : (
              <div>
                {topEarning.map((creator: any, idx: number) => (
                  <div key={creator.slug || idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 24px', borderBottom: idx < topEarning.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: idx === 0 ? '#fef3c7' : idx === 1 ? '#f3f4f6' : idx === 2 ? '#fef0e6' : '#f8faf9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: idx === 0 ? '#d97706' : '#6f7a72', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', flexShrink: 0 }}>
                      {idx + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link href={`/c/${creator.slug}`} style={{ fontSize: '14px', fontWeight: 600, color: '#0b1c30', textDecoration: 'none', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
                        {creator.display_name || creator.slug}
                      </Link>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#059669', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', flexShrink: 0 }}>
                      ₦{((creator.total_earnings || 0) / 100).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* SECTION 5: RECENT ACTIVITY (existing)       */}
      {/* ============================================ */}
      <div style={sectionStyle}>
        <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid #E2E8F0', background: '#f8f9ff' }}>
            <h2 style={{ fontSize: '20px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', margin: 0 }}>Recent Activity</h2>
          </div>

          {recentActivity.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
              No recent activity yet.
            </div>
          ) : (
            <div>
              {recentActivity.map((event: any, idx: number) => (
                <div key={event.id || idx} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 24px', borderBottom: idx < recentActivity.length - 1 ? '1px solid #E2E8F0' : 'none' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `${event.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: event.color }}>{event.icon}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontFamily: 'var(--font-body, Inter, sans-serif)', color: '#0b1c30', fontWeight: 500 }}>{event.label}</div>
                    <div style={{ fontSize: '12px', fontFamily: 'var(--font-body, Inter, sans-serif)', color: '#6f7a72', marginTop: '2px' }}>
                      {new Date(event.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ fontSize: '15px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#059669', flexShrink: 0 }}>
                    ₦{((event.amount || 0) / 100).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
