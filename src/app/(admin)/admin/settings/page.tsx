'use client';

import React, { useState, useEffect } from 'react';

export default function PlatformSettingsPage() {
  const [rates, setRates] = useState({ usd: 1260, eur: 1475, gbp: 1740 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((res) => res.json())
      .then((res) => {
        if (res.data) {
          setRates({
            usd: res.data.suggested_rate_usd || 1260,
            eur: res.data.suggested_rate_eur || 1475,
            gbp: res.data.suggested_rate_gbp || 1740
          });
        }
      })
      .catch((err) => {
        console.error('Failed to load settings:', err);
        setMessage({ type: 'error', text: 'Failed to load settings' });
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggested_rate_usd: rates.usd,
          suggested_rate_eur: rates.eur,
          suggested_rate_gbp: rates.gbp
        })
      });

      if (!res.ok) throw new Error('Failed to save settings');
      
      setMessage({ type: 'success', text: 'Platform settings updated successfully' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error saving settings' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '192px', alignItems: 'center', justifyContent: 'center' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#004e34', animation: 'spin 1s linear infinite' }}>
          progress_activity
        </span>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', marginBottom: '8px' }}>
          Platform Settings
        </h1>
        <p style={{ color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '16px', margin: 0 }}>
          Manage global configuration and multi-currency exchange rates.
        </p>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '28px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-heading, Montserrat, sans-serif)', color: '#0b1c30', margin: '0 0 6px 0' }}>
            Suggested Exchange Rates
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', fontFamily: 'var(--font-body, Inter, sans-serif)', margin: 0, lineHeight: 1.5 }}>
            These baseline rates are used to mathematically calculate and auto-suggest premium pricing for foreign subscription tiers.
          </p>
        </div>

        {message && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px',
            fontFamily: 'var(--font-body, Inter, sans-serif)',
            background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: message.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px', color: '#0b1c30', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
              USD Rate (NGN to 1 USD)
            </label>
            <input 
              type="number" 
              value={rates.usd} 
              onChange={(e) => setRates({ ...rates, usd: Number(e.target.value) })}
              className="az-input"
              style={{ width: '100%', fontSize: '16px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px', color: '#0b1c30', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
              EUR Rate (NGN to 1 EUR)
            </label>
            <input 
              type="number" 
              value={rates.eur} 
              onChange={(e) => setRates({ ...rates, eur: Number(e.target.value) })}
              className="az-input"
              style={{ width: '100%', fontSize: '16px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '6px', color: '#0b1c30', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
              GBP Rate (NGN to 1 GBP)
            </label>
            <input 
              type="number" 
              value={rates.gbp} 
              onChange={(e) => setRates({ ...rates, gbp: Number(e.target.value) })}
              className="az-input"
              style={{ width: '100%', fontSize: '16px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}
            />
          </div>

          <div style={{ marginTop: '8px' }}>
            <button 
              type="submit" 
              disabled={isSaving} 
              className="az-btn-primary" 
              style={{ 
                backgroundColor: '#fed65b', 
                color: '#745c00', 
                fontFamily: 'var(--font-heading, Montserrat, sans-serif)', 
                fontWeight: 600, 
                borderRadius: '8px', 
                padding: '10px 24px', 
                border: 'none', 
                cursor: isSaving ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {isSaving ? 'Saving...' : 'Save Rates'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
