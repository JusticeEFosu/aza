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
    supabase.from('transactions').select('creator_share, status, created_at').eq('creator_id', user.id),
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

  // Compute authentic MoM creator earnings growth percentage
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const thisMonthEarnings = (transactions || []).reduce((sum, tx) => {
    if (tx.status !== 'success') return sum;
    const d = new Date(tx.created_at);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear ? sum + tx.creator_share : sum;
  }, 0);

  const lastMonthEarnings = (transactions || []).reduce((sum, tx) => {
    if (tx.status !== 'success') return sum;
    const d = new Date(tx.created_at);
    return d.getMonth() === prevMonth && d.getFullYear() === prevYear ? sum + tx.creator_share : sum;
  }, 0);

  let earningsGrowthPercent = 0;
  let hasGrowthData = true;

  if (lastMonthEarnings > 0) {
    earningsGrowthPercent = Math.round(((thisMonthEarnings - lastMonthEarnings) / lastMonthEarnings) * 100);
  } else if (thisMonthEarnings > 0) {
    earningsGrowthPercent = 100;
  } else {
    hasGrowthData = false;
  }

  // Calculate Next Friday payout date
  const dayOfWeek = now.getDay();
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
  const nextPayoutDate = new Date(now);
  nextPayoutDate.setDate(now.getDate() + daysUntilFriday);
  const nextPayoutStr = nextPayoutDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <main style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Page Header */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '32px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', marginBottom: '8px', letterSpacing: '-0.01em' }}>Earnings & Payouts</h1>
              <p style={{ fontSize: '16px', fontFamily: 'var(--font-body, Inter, sans-serif)', color: '#3f4943' }}>Manage your funds and withdrawal settings.</p>
            </div>
          </div>

          {/* Bento Grid Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
            
            {/* Main Balance Card (md:col-span-8) */}
            <div style={{ gridColumn: 'span 12', background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} className="md-col-8">
              {/* Decorative Glow */}
              <div style={{ position: 'absolute', right: '-40px', top: '-40px', width: '160px', height: '160px', background: 'rgba(0, 78, 52, 0.05)', borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }}></div>
              
              <div style={{ marginBottom: '32px' }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)', marginBottom: '4px' }}>Total Available Balance</p>
                <h2 style={{ fontSize: '48px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#004e34', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  ₦ {(availableBalance / 100).toLocaleString() + (availableBalance % 100 === 0 ? '.00' : '')}
                </h2>
                <p style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: hasGrowthData ? (earningsGrowthPercent >= 0 ? '#059669' : '#dc2626') : '#6f7a72',
                  fontFamily: 'var(--font-body, Inter, sans-serif)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '8px'
                }}>
                  {hasGrowthData ? (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                        {earningsGrowthPercent >= 0 ? 'trending_up' : 'trending_down'}
                      </span>
                      {earningsGrowthPercent >= 0 ? `+${earningsGrowthPercent}%` : `${earningsGrowthPercent}%`} from last month
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>trending_flat</span>
                      No recent growth
                    </>
                  )}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderTop: '1px solid #E2E8F0', paddingTop: '24px', marginTop: 'auto' }}>
                <div className="md-flex-none" style={{ background: '#eff4ff', color: '#0b1c30', padding: '12px 24px', borderRadius: '8px', fontSize: '14px', fontFamily: 'var(--font-body, Inter, sans-serif)', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'not-allowed', flex: 1 }}>
                   Next Payout: {nextPayoutStr}
                </div>
                <Link href="/creator/analytics" className="hidden md-flex" style={{ background: '#ffffff', color: '#004e34', border: '1px solid #004e34', padding: '12px 24px', borderRadius: '8px', fontSize: '14px', fontFamily: 'var(--font-body, Inter, sans-serif)', fontWeight: 600, justifyContent: 'center', alignItems: 'center', cursor: 'pointer', textDecoration: 'none' }}>
                  View Analytics
                </Link>
              </div>
            </div>

            {/* Payout Method Card (md:col-span-4) */}
            <div className="md-col-4" style={{ gridColumn: 'span 12', background: '#ffffff', border: '1px solid #E2E8F0', borderTop: '3px solid #004e34', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <p style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payout Method</p>
                <Link href="/creator/settings" style={{ fontSize: '12px', fontWeight: 600, color: '#004e34', fontFamily: 'var(--font-body, Inter, sans-serif)', textDecoration: 'underline' }}>Edit</Link>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '40px', height: '40px', background: '#eff4ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#004e34' }}>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: '#0b1c30', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>{creatorProfile.bank_account_name || 'Bank Account'}</p>
                  <p style={{ fontSize: '12px', color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
                    {creatorProfile.bank_account_number ? `**** **** ${creatorProfile.bank_account_number.slice(-4)}` : 'Not setup'}
                  </p>
                </div>
              </div>

              <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6f7a72' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>lock</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-body, Inter, sans-serif)' }}>Secured by Paystack</span>
                </div>
              </div>
            </div>

            {/* Recent Payouts List (md:col-span-12) */}
            <div style={{ gridColumn: 'span 12', background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', marginTop: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <div style={{ padding: '24px', borderBottom: '1px solid #E2E8F0', background: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '20px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30' }}>Recent Payouts</h3>
                <button style={{ fontSize: '14px', fontFamily: 'var(--font-body, Inter, sans-serif)', fontWeight: 500, color: '#3f4943', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  View All <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_right</span>
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {(!payouts || payouts.length === 0) ? (
                   <div style={{ padding: '48px 24px', textAlign: 'center', color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
                     No recent payouts.
                   </div>
                ) : (
                  payouts.map((payout: any, i: number) => {
                    const settleStatus = payout.status === 'paid' ? 'COMPLETED' : (payout.status === 'pending' || payout.status === 'calculated' ? 'PROCESSING' : 'FAILED');
                    const statusColor = settleStatus === 'COMPLETED' ? '#059669' : (settleStatus === 'PROCESSING' ? '#735c00' : '#ba1a1a');
                    const statusBg = settleStatus === 'COMPLETED' ? '#ecfdf5' : (settleStatus === 'PROCESSING' ? '#fed65b' : '#ffdad6');

                    return (
                      <div key={payout.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: i === payouts.length - 1 ? 'none' : '1px solid #E2E8F0', cursor: 'default' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#eff4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#004e34' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_outward</span>
                          </div>
                          <div>
                            <p style={{ fontSize: '14px', fontWeight: 600, color: '#0b1c30', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>Withdrawal to Bank</p>
                            <p style={{ fontSize: '12px', color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
                               {new Date(payout.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: '14px', fontWeight: 700, color: '#004e34', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>₦ {(payout.net_amount / 100).toLocaleString() + (payout.net_amount % 100 === 0 ? '.00' : '')}</p>
                          <span style={{ display: 'inline-block', marginTop: '4px', padding: '4px 8px', background: statusBg, color: statusColor, borderRadius: '9999px', fontSize: '10px', fontWeight: 600, fontFamily: 'var(--font-body, Inter, sans-serif)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
