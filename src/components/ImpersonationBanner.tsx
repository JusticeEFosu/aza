'use client';

import { useState } from 'react';

export function ImpersonationBanner({ hasReturnToken }: { hasReturnToken: boolean }) {
  const [loading, setLoading] = useState(false);

  if (!hasReturnToken) return null;

  const handleReturn = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/return', { method: 'POST' });
      const data = await res.json();
      
      if (data.action_link) {
        // We navigate to the magic link, then Supabase will redirect to localhost:3000/#access_token...
        // Wait, the magic link doesn't know where to redirect unless we appended redirect_to.
        // Actually, if we just set window.location.href, it will redirect back to the home page or dashboard.
        // But we want to return them to the original returnUrl.
        // We can append ?redirect_to= to the action_link.
        
        const url = new URL(data.action_link);
        // Supabase action_links sometimes already have redirect_to. Let's just use the client to route there after login?
        // Let's just navigate to it. It will redirect to the site URL, and the client will be logged in.
        // We can save the return_url in sessionStorage so the layout or middleware can redirect, 
        // OR we just append redirect_to to the magic link.
        
        // Supabase verify endpoint respects redirect_to parameter if added.
        url.searchParams.set('redirect_to', window.location.origin + data.return_url);
        
        window.location.href = url.toString();
      } else {
        alert(data.error || 'Failed to return to admin');
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred');
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: '#ffeb3b',
      color: '#000',
      textAlign: 'center',
      padding: '12px 24px',
      fontSize: '14px',
      fontWeight: 700,
      zIndex: 10000,
      position: 'sticky',
      top: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    }}>
      <span className="material-symbols-outlined" style={{ color: '#d32f2f' }}>warning</span>
      YOU ARE CURRENTLY IMPERSONATING A USER
      <button 
        onClick={handleReturn}
        disabled={loading}
        style={{
          background: '#000',
          color: '#ffeb3b',
          border: 'none',
          padding: '6px 16px',
          borderRadius: '4px',
          fontWeight: 800,
          cursor: 'pointer',
          textTransform: 'uppercase',
          fontSize: '12px'
        }}
      >
        {loading ? 'Returning...' : 'Return to Admin'}
      </button>
    </div>
  );
}
