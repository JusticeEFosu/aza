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
      <div style={{ marginTop: '12px' }}>
        <button 
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowModal(true); }}
          className="az-btn-secondary"
          style={{ width: '100%', padding: '8px 16px', fontSize: '13px' }}
        >
          Cancel Subscription
        </button>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div className="az-card" style={{ background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '400px', padding: '28px', boxShadow: 'var(--az-shadow-hover)' }}>
            <h3 className="az-h3" style={{ fontSize: '20px', margin: '0 0 12px 0', color: 'var(--az-primary, #004e34)' }}>Cancel Subscription</h3>
            <p className="az-body" style={{ fontSize: '14px', color: 'var(--az-text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
              Are you sure you want to cancel? You will lose access to this creator's exclusive content immediately.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowModal(false)}
                className="az-btn-secondary"
                style={{ padding: '8px 20px', fontSize: '14px' }}
              >
                Keep it
              </button>
              <button 
                onClick={handleCancel}
                disabled={canceling}
                style={{ padding: '8px 20px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 'var(--az-radius-sm, 4px)', fontWeight: 600, fontSize: '14px', cursor: 'pointer', opacity: canceling ? 0.5 : 1 }}
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
