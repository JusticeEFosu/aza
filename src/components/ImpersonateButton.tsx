'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ImpersonateButton({ userId, email }: { userId: string, email: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleImpersonate = async () => {
    if (!confirm(`Are you sure you want to login as ${email}?`)) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email, returnUrl: window.location.pathname + window.location.search })
      });
      
      const data = await res.json();
      
      if (data.action_link) {
        // Append redirect_to so Supabase returns us to the same environment (localhost vs vercel)
        const url = new URL(data.action_link);
        url.searchParams.set('redirect_to', window.location.origin + '/');
        window.location.href = url.toString();
      } else {
        alert(data.error || 'Failed to impersonate user');
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred');
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleImpersonate}
      disabled={loading}
      className="v2-btn v2-btn-secondary" 
      style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
      title="Login As"
    >
      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>visibility</span>
      {loading ? '...' : 'Login'}
    </button>
  );
}
