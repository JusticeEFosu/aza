'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SubscriptionCardActions({ slug, subscriptionId }: { slug: string, subscriptionId: string }) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const handleCancel = async () => {
    setCanceling(true);
    try {
      const res = await fetch('/api/subscriptions/cancel', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ subscriptionId })
      });
      if (res.ok) {
         setShowModal(false);
         router.refresh();
      } else {
         alert('Failed to cancel subscription.');
         setCanceling(false);
      }
    } catch (err) {
      console.error(err);
      setCanceling(false);
    }
  };

  return (
    <>
      <div className="v2-sub-actions">
        <Link 
          href={`/c/${slug}`}
          className="v2-sub-btn v2-sub-btn-primary" 
        >
          Manage
        </Link>
        <button 
          onClick={() => setShowModal(true)}
          className="v2-sub-btn v2-sub-btn-secondary"
        >
          Cancel
        </button>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'var(--v2-surface-lowest)', borderRadius: '16px', width: '100%', maxWidth: '400px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 16px 0', color: 'var(--v2-primary)' }}>Cancel Subscription</h3>
            <p style={{ fontSize: '15px', color: 'var(--v2-text-variant)', marginBottom: '24px', lineHeight: 1.5 }}>
              Are you sure you want to cancel? You will lose access to this creator's exclusive content immediately.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowModal(false)}
                style={{ padding: '10px 20px', background: 'transparent', color: 'var(--v2-text-variant)', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
              >
                Keep it
              </button>
              <button 
                onClick={handleCancel}
                disabled={canceling}
                style={{ padding: '10px 24px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: 'pointer', opacity: canceling ? 0.5 : 1 }}
              >
                {canceling ? 'Canceling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
