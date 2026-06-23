import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function CreatorPayoutsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, { data: creatorProfile }] = await Promise.all([
    supabase.from('profiles').select('avatar_url, display_name, full_name').eq('id', user.id).single(),
    supabase.from('creator_profiles').select('*').eq('id', user.id).single()
  ]);

  if (!creatorProfile) redirect('/login');

  const { data: transactions } = await supabase
    .from('transactions')
    .select('amount, platform_fee, creator_share, status, created_at')
    .eq('creator_id', user.id)
    .order('created_at', { ascending: false });

  const totalGross = (transactions || []).reduce((sum, tx) => sum + (tx.status === 'success' ? tx.amount : 0), 0);
  const totalFees = (transactions || []).reduce((sum, tx) => sum + (tx.status === 'success' ? tx.platform_fee : 0), 0);
  const totalNet = (transactions || []).reduce((sum, tx) => sum + (tx.status === 'success' ? tx.creator_share : 0), 0);

  const displayName = creatorProfile?.display_name || profile?.display_name || profile?.full_name || 'Creator';
  const avatarUrl = profile?.avatar_url;

  return (
    <div className="v2-dashboard-layout">
      {/* Sidebar */}
      <nav className="v2-sidebar">
        <div className="v2-sidebar-header">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="v2-sidebar-avatar" />
          ) : (
            <div className="v2-sidebar-avatar">{displayName.charAt(0).toUpperCase()}</div>
          )}
          <div>
            <h2 className="v2-sidebar-title">{displayName}</h2>
            <p className="v2-sidebar-subtitle">Verified Account</p>
          </div>
        </div>

        <Link href="/creator/posts" className="v2-sidebar-btn">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
          Post Update
        </Link>

        <div className="v2-nav-list">
          <Link href="/creator" className="v2-nav-item">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>Home
          </Link>
          <Link href="/creator/tiers" className="v2-nav-item">
            <span className="material-symbols-outlined">group</span>Subscriptions
          </Link>
          <Link href="#" className="v2-nav-item">
            <span className="material-symbols-outlined">mail</span>Messages
          </Link>
          <Link href="/creator/payouts" className="v2-nav-item active">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>Earnings
          </Link>
          <Link href="/creator/settings" className="v2-nav-item">
            <span className="material-symbols-outlined">settings</span>Settings
          </Link>
        </div>

        <div className="v2-sidebar-footer">
          <Link href="#" className="v2-nav-item">
            <span className="material-symbols-outlined">help</span>Help
          </Link>
          <form action="/api/auth/signout" method="POST" style={{ display: 'inline' }}>
            <button type="submit" className="v2-nav-item" style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', font: 'inherit', color: 'inherit' }}>
              <span className="material-symbols-outlined">logout</span>Sign Out
            </button>
          </form>
        </div>
      </nav>

      {/* Main Content */}
      <main className="v2-main-content" style={{ maxWidth: '1000px' }}>
        <header style={{ marginBottom: '32px' }}>
          <h1 className="v2-dash-title">Earnings</h1>
          <p className="v2-dash-desc">Track your revenue, platform fees, and payout status.</p>
        </header>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
          <div style={{ background: 'var(--v2-surface-lowest)', border: '1px solid var(--v2-outline)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--v2-text-variant)' }}>account_balance</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gross Volume</span>
            </div>
            <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--v2-primary)', margin: 0 }}>₦{(totalGross / 100).toLocaleString()}</p>
          </div>

          <div style={{ background: 'var(--v2-surface-lowest)', border: '1px solid var(--v2-outline)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--v2-text-variant)' }}>receipt_long</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Platform Fees (10%)</span>
            </div>
            <p style={{ fontSize: '28px', fontWeight: 700, color: '#dc2626', margin: 0 }}>-₦{(totalFees / 100).toLocaleString()}</p>
          </div>

          <div style={{ background: 'var(--v2-surface-lowest)', border: '1px solid var(--v2-outline)', borderRadius: '12px', padding: '20px', borderLeft: '3px solid var(--v2-green)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--v2-green)' }}>savings</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Net Earnings</span>
            </div>
            <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--v2-green)', margin: 0 }}>₦{(totalNet / 100).toLocaleString()}</p>
          </div>
        </div>

        {/* Bank Info Card */}
        <div style={{ background: 'var(--v2-surface-low)', border: '1px solid var(--v2-outline)', borderRadius: '12px', padding: '20px', marginBottom: '32px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>account_balance_wallet</span>
            Payout Destination
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
            <span style={{ color: 'var(--v2-text-variant)' }}>Bank Account</span>
            <strong>{creatorProfile.bank_account_name || 'Not verified'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', marginTop: '8px' }}>
            <span style={{ color: 'var(--v2-text-variant)' }}>Account Number</span>
            <strong style={{ fontFamily: 'monospace' }}>
              {creatorProfile.bank_account_number ? `****${creatorProfile.bank_account_number.slice(-4)}` : 'None'}
            </strong>
          </div>
          {!creatorProfile.is_verified && (
            <div style={{ marginTop: '16px' }}>
              <Link href="/creator/settings" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--v2-primary)', textDecoration: 'none' }}>
                Complete bank setup →
              </Link>
            </div>
          )}
        </div>

        {/* Transaction Table */}
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>Transaction History</h2>
        <div style={{ background: 'var(--v2-surface-lowest)', border: '1px solid var(--v2-outline)', borderRadius: '12px', overflow: 'hidden' }}>
          {(!transactions || transactions.length === 0) ? (
            <div style={{ padding: '64px', textAlign: 'center', color: 'var(--v2-text-variant)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }}>receipt_long</span>
              <p style={{ fontSize: '16px', fontWeight: 500 }}>No transactions yet</p>
              <p style={{ fontSize: '14px', marginTop: '4px' }}>When fans subscribe, their payments will appear here.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: 'var(--v2-surface-low)' }}>
                    <th style={{ padding: '12px 20px', fontWeight: 600, borderBottom: '1px solid var(--v2-outline)', color: 'var(--v2-text-variant)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                    <th style={{ padding: '12px 20px', fontWeight: 600, borderBottom: '1px solid var(--v2-outline)', color: 'var(--v2-text-variant)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Paid</th>
                    <th style={{ padding: '12px 20px', fontWeight: 600, borderBottom: '1px solid var(--v2-outline)', color: 'var(--v2-text-variant)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Aza Fee</th>
                    <th style={{ padding: '12px 20px', fontWeight: 600, borderBottom: '1px solid var(--v2-outline)', color: 'var(--v2-text-variant)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Share</th>
                    <th style={{ padding: '12px 20px', fontWeight: 600, borderBottom: '1px solid var(--v2-outline)', color: 'var(--v2-text-variant)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx: any, i: number) => {
                    const hoursSince = (new Date().getTime() - new Date(tx.created_at).getTime()) / (1000 * 60 * 60);
                    const settleStatus = tx.status === 'success' ? (hoursSince > 24 ? 'Transferred' : 'Processing') : 'Failed';
                    const statusColor = settleStatus === 'Transferred' ? 'var(--v2-green)' : settleStatus === 'Processing' ? '#eab308' : '#dc2626';
                    const statusBg = settleStatus === 'Transferred' ? 'rgba(5,150,105,0.08)' : settleStatus === 'Processing' ? 'rgba(234,179,8,0.08)' : 'rgba(220,38,38,0.08)';

                    return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--v2-outline)' }}>
                        <td style={{ padding: '14px 20px', color: 'var(--v2-text-variant)' }}>{new Date(tx.created_at).toLocaleDateString()}</td>
                        <td style={{ padding: '14px 20px', fontWeight: 500 }}>₦{(tx.amount / 100).toLocaleString()}</td>
                        <td style={{ padding: '14px 20px', color: '#dc2626' }}>-₦{(tx.platform_fee / 100).toLocaleString()}</td>
                        <td style={{ padding: '14px 20px', color: 'var(--v2-green)', fontWeight: 600 }}>₦{(tx.creator_share / 100).toLocaleString()}</td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, background: statusBg, color: statusColor }}>
                            {settleStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Nav (Mobile) */}
      <nav className="v2-bottom-nav">
        <Link href="/creator" className="v2-bottom-nav-item"><span className="material-symbols-outlined v2-bottom-nav-icon" style={{ fontVariationSettings: "'FILL' 1" }}>home</span><span className="v2-bottom-nav-label">Home</span></Link>
        <Link href="/creator/tiers" className="v2-bottom-nav-item"><span className="material-symbols-outlined v2-bottom-nav-icon">group</span><span className="v2-bottom-nav-label">Subs</span></Link>
        <Link href="/creator/posts" className="v2-bottom-fab"><span className="material-symbols-outlined">add</span></Link>
        <Link href="/creator/payouts" className="v2-bottom-nav-item active"><span className="material-symbols-outlined v2-bottom-nav-icon">payments</span><span className="v2-bottom-nav-label">Earnings</span></Link>
        <Link href="/creator/settings" className="v2-bottom-nav-item"><span className="material-symbols-outlined v2-bottom-nav-icon">settings</span><span className="v2-bottom-nav-label">Settings</span></Link>
      </nav>
    </div>
  );
}
