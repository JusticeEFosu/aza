'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmModal from '@/components/ConfirmModal';

export default function SuspendFundraiserButton({ fundraiserId, isSuspended }: { fundraiserId: string, isSuspended: boolean }) {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  const handleToggleSuspend = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/fundraisers/${fundraiserId}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspend: !isSuspended })
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update fundraiser status');
      }
      
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
      setShowModal(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setShowModal(true)}
        disabled={loading}
        style={{
          background: isSuspended ? '#f3f4f6' : '#fef2f2',
          border: isSuspended ? '1px solid #E2E8F0' : '1px solid #fecaca',
          color: isSuspended ? '#3f4943' : '#dc2626',
          padding: '6px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1
        }}
      >
        {loading ? 'Processing...' : isSuspended ? 'Reactivate' : 'Suspend'}
      </button>

      <ConfirmModal 
        isOpen={showModal}
        title={isSuspended ? "Reactivate Fundraiser" : "Suspend Fundraiser"}
        message={isSuspended 
          ? "Are you sure you want to reactivate this fundraiser? It will become visible on the platform again." 
          : "Are you sure you want to suspend this fundraiser? It will be hidden from the platform immediately."}
        confirmText={isSuspended ? "Reactivate" : "Suspend"}
        isDestructive={!isSuspended}
        onConfirm={handleToggleSuspend}
        onCancel={() => setShowModal(false)}
      />
    </>
  );
}
