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
        className="az-btn-primary"
        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '14px' }}
      >
        {loading ? <span className="material-symbols-outlined spin" style={{ fontSize: '18px' }}>sync</span> : <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>payments</span>}
        Bulk Approve All ({creators.length})
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', border: '1px solid #E2E8F0' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30' }}>Confirm Bulk Payout</h3>
            <p style={{ margin: '0 0 32px 0', color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '15px' }}>Are you sure you want to approve and initiate Paystack transfers for {creators.length} creators?</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setShowConfirm(false)} className="az-btn-secondary" style={{ padding: '8px 16px', fontSize: '14px' }}>Cancel</button>
              <button onClick={handleBulkApprove} className="az-btn-primary" style={{ padding: '8px 16px', fontSize: '14px' }}>Yes, Approve All</button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Modal */}
      {notification && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', textAlign: 'center', border: '1px solid #E2E8F0' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#059669', marginBottom: '16px' }}>check_circle</span>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30' }}>Notification</h3>
            <p style={{ margin: '0 0 32px 0', color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '15px' }}>{notification}</p>
            <button onClick={() => setNotification(null)} className="az-btn-primary" style={{ width: '100%', padding: '10px', fontSize: '14px' }}>Okay</button>
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
          className="az-btn-secondary"
          style={{ padding: '6px 14px', fontSize: '13px', color: '#059669', borderColor: '#059669', background: '#ecfdf5' }}
        >
          {loading ? 'Processing...' : 'Approve'}
        </button>
        <button 
          onClick={handleRejectClick}
          disabled={loading}
          className="az-btn-secondary"
          style={{ padding: '6px 14px', fontSize: '13px', color: '#ba1a1a', borderColor: '#ba1a1a', background: '#ffdad6' }}
        >
          Reject
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px', textAlign: 'left' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', border: '1px solid #E2E8F0' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30' }}>Confirm Payout</h3>
            <p style={{ margin: '0 0 32px 0', color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '15px' }}>Are you sure you want to approve this payout for <strong>{creator.displayName}</strong>?</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setShowConfirm(false)} className="az-btn-secondary" style={{ padding: '8px 16px', fontSize: '14px' }}>Cancel</button>
              <button onClick={handleApprove} className="az-btn-primary" style={{ padding: '8px 16px', fontSize: '14px' }}>Yes, Approve</button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Modal */}
      {notification && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px', textAlign: 'center' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', border: '1px solid #E2E8F0' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30' }}>Notice</h3>
            <p style={{ margin: '0 0 32px 0', color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '15px' }}>{notification}</p>
            <button onClick={() => setNotification(null)} className="az-btn-primary" style={{ width: '100%', padding: '10px', fontSize: '14px' }}>Okay</button>
          </div>
        </div>
      )}
    </>
  );
}
