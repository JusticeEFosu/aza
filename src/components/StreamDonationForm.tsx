'use client';

import { useState } from 'react';

const CURRENCIES = {
  NGN: { symbol: '₦', min: 500, presets: [1000, 2000, 5000, 10000] },
  USD: { symbol: '$', min: 1, presets: [3, 5, 10, 25] },
  GBP: { symbol: '£', min: 1, presets: [3, 5, 10, 25] },
  EUR: { symbol: '€', min: 1, presets: [3, 5, 10, 25] },
};

type CurrencyCode = keyof typeof CURRENCIES;

export default function StreamDonationForm({ creatorId }: { creatorId: string }) {
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [amount, setAmount] = useState<string>('5');
  const [donorName, setDonorName] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const activeCurrency = CURRENCIES[currency];

  const handlePresetClick = (preset: number) => {
    setAmount(preset.toString());
  };

  const handleCurrencyChange = (c: CurrencyCode) => {
    setCurrency(c);
    setAmount(CURRENCIES[c].presets[1].toString()); // Default to 2nd preset
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < activeCurrency.min) {
      alert(`Minimum donation is ${activeCurrency.symbol}${activeCurrency.min}`);
      return;
    }

    if (!email) {
      alert('Please enter your email address for the receipt.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/donate/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId,
          amount: numAmount,
          currency,
          donorName: donorName.trim() || 'Anonymous',
          message: message.trim(),
          email: email.trim()
        })
      });

      const data = await res.json();
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        alert(data.error || 'Failed to initialize payment');
        setIsLoading(false);
      }
    } catch (err) {
      alert('An error occurred while connecting to the payment gateway.');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: '24px', padding: '32px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Currency Selector */}
      <div>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#0b1c30', marginBottom: '12px' }}>Select Currency</label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(Object.keys(CURRENCIES) as CurrencyCode[]).map(c => (
            <button
              key={c}
              type="button"
              onClick={() => handleCurrencyChange(c)}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: currency === c ? '2px solid #004e34' : '1px solid #E2E8F0',
                background: currency === c ? '#f0fdf4' : '#fff',
                color: currency === c ? '#004e34' : '#6f7a72',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'var(--font-heading)'
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Amount Presets */}
      <div>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#0b1c30', marginBottom: '12px' }}>Donation Amount</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
          {activeCurrency.presets.map(preset => (
            <button
              key={preset}
              type="button"
              onClick={() => handlePresetClick(preset)}
              style={{
                padding: '12px 0',
                borderRadius: '8px',
                border: parseFloat(amount) === preset ? '2px solid #004e34' : '1px solid #E2E8F0',
                background: parseFloat(amount) === preset ? '#004e34' : '#fff',
                color: parseFloat(amount) === preset ? '#fff' : '#0b1c30',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'var(--font-heading)'
              }}
            >
              {activeCurrency.symbol}{preset}
            </button>
          ))}
        </div>
        
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 600, color: '#0b1c30', fontSize: '18px' }}>
            {activeCurrency.symbol}
          </span>
          <input
            type="number"
            min={activeCurrency.min}
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="az-input"
            style={{ width: '100%', paddingLeft: '40px', fontSize: '18px', fontWeight: 600, height: '56px' }}
            required
          />
        </div>
      </div>

      {/* Donor Details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#0b1c30', marginBottom: '8px' }}>Your Name (Optional)</label>
          <input
            type="text"
            value={donorName}
            onChange={e => setDonorName(e.target.value)}
            placeholder="Anonymous"
            className="az-input"
            style={{ width: '100%' }}
            maxLength={50}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#0b1c30', marginBottom: '8px' }}>Email (For receipt)</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="az-input"
            style={{ width: '100%' }}
            required
          />
        </div>

        <div>
          <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 600, color: '#0b1c30', marginBottom: '8px' }}>
            <span>Message on Stream (Optional)</span>
            <span style={{ color: '#6f7a72', fontWeight: 400 }}>{250 - message.length} left</span>
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Love the stream bro!"
            className="az-textarea"
            style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
            maxLength={250}
          />
        </div>
      </div>

      <button 
        type="submit" 
        disabled={isLoading}
        style={{ 
          background: '#fed65b', 
          color: '#745c00', 
          width: '100%', 
          padding: '16px', 
          borderRadius: '12px', 
          border: 'none', 
          fontSize: '18px', 
          fontWeight: 700, 
          fontFamily: 'var(--font-heading)',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          opacity: isLoading ? 0.7 : 1,
          marginTop: '8px'
        }}
      >
        {isLoading ? 'Connecting to Secure Checkout...' : `Donate ${activeCurrency.symbol}${amount || 0}`}
      </button>

      <div style={{ textAlign: 'center', fontSize: '12px', color: '#6f7a72', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>lock</span>
        Secure payment processed by Paystack
      </div>
    </form>
  );
}
