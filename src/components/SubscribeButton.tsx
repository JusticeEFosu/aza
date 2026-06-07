'use client';

import { useState } from 'react';

export default function SubscribeButton({ 
  tierId, 
  planCode 
}: { 
  tierId: string; 
  planCode: string | null; 
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
      
      // If unauthorized, redirect to login
      if (res.status === 401) {
        window.location.href = `/login?redirect=${window.location.pathname}`;
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
      <button className="btn btn-primary btn-full" disabled style={{ opacity: 0.5 }}>
        Unavailable
      </button>
    );
  }

  return (
    <>
      <button 
        className="btn btn-primary btn-full" 
        onClick={handleSubscribe} 
        disabled={loading}
      >
        {loading ? <span className="spinner" /> : 'Subscribe'}
      </button>
      {error && <p className="form-error" style={{ textAlign: 'center', marginTop: '0.5rem' }}>{error}</p>}
    </>
  );
}
