'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SuspendUserButton({ 
  userId, 
  isSuspended 
}: { 
  userId: string;
  isSuspended: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function toggleSuspension() {
    if (!confirm(`Are you sure you want to ${isSuspended ? 'unsuspend' : 'suspend'} this user?`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/users/suspend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, suspend: !isSuspended }),
      });

      if (!res.ok) {
        throw new Error('Failed to update suspension status');
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      alert('Error updating user status');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button 
      onClick={toggleSuspension}
      disabled={loading}
      style={{ 
        background: isSuspended ? 'transparent' : 'var(--v2-surface-low)', 
        border: '1px solid var(--v2-outline)', 
        borderRadius: '8px', 
        padding: '6px 12px', 
        cursor: loading ? 'wait' : 'pointer', 
        color: isSuspended ? 'var(--v2-primary)' : '#ba1a1a',
        fontSize: '12px',
        fontWeight: 600,
        opacity: loading ? 0.7 : 1
      }}
    >
      {loading ? '...' : isSuspended ? 'Restore' : 'Suspend'}
    </button>
  );
}
