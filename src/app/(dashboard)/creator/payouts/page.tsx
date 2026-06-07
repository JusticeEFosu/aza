import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function CreatorPayoutsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: creatorProfile } = await supabase
    .from('creator_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!creatorProfile) redirect('/login');

  // Fetch all transactions to calculate volumes
  const { data: transactions } = await supabase
    .from('transactions')
    .select('amount, platform_fee, creator_share, status, created_at')
    .eq('creator_id', user.id)
    .order('created_at', { ascending: false });

  // Calculate totals
  const totalGross = (transactions || []).reduce((sum, tx) => sum + (tx.status === 'success' ? tx.amount : 0), 0);
  const totalFees = (transactions || []).reduce((sum, tx) => sum + (tx.status === 'success' ? tx.platform_fee : 0), 0);
  const totalNet = (transactions || []).reduce((sum, tx) => sum + (tx.status === 'success' ? tx.creator_share : 0), 0);

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem', maxWidth: '800px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/creator" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          ← Back to Dashboard
        </Link>
        <h1>Payouts & Earnings</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Track your revenue and platform fees. Paystack automatically transfers your Available Balance to your bank account ({creatorProfile.bank_account_name || 'Verification Pending'}) typically by the next business day.
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
        <div className="glass-card" style={{ textAlign: 'center', background: 'var(--bg-secondary)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Gross Volume</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 600 }}>
            ₦{(totalGross / 100).toLocaleString()}
          </p>
        </div>
        <div className="glass-card" style={{ textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Platform Fees (10%)</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--danger)' }}>
            -₦{(totalFees / 100).toLocaleString()}
          </p>
        </div>
        <div className="glass-card" style={{ textAlign: 'center', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Net Earnings</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>
            ₦{(totalNet / 100).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Settle Status</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          Transactions made by fans are processed by Paystack and routed via your unique Subaccount. 
          Aza takes a 10% platform fee instantly. The remaining 90% is held by Paystack and processed for settlement to your connected Nigerian bank account.
        </p>
        <div style={{ padding: '1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Bank Account Name</span>
            <strong style={{ fontFamily: 'monospace' }}>{creatorProfile.bank_account_name || 'Not Verifed'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Account Number</span>
            <strong style={{ fontFamily: 'monospace' }}>
              {creatorProfile.bank_account_number ? `****${creatorProfile.bank_account_number.slice(-4)}` : 'None'}
            </strong>
          </div>
          {!creatorProfile.is_verified && (
            <div style={{ marginTop: '1rem' }}>
              <Link href="/creator/settings" className="btn btn-primary btn-sm">Complete Bank Setup</Link>
            </div>
          )}
        </div>
      </div>

      <h2>Detailed Revenue Ledger</h2>
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden', marginTop: '1.5rem' }}>
        {(!transactions || transactions.length === 0) ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
             <p style={{ color: 'var(--text-muted)' }}>No transactions yet.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.938rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 500, borderBottom: '1px solid var(--border-color)' }}>Date</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 500, borderBottom: '1px solid var(--border-color)' }}>Total Paid</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 500, borderBottom: '1px solid var(--border-color)' }}>Aza Fee (10%)</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 500, borderBottom: '1px solid var(--border-color)' }}>Your Share</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 500, borderBottom: '1px solid var(--border-color)' }}>Settle Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx: any, i: number) => {
                  // If it's been mostly 24 hours, assume Paystack settled it (rough display heuristic for test mode)
                  const hoursSince = (new Date().getTime() - new Date(tx.created_at).getTime()) / (1000 * 60 * 60);
                  const settleStatus = tx.status === 'success' 
                    ? (hoursSince > 24 ? 'Transferred' : 'Processing') 
                    : 'Failed';

                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>
                        {new Date(tx.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        ₦{(tx.amount / 100).toLocaleString()}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', color: 'var(--danger)' }}>
                        -₦{(tx.platform_fee / 100).toLocaleString()}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', color: 'var(--success)', fontWeight: 600 }}>
                        ₦{(tx.creator_share / 100).toLocaleString()}
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span style={{ 
                          padding: '0.25rem 0.5rem', 
                          borderRadius: '1rem', 
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: settleStatus === 'Transferred' ? 'rgba(34, 197, 94, 0.1)' : 
                                      settleStatus === 'Processing' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: settleStatus === 'Transferred' ? 'var(--success)' : 
                                 settleStatus === 'Processing' ? '#eab308' : 'var(--danger)'
                        }}>
                          {settleStatus}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
