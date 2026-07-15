'use client';

import { useState } from 'react';

export default function InlineDonationForm({ 
  creatorId, 
  fundraiserId 
}: { 
  creatorId: string, 
  fundraiserId: string
}) {
  const presets = [1000, 5000, 10000];
  const [amount, setAmount] = useState<number | ''>(presets[1]);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNote, setShowNote] = useState(false);

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
          amount: amount * 100,
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

  const inputStyle: React.CSSProperties = {
    width: '100%',
    fontSize: '16px',
    padding: '12px 14px',
    border: '1px solid var(--v2-border)',
    borderRadius: '4px',
    background: 'var(--v2-surface-lowest)',
    outline: 'none',
    color: 'var(--v2-primary)',
    fontFamily: 'inherit',
  };

  return (
    <form onSubmit={handleDonate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Preset pills */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {presets.map(p => (
          <button
            key={p}
            type="button"
            onClick={() => setAmount(p)}
            style={{
              padding: '10px 8px',
              borderRadius: '4px',
              border: amount === p ? '2px solid var(--v2-green)' : '1px solid var(--v2-border)',
              background: amount === p ? 'rgba(6, 95, 70, 0.05)' : 'var(--v2-surface-lowest)',
              color: amount === p ? 'var(--v2-green)' : 'var(--v2-text-variant)',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s ease',
            }}
          >
            ₦{p.toLocaleString()}
          </button>
        ))}
      </div>

      {/* Custom amount */}
      <input
        type="number"
        value={amount}
        onChange={e => setAmount(e.target.value ? Number(e.target.value) : '')}
        placeholder="Or enter a custom amount (₦)"
        style={inputStyle}
      />

      {/* Name + Email side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
          style={inputStyle}
        />
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          placeholder="Email (required)"
          style={inputStyle}
        />
      </div>

      {/* Optional note toggle */}
      {!showNote ? (
        <button
          type="button"
          onClick={() => setShowNote(true)}
          style={{ background: 'none', border: 'none', color: 'var(--v2-green)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textAlign: 'left', padding: 0, fontFamily: 'inherit' }}
        >
          + Add a message of support
        </button>
      ) : (
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={3}
          placeholder="Leave a message of support!"
          style={{ ...inputStyle, resize: 'none' }}
        />
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="v2-btn-primary"
        style={{
          width: '100%',
          padding: '14px',
          fontSize: '14px',
          fontWeight: 600,
          fontFamily: 'inherit',
          border: 'none',
          cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? 'Processing...' : `Donate ₦${(amount || 0).toLocaleString()}`}
      </button>
    </form>
  );
}
