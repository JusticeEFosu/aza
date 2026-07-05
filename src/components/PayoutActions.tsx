'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function BulkApproveButton({ creators }: { creators: any[] }) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const router = useRouter();

  async function handleBulkApprove() {
    setLoading(true);
    setShowConfirm(false);
    try {
      const res = await fetch('/api/admin/payouts/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creators }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setNotification(data.message || 'Bulk transfer initiated successfully.');
      router.refresh();
    } catch (err: any) {
      setNotification(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (creators.length === 0) return null;

  return (
    <>
      <button 
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        className="v2-btn v2-btn-primary"
        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        {loading ? <span className="material-symbols-outlined spin">sync</span> : <span className="material-symbols-outlined">payments</span>}
        Bulk Approve All ({creators.length})
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
          <div style={{ background: 'var(--v2-surface)', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 600, color: 'var(--v2-primary)' }}>Confirm Bulk Payout</h3>
            <p style={{ margin: '0 0 32px 0', color: 'var(--v2-text-variant)' }}>Are you sure you want to approve and initiate Paystack transfers for {creators.length} creators?</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setShowConfirm(false)} className="v2-btn v2-btn-secondary">Cancel</button>
              <button onClick={handleBulkApprove} className="v2-btn v2-btn-primary">Yes, Approve All</button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Modal */}
      {notification && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
          <div style={{ background: 'var(--v2-surface)', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--v2-green)', marginBottom: '16px' }}>check_circle</span>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 600, color: 'var(--v2-primary)' }}>Notification</h3>
            <p style={{ margin: '0 0 32px 0', color: 'var(--v2-text-variant)' }}>{notification}</p>
            <button onClick={() => setNotification(null)} className="v2-btn v2-btn-primary" style={{ width: '100%' }}>Okay</button>
          </div>
        </div>
      )}
    </>
  );
}

export function IndividualPayoutActions({ creator }: { creator: any }) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const router = useRouter();

  async function handleApprove() {
    setLoading(true);
    setShowConfirm(false);
    try {
      const res = await fetch('/api/admin/payouts/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creators: [creator] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setNotification('Transfer initiated successfully.');
      router.refresh();
    } catch (err: any) {
      setNotification(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleRejectClick() {
    setNotification('Dynamic payouts cannot be rejected directly because they are calculated from valid successful subscriptions. If there is suspected fraud, you should suspend the creator from the Users tab.');
  }

  return (
    <>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button 
          onClick={() => setShowConfirm(true)}
          disabled={loading}
          className="v2-btn v2-btn-secondary"
          style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--v2-green)', borderColor: 'var(--v2-green)' }}
        >
          {loading ? 'Processing...' : 'Approve'}
        </button>
        <button 
          onClick={handleRejectClick}
          disabled={loading}
          className="v2-btn v2-btn-secondary"
          style={{ padding: '6px 12px', fontSize: '12px', color: '#dc2626', borderColor: '#dc2626' }}
        >
          Reject
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px', textAlign: 'left' }}>
          <div style={{ background: 'var(--v2-surface)', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 600, color: 'var(--v2-primary)' }}>Confirm Payout</h3>
            <p style={{ margin: '0 0 32px 0', color: 'var(--v2-text-variant)' }}>Are you sure you want to approve this payout for <strong>{creator.displayName}</strong>?</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setShowConfirm(false)} className="v2-btn v2-btn-secondary">Cancel</button>
              <button onClick={handleApprove} className="v2-btn v2-btn-primary">Yes, Approve</button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Modal */}
      {notification && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px', textAlign: 'center' }}>
          <div style={{ background: 'var(--v2-surface)', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: 600, color: 'var(--v2-primary)' }}>Notice</h3>
            <p style={{ margin: '0 0 32px 0', color: 'var(--v2-text-variant)' }}>{notification}</p>
            <button onClick={() => setNotification(null)} className="v2-btn v2-btn-primary" style={{ width: '100%' }}>Okay</button>
          </div>
        </div>
      )}
    </>
  );
}
