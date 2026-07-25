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
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
      <div className="az-card" style={{ background: '#ffffff', width: '100%', maxWidth: '480px', borderRadius: '24px', padding: '36px', position: 'relative', boxShadow: 'var(--az-shadow-hover)' }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '24px', right: '24px', background: 'var(--az-surface-low, #f0f4f1)', border: 'none', cursor: 'pointer', color: 'var(--az-text-muted)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
          onMouseOver={e => e.currentTarget.style.background = 'var(--az-border)'}
          onMouseOut={e => e.currentTarget.style.background = 'var(--az-surface-low)'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
        </button>

        <h2 className="az-h2" style={{ fontSize: '26px', color: 'var(--az-primary, #004e34)', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
          {fundraiserId ? 'Contribute to Goal' : title}
        </h2>
        <p className="az-body" style={{ color: 'var(--az-text-muted)', fontSize: '14px', marginBottom: '28px' }}>
          Support the creator safely. No account required.
        </p>

        <form onSubmit={handleDonate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label className="az-label" style={{ display: 'block', marginBottom: '10px' }}>Amount (₦)</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
              {presets.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmount(p)}
                  style={{
                    padding: '12px 8px',
                    borderRadius: '10px',
                    border: `1px solid ${amount === p ? 'var(--az-primary, #004e34)' : 'var(--az-border)'}`,
                    background: amount === p ? 'var(--az-surface-low, #f0f4f1)' : '#ffffff',
                    color: amount === p ? 'var(--az-primary, #004e34)' : 'var(--az-text-main)',
                    fontWeight: 600,
                    fontSize: '15px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: amount === p ? '0 0 0 1px var(--az-primary)' : 'none'
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
              className="az-input"
              placeholder="Other amount"
              style={{ width: '100%', fontSize: '16px', padding: '12px 16px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label className="az-label" style={{ display: 'block', marginBottom: '6px' }}>Name (Optional)</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="az-input"
                placeholder="e.g. Anonymous Fan"
                style={{ width: '100%', fontSize: '16px', padding: '12px 16px' }}
              />
            </div>
            <div>
              <label className="az-label" style={{ display: 'block', marginBottom: '6px' }}>Email Address (Required)</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="az-input"
                required
                placeholder="For your payment receipt"
                style={{ width: '100%', fontSize: '16px', padding: '12px 16px' }}
              />
            </div>
          </div>

          <div>
            <label className="az-label" style={{ display: 'block', marginBottom: '6px' }}>Note (Optional)</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              className="az-input"
              rows={3}
              placeholder="Leave a message of support!"
              style={{ width: '100%', fontSize: '16px', padding: '12px 16px', resize: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '14px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              className="az-btn-secondary"
              style={{ flex: 1, padding: '12px', fontSize: '16px' }}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="az-btn-primary"
              style={{ flex: 1, padding: '12px', fontSize: '16px', opacity: loading ? 0.7 : 1 }}
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
