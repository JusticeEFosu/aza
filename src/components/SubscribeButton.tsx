'use client';

import { useState } from 'react';

export default function SubscribeButton({ 
  tierId, 
  planCode,
  isSubscribed = false
}: { 
  tierId: string; 
  planCode: string | null;
  isSubscribed?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubscribe = async () => {
    if (!planCode) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierId })
      });

      const data = await res.json();
      
      // If unauthorized, redirect to login with a return URL
      if (res.status === 401) {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        return;
      }

      if (!res.ok) throw new Error(data.error || 'Checkout failed');

      // Paystack returns an authorization URL to redirect to their secure hosted checkout
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      setLoading(false);
    }
  };

  if (!planCode) {
    return (
      <button className="v2-sub-btn v2-sub-btn-secondary" style={{ width: '100%', opacity: 0.5, cursor: 'not-allowed' }} disabled>
        Unavailable
      </button>
    );
  }

  if (isSubscribed) {
    return (
      <button 
        className="v2-sub-btn v2-sub-btn-secondary" 
        style={{ width: '100%', cursor: 'default', background: 'var(--v2-surface-low)', color: 'var(--v2-text-variant)' }}
        disabled
      >
        <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '4px' }}>check_circle</span>
        Active
      </button>
    );
  }

  return (
    <>
      <button 
        className="v2-sub-btn v2-sub-btn-primary" 
        style={{ width: '100%' }}
        onClick={handleSubscribe} 
        disabled={loading}
      >
        {loading ? (
          <span className="spinner" style={{ width: '20px', height: '20px', border: '2px solid white', borderTopColor: 'transparent' }} />
        ) : (
          'Join'
        )}
      </button>
      {error && <p style={{ color: 'var(--v2-error, #ba1a1a)', fontSize: '12px', textAlign: 'center', marginTop: '8px', fontWeight: 500 }}>{error}</p>}
    </>
  );
}
