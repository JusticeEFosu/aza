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
          <h1 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--v2-primary)', marginBottom: '8px', letterSpacing: '-0.02em' }}>Payout Approvals</h1>
          <p style={{ color: 'var(--v2-text-variant)', fontSize: '16px' }}>Review and approve creator withdrawals via Paystack.</p>
        </div>
        <BulkApproveButton creators={pendingPayouts.filter(p => p.bank_account_number)} />
      </div>

      {/* Pending Queue */}
      <div style={{ background: 'var(--v2-surface)', border: '1px solid var(--v2-outline)', borderRadius: '16px', overflow: 'hidden', marginBottom: '40px' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid var(--v2-outline)', background: 'var(--v2-surface-lowest)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--v2-primary)' }}>Live Pending Queue ({pendingPayouts.length})</h2>
          <p style={{ fontSize: '14px', color: 'var(--v2-text-variant)' }}>Creators with unsettled transactions totaling ≥ ₦1,000</p>
        </div>
        
        {pendingPayouts.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--v2-text-variant)' }}>
            No pending payouts at this time.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: '800px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 2fr 1fr 1.5fr', padding: '16px 24px', background: 'var(--v2-surface-low)', borderBottom: '1px solid var(--v2-outline)' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Creator</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Owed Amount</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bank Details</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Transactions</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</span>
              </div>

              {pendingPayouts.map(creator => {
                const hasBank = !!creator.bank_account_number;
                
                return (
                  <div key={creator.creator_id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 2fr 1fr 1.5fr', padding: '16px 24px', borderBottom: '1px solid var(--v2-outline)', alignItems: 'center' }}>
                    
                    {/* Creator Info */}
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--v2-primary)', fontSize: '14px' }}>{creator.displayName}</div>
                      <div style={{ fontSize: '12px', color: 'var(--v2-text-variant)' }}>{creator.email}</div>
                    </div>

                    {/* Amount */}
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--v2-green)' }}>
                      ₦ {(creator.amount / 100).toLocaleString()}
                    </div>

                    {/* Bank Details */}
                    <div>
                      {hasBank ? (
                        <>
                          <div style={{ fontWeight: 600, color: 'var(--v2-primary)', fontSize: '14px' }}>{creator.bank_account_name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--v2-text-variant)' }}>{creator.bank_account_number} (Code: {creator.bank_code})</div>
                        </>
                      ) : (
                        <span style={{ color: '#dc2626', fontSize: '12px', fontWeight: 600 }}>Missing Bank Setup</span>
                      )}
                    </div>

                    {/* Transaction Count */}
                    <div style={{ fontSize: '14px', color: 'var(--v2-text-variant)' }}>
                      {creator.transaction_count} pending
                    </div>

                    {/* Actions */}
                    <div>
                      {hasBank ? (
                        <IndividualPayoutActions creator={creator} />
                      ) : (
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '12px', color: 'var(--v2-text-variant)' }}>Cannot approve</span>
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
      <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--v2-primary)', marginBottom: '16px' }}>Payout Ledger</h3>
      <div style={{ background: 'var(--v2-surface)', border: '1px solid var(--v2-outline)', borderRadius: '16px', overflow: 'hidden' }}>
         <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: '800px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 2fr 1fr 1.5fr', padding: '16px 24px', background: 'var(--v2-surface-low)', borderBottom: '1px solid var(--v2-outline)' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Creator</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bank Details</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Status</span>
              </div>

              {historicalPayouts.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--v2-text-variant)' }}>No historical payouts.</div>
              ) : historicalPayouts.map(payout => {
                const profile = Array.isArray(payout.profiles) ? payout.profiles[0] : payout.profiles;
                const cProfile = Array.isArray(payout.creator_profiles) ? payout.creator_profiles[0] : payout.creator_profiles;
                const displayName = cProfile?.slug || profile?.display_name || profile?.full_name || 'Creator';
                
                const statusColor = payout.status === 'paid' ? 'var(--v2-green)' : (payout.status === 'processing' ? '#eab308' : '#dc2626');
                const statusBg = payout.status === 'paid' ? 'rgba(5, 150, 105, 0.1)' : (payout.status === 'processing' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(220, 38, 38, 0.1)');

                return (
                  <div key={payout.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 2fr 1fr 1.5fr', padding: '16px 24px', borderBottom: '1px solid var(--v2-outline)', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--v2-primary)', fontSize: '14px' }}>{displayName}</div>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--v2-primary)' }}>
                      ₦ {((payout.net_amount || 0) / 100).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--v2-text-variant)' }}>
                      {cProfile?.bank_account_name || 'N/A'}
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--v2-text-variant)' }}>
                      {new Date(payout.created_at).toLocaleDateString()}
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                       <span style={{ display: 'inline-block', padding: '4px 8px', background: statusBg, color: statusColor, borderRadius: '9999px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
