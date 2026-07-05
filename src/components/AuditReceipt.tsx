'use client';

import { useState } from 'react';

export function AuditReceiptButton({ payoutId, payoutAmount }: { payoutId: string, payoutAmount: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);

  const fetchAudit = async () => {
    setIsOpen(true);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/payouts/${payoutId}/audit`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={fetchAudit}
        style={{
          background: 'transparent',
          border: '1px solid var(--v2-outline)',
          color: 'var(--v2-text-variant)',
          padding: '4px 12px',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          marginLeft: '12px'
        }}
      >
        View Audit
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '24px'
        }}>
          <div style={{
            background: 'var(--v2-surface)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--v2-outline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--v2-primary)', margin: 0 }}>Payout Audit Receipt</h3>
                <p style={{ fontSize: '12px', color: 'var(--v2-text-variant)', margin: 0 }}>ID: {payoutId}</p>
              </div>
              <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', fontSize: '24px', color: 'var(--v2-text-variant)', cursor: 'pointer' }}>&times;</button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--v2-text-variant)' }}>Loading ledger records...</div>
              ) : transactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--v2-text-variant)' }}>No transactions found for this payout.</div>
              ) : (
                <>
                  <div style={{ marginBottom: '24px', padding: '16px', background: 'var(--v2-surface-low)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: 'var(--v2-text-variant)', fontSize: '14px' }}>Total Transactions:</span>
                      <span style={{ fontWeight: 600, color: 'var(--v2-primary)', fontSize: '14px' }}>{transactions.length}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--v2-text-variant)', fontSize: '14px' }}>Total Payout Amount:</span>
                      <span style={{ fontWeight: 600, color: 'var(--v2-green)', fontSize: '14px' }}>₦ {(payoutAmount / 100).toLocaleString()}</span>
                    </div>
                  </div>

                  <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--v2-primary)', marginBottom: '12px' }}>Itemized Transactions</h4>
                  <div style={{ border: '1px solid var(--v2-outline)', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', padding: '12px 16px', background: 'var(--v2-surface-lowest)', borderBottom: '1px solid var(--v2-outline)' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--v2-text-variant)', textTransform: 'uppercase' }}>Date</span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--v2-text-variant)', textTransform: 'uppercase' }}>Fan</span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--v2-text-variant)', textTransform: 'uppercase', textAlign: 'right' }}>Creator Share</span>
                    </div>
                    {transactions.map(t => (
                      <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', padding: '12px 16px', borderBottom: '1px solid var(--v2-outline)' }}>
                        <span style={{ fontSize: '13px', color: 'var(--v2-text-variant)' }}>{new Date(t.created_at).toLocaleDateString()}</span>
                        <span style={{ fontSize: '13px', color: 'var(--v2-primary)' }}>{t.profiles?.full_name || t.profiles?.display_name || 'Fan'}</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--v2-green)', textAlign: 'right' }}>₦ {((t.creator_share || 0) / 100).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--v2-outline)', background: 'var(--v2-surface-low)', textAlign: 'right' }}>
              <button 
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'var(--v2-primary)',
                  color: 'var(--v2-surface)',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
