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
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
      <div style={{ background: 'var(--v2-surface-lowest)', width: '100%', maxWidth: '480px', borderRadius: '24px', padding: '40px', position: 'relative', boxShadow: '0 24px 48px rgba(0,0,0,0.1)' }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '32px', right: '32px', background: 'var(--v2-surface-low)', border: 'none', cursor: 'pointer', color: 'var(--v2-text-variant)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
          onMouseOver={e => e.currentTarget.style.background = 'var(--v2-outline)'}
          onMouseOut={e => e.currentTarget.style.background = 'var(--v2-surface-low)'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
        </button>

        <h2 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--v2-primary)', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
          {fundraiserId ? 'Contribute to Goal' : title}
        </h2>
        <p style={{ color: 'var(--v2-text-variant)', fontSize: '15px', marginBottom: '32px' }}>
          Support the creator safely. No account required.
        </p>

        <form onSubmit={handleDonate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Amount (₦)</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
              {presets.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmount(p)}
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    border: `1px solid ${amount === p ? 'var(--v2-green)' : 'var(--v2-outline)'}`,
                    background: amount === p ? 'rgba(34, 197, 94, 0.08)' : 'var(--v2-surface-lowest)',
                    color: amount === p ? 'var(--v2-green)' : 'var(--v2-primary)',
                    fontWeight: 600,
                    fontSize: '15px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: amount === p ? '0 0 0 1px var(--v2-green)' : 'none'
                  }}
                >
                  ₦{p.toLocaleString()}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value ? Number(e.target.value) : '')}
              className="v2-input"
              placeholder="Other amount"
              style={{ width: '100%', fontSize: '16px', padding: '14px 16px', border: '1px solid var(--v2-outline)', borderRadius: '12px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--v2-text-variant)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name (Optional)</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="v2-input"
                placeholder="e.g. Anonymous Fan"
                style={{ width: '100%', fontSize: '15px', padding: '14px 16px', border: '1px solid var(--v2-outline)', borderRadius: '12px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--v2-text-variant)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address (Required)</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="v2-input"
                required
                placeholder="For your payment receipt"
                style={{ width: '100%', fontSize: '15px', padding: '14px 16px', border: '1px solid var(--v2-outline)', borderRadius: '12px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--v2-text-variant)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Note (Optional)</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              className="v2-input"
              rows={3}
              placeholder="Leave a message of support!"
              style={{ width: '100%', fontSize: '15px', padding: '14px 16px', resize: 'none', border: '1px solid var(--v2-outline)', borderRadius: '12px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
            <button
              type="button"
              onClick={onClose}
              className="v2-btn v2-btn-secondary"
              style={{ flex: 1, padding: '14px', fontSize: '16px', background: 'transparent', border: '1px solid var(--v2-outline)', color: 'var(--v2-primary)', borderRadius: '12px' }}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="v2-btn v2-btn-primary"
              style={{ flex: 1, padding: '14px', fontSize: '16px', borderRadius: '12px' }}
              disabled={loading}
            >
              {loading ? 'Processing...' : `Donate ₦${(amount || 0).toLocaleString()}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
