import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { BulkApproveButton, IndividualPayoutActions } from '@/components/PayoutActions';
import { AuditReceiptButton } from '@/components/AuditReceipt';
import Link from 'next/link';

export default async function AdminPayoutsPage() {
  const supabase = createAdminClient();

  // 1. Fetch all unsettled successful transactions
  const { data: unsettledTransactions } = await supabase
    .from('transactions')
    .select(`
      id,
      creator_id,
      creator_share,
      status,
      settled
    `)
    .eq('status', 'success')
    .eq('settled', false);

  // 2. Fetch all creator profiles (whether they have a bank account or not)
  const { data: creatorProfiles } = await supabase
    .from('creator_profiles')
    .select(`
      id,
      slug,
      bank_account_name,
      bank_account_number,
      bank_code,
      profiles!creator_profiles_id_fkey ( full_name, display_name, email )
    `);

  // Calculate pending payouts based strictly on unsettled transactions
  const pendingPayouts = [];
  
  if (creatorProfiles && unsettledTransactions) {
    for (const cProfile of creatorProfiles) {
      const creatorId = cProfile.id;
      const profile = Array.isArray(cProfile.profiles) ? cProfile.profiles[0] : cProfile.profiles;
      
      const creatorTransactions = unsettledTransactions.filter(t => t.creator_id === creatorId);
      
      const unpaidBalance = creatorTransactions.reduce((sum, t) => sum + (t.creator_share || 0), 0);
      
      // Minimum threshold: 1000 Naira (100000 kobo)
      if (unpaidBalance >= 100000) {
        pendingPayouts.push({
          creator_id: creatorId,
          amount: unpaidBalance,
          transaction_count: creatorTransactions.length,
          displayName: cProfile.slug || profile?.display_name || profile?.full_name || 'Creator',
          email: profile?.email,
          bank_account_name: cProfile.bank_account_name,
          bank_account_number: cProfile.bank_account_number,
          bank_code: cProfile.bank_code
        });
      }
    }
  }

  // Fetch recent historical payouts for the ledger
  const { data: historicalPayoutsRaw } = await supabase
    .from('payouts')
    .select(`
      id,
      net_amount,
      status,
      created_at,
      creator_id,
      profiles!payouts_creator_id_fkey ( full_name, display_name, email ),
      creator_profiles ( slug, bank_account_name, bank_account_number, bank_code )
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  const historicalPayouts = historicalPayoutsRaw || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', marginBottom: '8px', letterSpacing: '-0.02em' }}>Payout Approvals</h1>
          <p style={{ color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '16px' }}>Review and approve creator withdrawals via Paystack.</p>
        </div>
        <BulkApproveButton creators={pendingPayouts.filter(p => p.bank_account_number)} />
      </div>

      {/* Pending Queue */}
      <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px', overflow: 'hidden', marginBottom: '40px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #E2E8F0', background: '#f8f9ff' }}>
          <h2 style={{ fontSize: '20px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', margin: 0 }}>Live Pending Queue ({pendingPayouts.length})</h2>
          <p style={{ fontSize: '14px', fontFamily: 'var(--font-body, Inter, sans-serif)', color: '#3f4943', marginTop: '4px', margin: 0 }}>Creators with unsettled transactions totaling ≥ ₦1,000</p>
        </div>
        
        {pendingPayouts.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
            No pending payouts at this time.
          </div>
        ) : (
          <div className="v2-table-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ minWidth: '800px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 2fr 1fr 1.5fr', padding: '16px 24px', background: '#f8f9ff', borderBottom: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Creator</span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Owed Amount</span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bank Details</span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Transactions</span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</span>
              </div>

              {pendingPayouts.map(creator => {
                const hasBank = !!creator.bank_account_number;
                
                return (
                  <div key={creator.creator_id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 2fr 1fr 1.5fr', padding: '16px 24px', borderBottom: '1px solid #E2E8F0', alignItems: 'center' }}>
                    
                    {/* Creator Info */}
                    <div>
                      <div style={{ fontWeight: 600, color: '#0b1c30', fontSize: '14px', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>{creator.displayName}</div>
                      <div style={{ fontSize: '12px', color: '#6f7a72', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>{creator.email}</div>
                    </div>

                    {/* Amount */}
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#059669', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
                      ₦ {(creator.amount / 100).toLocaleString()}
                    </div>

                    {/* Bank Details */}
                    <div>
                      {hasBank ? (
                        <>
                          <div style={{ fontWeight: 600, color: '#0b1c30', fontSize: '14px', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>{creator.bank_account_name}</div>
                          <div style={{ fontSize: '12px', color: '#6f7a72', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>{creator.bank_account_number} (Code: {creator.bank_code})</div>
                        </>
                      ) : (
                        <span style={{ color: '#ba1a1a', fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-body, Inter, sans-serif)' }}>Missing Bank Setup</span>
                      )}
                    </div>

                    {/* Transaction Count */}
                    <div style={{ fontSize: '14px', color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
                      {creator.transaction_count} pending
                    </div>

                    {/* Actions */}
                    <div>
                      {hasBank ? (
                        <IndividualPayoutActions creator={creator} />
                      ) : (
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '12px', color: '#6f7a72', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>Cannot approve</span>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Historical Payouts */}
      <h3 style={{ fontSize: '20px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', marginBottom: '16px' }}>Payout Ledger</h3>
      <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
         <div className="v2-table-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ minWidth: '800px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 2fr 1fr 1.5fr', padding: '16px 24px', background: '#f8f9ff', borderBottom: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Creator</span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount</span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bank Details</span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Status</span>
              </div>

              {historicalPayouts.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>No historical payouts.</div>
              ) : historicalPayouts.map(payout => {
                const profile = Array.isArray(payout.profiles) ? payout.profiles[0] : payout.profiles;
                const cProfile = Array.isArray(payout.creator_profiles) ? payout.creator_profiles[0] : payout.creator_profiles;
                const displayName = cProfile?.slug || profile?.display_name || profile?.full_name || 'Creator';
                
                const statusColor = payout.status === 'paid' ? '#059669' : (payout.status === 'processing' ? '#735c00' : '#ba1a1a');
                const statusBg = payout.status === 'paid' ? '#ecfdf5' : (payout.status === 'processing' ? '#fed65b' : '#ffdad6');

                return (
                  <div key={payout.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 2fr 1fr 1.5fr', padding: '16px 24px', borderBottom: '1px solid #E2E8F0', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#0b1c30', fontSize: '14px', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>{displayName}</div>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#004e34', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
                      ₦ {((payout.net_amount || 0) / 100).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '14px', color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
                      {cProfile?.bank_account_name || 'N/A'}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6f7a72', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
                      {new Date(payout.created_at).toLocaleDateString()}
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                       <span style={{ display: 'inline-block', padding: '4px 10px', background: statusBg, color: statusColor, borderRadius: '9999px', fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-body, Inter, sans-serif)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {payout.status}
                       </span>
                       <AuditReceiptButton payoutId={payout.id} payoutAmount={payout.net_amount || 0} />
                    </div>
                  </div>
                );
              })}
            </div>
         </div>
      </div>
    </div>
  );
}
