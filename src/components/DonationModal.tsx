'use client';

import { useState } from 'react';

export default function DonationModal({ 
  creatorId, 
  fundraiserId, 
  title, 
  onClose 
}: { 
  creatorId: string, 
  fundraiserId?: string, 
  title: string, 
  onClose: () => void 
}) {
  const presets = [1000, 5000, 10000];
  const [amount, setAmount] = useState<number | ''>(presets[1]);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount < 100) return alert('Minimum amount is ₦100');
    if (!email) return alert('Email is required for the receipt.');

    setLoading(true);
    try {
      const res = await fetch('/api/donate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId,
          fundraiserId,
          amount: amount * 100, // to kobo
          name,
          note,
          email,
          callbackUrl: window.location.href
        })
      });

      const data = await res.json();
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        throw new Error(data.error || 'Checkout failed');
      }
    } catch (err: any) {
      alert(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
      <div style={{ background: 'var(--v2-surface-lowest)', width: '100%', maxWidth: '440px', borderRadius: '16px', padding: '32px', position: 'relative' }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--v2-text-variant)' }}
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <h2 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--v2-primary)', margin: '0 0 8px 0' }}>{title}</h2>
        <p style={{ color: 'var(--v2-text-variant)', fontSize: '14px', marginBottom: '24px' }}>Support the creator. No account needed!</p>

        <form onSubmit={handleDonate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Amount (₦)</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
              {presets.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmount(p)}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: `2px solid ${amount === p ? 'var(--v2-green)' : 'var(--v2-outline)'}`,
                    background: amount === p ? 'rgba(34, 197, 94, 0.05)' : 'transparent',
                    color: amount === p ? 'var(--v2-green)' : 'var(--v2-primary)',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {p.toLocaleString()}
                </button>
              ))}
            </div>
            <input 
              type="number" 
              min="100"
              placeholder="Custom Amount"
              value={amount}
              onChange={e => setAmount(Number(e.target.value) || '')}
              className="v2-input"
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Email (Required)</label>
            <input 
              type="email" 
              required
              placeholder="For your receipt"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="v2-input"
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Name (Optional)</label>
              <input 
                type="text" 
                placeholder="Guest"
                value={name}
                onChange={e => setName(e.target.value)}
                className="v2-input"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Note (Optional)</label>
            <textarea 
              placeholder="Leave a message of support!"
              value={note}
              onChange={e => setNote(e.target.value)}
              className="v2-input"
              style={{ width: '100%', minHeight: '60px', resize: 'vertical' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="v2-btn v2-btn-primary" 
            style={{ width: '100%', height: '48px', marginTop: '8px' }}
          >
            {loading ? 'Processing...' : `${fundraiserId ? 'Donate' : 'Send Tip'} ₦${(amount || 0).toLocaleString()}`}
          </button>
        </form>
      </div>
    </div>
  );
}
