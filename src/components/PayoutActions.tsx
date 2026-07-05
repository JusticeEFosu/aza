'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function BulkApproveButton({ creators }: { creators: any[] }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleBulkApprove() {
    if (!confirm(`Are you sure you want to approve ${creators.length} payouts?`)) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/payouts/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creators }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(data.message || 'Bulk transfer initiated');
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (creators.length === 0) return null;

  return (
    <button 
      onClick={handleBulkApprove}
      disabled={loading}
      className="v2-btn v2-btn-primary"
      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
    >
      {loading ? <span className="material-symbols-outlined spin">sync</span> : <span className="material-symbols-outlined">payments</span>}
      Bulk Approve All ({creators.length})
    </button>
  );
}

export function IndividualPayoutActions({ creator }: { creator: any }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleAction(action: 'approve' | 'reject') {
    if (action === 'reject') {
      alert('Dynamic payouts cannot be rejected directly because they are calculated from valid successful subscriptions. If there is suspected fraud, you should suspend the creator from the Users tab.');
      return;
    }
    
    if (!confirm(`Are you sure you want to approve this payout?`)) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/payouts/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creators: [creator] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
      <button 
        onClick={() => handleAction('approve')}
        disabled={loading}
        className="v2-btn v2-btn-secondary"
        style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--v2-green)', borderColor: 'var(--v2-green)' }}
      >
        Approve
      </button>
      <button 
        onClick={() => handleAction('reject')}
        disabled={loading}
        className="v2-btn v2-btn-secondary"
        style={{ padding: '6px 12px', fontSize: '12px', color: '#dc2626', borderColor: '#dc2626' }}
      >
        Reject
      </button>
    </div>
  );
}
