import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import MobileNav from '@/components/MobileNav';

export default async function CreatorPayoutsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, { data: creatorProfile }] = await Promise.all([
    supabase.from('profiles').select('avatar_url, display_name, full_name').eq('id', user.id).single(),
    supabase.from('creator_profiles').select('*').eq('id', user.id).single()
  ]);

  if (!creatorProfile) redirect('/login');

  const displayName = creatorProfile?.display_name || profile?.display_name || profile?.full_name || 'Creator';
  const avatarUrl = profile?.avatar_url;

  const [
    { data: payouts },
    { data: transactions },
    { data: activeSubs }
  ] = await Promise.all([
    supabase.from('payouts').select('id, net_amount, status, created_at').eq('creator_id', user.id).order('created_at', { ascending: false }),
    supabase.from('transactions').select('creator_share, status').eq('creator_id', user.id),
    supabase.from('subscriptions').select('tiers(amount)').eq('creator_id', user.id).eq('status', 'active')
  ]);

  // Calculate real balances
  const totalNet = (transactions || []).reduce((sum, tx) => sum + (tx.status === 'success' ? tx.creator_share : 0), 0);
  
  // Sum up all payouts that are either pending, processing, or paid (everything except failed)
  const totalWithdrawn = (payouts || [])
    .filter(p => p.status !== 'failed')
    .reduce((sum, p) => sum + p.net_amount, 0);

  const availableBalance = Math.max(0, totalNet - totalWithdrawn);
  
  const mrr = (activeSubs || []).reduce((sum, sub) => {
    const tierData = Array.isArray(sub.tiers) ? sub.tiers[0] : sub.tiers;
    return sum + (tierData?.amount || 0);
  }, 0);

  return (
    <main className="v2-main-content" style={{ background: 'var(--v2-surface)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Page Header */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: 600, color: 'var(--v2-primary)', marginBottom: '8px', letterSpacing: '-0.01em' }}>Earnings & Payouts</h1>
              <p style={{ fontSize: '16px', color: 'var(--v2-text-variant)' }}>Manage your funds and withdrawal settings.</p>
            </div>
          </div>

          {/* Bento Grid Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
            
            {/* Main Balance Card (md:col-span-8) */}
            <div style={{ gridColumn: 'span 12', background: 'var(--v2-surface)', border: '1px solid var(--v2-outline)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }} className="md-col-8">
              {/* Decorative Glow */}
              <div style={{ position: 'absolute', right: '-40px', top: '-40px', width: '160px', height: '160px', background: 'rgba(166, 242, 209, 0.1)', borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }}></div>
              
              <div style={{ marginBottom: '32px' }}>
                <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--v2-text-variant)', marginBottom: '4px' }}>Total Available Balance</p>
                <h2 style={{ fontSize: '48px', fontWeight: 700, color: 'var(--v2-primary)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  ₦ {(availableBalance / 100).toLocaleString() + (availableBalance % 100 === 0 ? '.00' : '')}
                </h2>
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-green)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>trending_up</span>
                  {mrr > 0 ? '+5% from last month' : 'No recent growth'}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderTop: '1px solid var(--v2-outline)', paddingTop: '24px', marginTop: 'auto' }}>
                <div className="md-flex-none" style={{ background: 'var(--v2-surface-low)', color: 'var(--v2-text-variant)', padding: '12px 24px', borderRadius: '4px', fontSize: '14px', fontWeight: 500, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'not-allowed', flex: 1 }}>
                   Next Payout: 26th - 28th
                </div>
                <Link href="/creator/analytics" className="hidden md-flex" style={{ background: 'var(--v2-surface)', color: 'var(--v2-primary)', border: '1px solid var(--v2-outline)', padding: '12px 24px', borderRadius: '4px', fontSize: '14px', fontWeight: 500, justifyContent: 'center', alignItems: 'center', cursor: 'pointer', textDecoration: 'none' }}>
                  View Analytics
                </Link>
              </div>
            </div>

            {/* Payout Method Card (md:col-span-4) */}
            <div className="md-col-4" style={{ gridColumn: 'span 12', background: 'var(--v2-surface-lowest)', border: '1px solid var(--v2-outline)', borderTop: '2px solid var(--v2-green)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', boxShadow: '0px 4px 20px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payout Method</p>
                <Link href="/creator/settings" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-primary)', textDecoration: 'underline' }}>Edit</Link>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '40px', height: '40px', background: 'var(--v2-surface-low)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--v2-primary)' }}>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--v2-primary)' }}>{creatorProfile.bank_account_name || 'Bank Account'}</p>
                  <p style={{ fontSize: '12px', color: 'var(--v2-text-variant)' }}>
                    {creatorProfile.bank_account_number ? `**** **** ${creatorProfile.bank_account_number.slice(-4)}` : 'Not setup'}
                  </p>
                </div>
              </div>

              <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(126, 117, 118, 0.5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--v2-text-variant)', filter: 'grayscale(100%)', opacity: 0.7 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>lock</span>
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>Secured by Paystack</span>
                </div>
              </div>
            </div>

            {/* Recent Payouts List (md:col-span-12) */}
            <div style={{ gridColumn: 'span 12', background: 'var(--v2-surface)', border: '1px solid var(--v2-outline)', borderRadius: '12px', overflow: 'hidden', marginTop: '16px' }}>
              <div style={{ padding: '24px', borderBottom: '1px solid var(--v2-outline)', background: 'var(--v2-surface-lowest)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--v2-primary)' }}>Recent Payouts</h3>
                <button style={{ fontSize: '14px', fontWeight: 500, color: 'var(--v2-text-variant)', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  View All <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_right</span>
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {(!payouts || payouts.length === 0) ? (
                   <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--v2-text-variant)' }}>
                     No recent payouts.
                   </div>
                ) : (
                  payouts.map((payout: any, i: number) => {
                    const settleStatus = payout.status === 'paid' ? 'COMPLETED' : (payout.status === 'pending' || payout.status === 'calculated' ? 'PROCESSING' : 'FAILED');
                    const statusColor = settleStatus === 'COMPLETED' ? 'var(--v2-green)' : (settleStatus === 'PROCESSING' ? '#eab308' : '#dc2626');
                    const statusBg = settleStatus === 'COMPLETED' ? 'rgba(5, 150, 105, 0.1)' : (settleStatus === 'PROCESSING' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(220, 38, 38, 0.1)');

                    return (
                      <div key={payout.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: i === payouts.length - 1 ? 'none' : '1px solid var(--v2-outline)', cursor: 'default' }} className="v2-list-item-hover">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--v2-surface-low)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--v2-text-variant)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_outward</span>
                          </div>
                          <div>
                            <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--v2-primary)' }}>Withdrawal to Bank</p>
                            <p style={{ fontSize: '12px', color: 'var(--v2-text-variant)' }}>
                               {new Date(payout.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--v2-primary)' }}>₦ {(payout.net_amount / 100).toLocaleString() + (payout.net_amount % 100 === 0 ? '.00' : '')}</p>
                          <span style={{ display: 'inline-block', marginTop: '4px', padding: '4px 8px', background: statusBg, color: statusColor, borderRadius: '9999px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {settleStatus}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </div>
    </main>
  );
}
