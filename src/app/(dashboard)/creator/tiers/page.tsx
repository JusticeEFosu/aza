'use client';

import { useState, useEffect } from 'react';

export default function CreatorTiers() {
  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // New Tier form state
  const [name, setName] = useState('');
  const [amountNaira, setAmountNaira] = useState('');
  const [description, setDescription] = useState('');
  const [perksText, setPerksText] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchTiers();
  }, []);

  async function fetchTiers() {
    try {
      const res = await fetch('/api/tiers');
      const data = await res.json();
      if (data.data) {
        setTiers(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTier(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg({ text: '', type: '' });

    try {
      const amountKobo = Math.round(parseFloat(amountNaira) * 100);
      if (amountKobo < 100) throw new Error('Minimum tier amount is ₦1');
      
      const perksArray = perksText
        .split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0);

      const res = await fetch('/api/tiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          amount: amountKobo,
          description,
          perks: perksArray
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMsg({ text: 'Tier created successfully! Setup in Paystack.', type: 'success' });
      // Reset form
      setName('');
      setAmountNaira('');
      setDescription('');
      setPerksText('');
      
      // Refresh list
      fetchTiers();
    } catch (err: any) {
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="container" style={{paddingTop: '2rem'}}>Loading tiers...</div>;

  return (
    <div className="container" style={{ maxWidth: '800px', paddingTop: '2rem', paddingBottom: '4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Manage Subscription Tiers</h2>
        <a href="/creator" className="btn btn-secondary btn-sm">Back to Dashboard</a>
      </div>

      <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: '1fr', '@media (min-width: 768px)': { gridTemplateColumns: '1fr 1fr' } } as any}>
        
        {/* Create New Tier Form */}
        <div className="glass-card">
          <h3 style={{ marginBottom: '1.5rem' }}>Create New Tier</h3>
          
          {msg.text && (
            <div className={`alert alert-${msg.type}`} style={{ marginBottom: '1.5rem' }}>
              {msg.text}
            </div>
          )}

          <form onSubmit={handleCreateTier} className="form-group" style={{ gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Tier Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. VIP Supporter"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Monthly Price (₦)</label>
              <input
                type="number"
                className="form-input"
                placeholder="1000"
                min="100"
                step="100"
                value={amountNaira}
                onChange={e => setAmountNaira(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-input"
                rows={2}
                placeholder="Short description for your fans"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Perks (One per line)</label>
              <textarea
                className="form-input"
                rows={4}
                placeholder="Exclusive videos&#10;Private Discord invite&#10;Monthly Q&amp;A"
                value={perksText}
                onChange={e => setPerksText(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" /> : 'Create Tier'}
            </button>
          </form>
        </div>

        {/* Existing Tiers List */}
        <div>
          <h3 style={{ marginBottom: '1.5rem' }}>Your Tiers</h3>
          
          {tiers.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
              <p style={{ color: 'var(--text-muted)' }}>You haven't created any tiers yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {tiers.map(tier => (
                <div key={tier.id} className="glass-card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0 }}>{tier.name}</h4>
                    <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                      ₦{(tier.amount / 100).toLocaleString()}/mo
                    </span>
                  </div>
                  {tier.description && (
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                      {tier.description}
                    </p>
                  )}
                  {tier.perks && tier.perks.length > 0 && (
                    <ul style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                      {tier.perks.map((p: string, i: number) => (
                        <li key={i} style={{ marginBottom: '0.25rem' }}>{p}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
