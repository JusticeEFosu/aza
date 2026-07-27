import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';

export default async function AdminDashboard() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // --- All queries in parallel ---
  const [
    todayTxRes, yesterdayTxRes, thisMonthTxRes, lastMonthTxRes,
    newUsersRes, newSubsRes, activeSubsRes,
    unsettledRes, recentTxRes, recentDonationsRes
  ] = await Promise.all([
    // Today's revenue
    admin.from('transactions').select('platform_fee, amount').eq('status', 'success').gte('created_at', todayStart),
    // Yesterday's revenue
    admin.from('transactions').select('platform_fee, amount').eq('status', 'success').gte('created_at', yesterdayStart).lt('created_at', todayStart),
    // This month's revenue
    admin.from('transactions').select('platform_fee, amount').eq('status', 'success').gte('created_at', thisMonthStart),
    // Last month's revenue
    admin.from('transactions').select('platform_fee, amount').eq('status', 'success').gte('created_at', lastMonthStart).lt('created_at', thisMonthStart),
    // New users this week
    admin.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
    // New subscribers this week
    admin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active').gte('created_at', weekAgo),
    // Active subscriptions right now
    admin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    // Pending payouts (unsettled transactions)
    admin.from('transactions').select('creator_id', { count: 'exact', head: false }).eq('status', 'success').eq('settled', false),
    // Recent transactions for activity feed
    admin.from('transactions').select(`
      id, amount, platform_fee, created_at, subscription_id, paystack_reference,
      creator_profiles ( slug, display_name ),
      profiles!transactions_fan_id_fkey ( full_name )
    `).eq('status', 'success').order('created_at', { ascending: false }).limit(10),
    // Recent donations (to identify tips vs fundraiser)
    admin.from('donations').select('paystack_reference, fundraiser_id, donor_name').eq('status', 'success'),
  ]);

  const todayRev = todayTxRes.data?.reduce((s, t) => s + t.platform_fee, 0) || 0;
  const yesterdayRev = yesterdayTxRes.data?.reduce((s, t) => s + t.platform_fee, 0) || 0;
  const thisMonthRev = thisMonthTxRes.data?.reduce((s, t) => s + t.platform_fee, 0) || 0;
  const lastMonthRev = lastMonthTxRes.data?.reduce((s, t) => s + t.platform_fee, 0) || 0;

  const thisMonthGross = thisMonthTxRes.data?.reduce((s, t) => s + (t.amount || 0), 0) || 0;
  const lastMonthGross = lastMonthTxRes.data?.reduce((s, t) => s + (t.amount || 0), 0) || 0;

  const todayChange = yesterdayRev > 0 ? Math.round(((todayRev - yesterdayRev) / yesterdayRev) * 100) : (todayRev > 0 ? 100 : 0);
  const monthChange = lastMonthRev > 0 ? Math.round(((thisMonthRev - lastMonthRev) / lastMonthRev) * 100) : (thisMonthRev > 0 ? 100 : 0);
  const grossChange = lastMonthGross > 0 ? Math.round(((thisMonthGross - lastMonthGross) / lastMonthGross) * 100) : (thisMonthGross > 0 ? 100 : 0);

  // Pending payouts: count distinct creators with unsettled balance >= 1000 Naira
  const unsettledByCreator: Record<string, number> = {};
  unsettledRes.data?.forEach((t: any) => {
    unsettledByCreator[t.creator_id] = (unsettledByCreator[t.creator_id] || 0) + 1;
  });
  const pendingPayoutCount = Object.keys(unsettledByCreator).length;

  // Build activity feed
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

  const cardStyle = { background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' };
  const labelStyle = { fontSize: '13px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700 as const, color: '#3f4943', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '8px' };
  const valueStyle = { fontSize: '36px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 800 as const, color: '#004e34', letterSpacing: '-0.02em' };

  return (
    <div>
      <h1 style={{ fontSize: '32px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', marginBottom: '8px', letterSpacing: '-0.02em' }}>Admin Dashboard</h1>
      <p style={{ color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)', marginBottom: '40px', fontSize: '16px' }}>Here&apos;s what&apos;s happening on your platform right now.</p>

      {/* Revenue Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', marginBottom: '24px' }}>
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

      {/* Growth & Health Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        <div style={cardStyle}>
          <div style={labelStyle}>New Users (7d)</div>
          <div style={{ ...valueStyle, fontSize: '32px' }}>{newUsersRes.count?.toLocaleString() || 0}</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>New Subscribers (7d)</div>
          <div style={{ ...valueStyle, fontSize: '32px' }}>{newSubsRes.count?.toLocaleString() || 0}</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Active Subscriptions</div>
          <div style={{ ...valueStyle, fontSize: '32px' }}>{activeSubsRes.count?.toLocaleString() || 0}</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Pending Payouts</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <div style={{ ...valueStyle, fontSize: '32px', color: pendingPayoutCount > 0 ? '#d97706' : '#004e34' }}>{pendingPayoutCount}</div>
            {pendingPayoutCount > 0 && (
              <Link href="/admin/payouts" style={{ fontSize: '13px', fontWeight: 600, color: '#2563eb', textDecoration: 'none', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
                Review →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Activity Feed */}
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
  );
}
