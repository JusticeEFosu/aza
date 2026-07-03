'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface SetupWidgetProps {
  userId: string;
  hasProfile: boolean;
  hasBank: boolean;
  hasTiers: boolean;
  isPublished: boolean;
}

export default function SetupWidget({ userId, hasProfile, hasBank, hasTiers, isPublished }: SetupWidgetProps) {
  const router = useRouter();
  const supabase = createClient();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Payout states
  const [bankAccount, setBankAccount] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [availableBanks, setAvailableBanks] = useState<any[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [resolvingBank, setResolvingBank] = useState(false);
  const [resolvedName, setResolvedName] = useState('');
  const [resolveError, setResolveError] = useState('');

  // Tier states
  const [tierName, setTierName] = useState('');
  const [tierPrice, setTierPrice] = useState('');
  const [tierDesc, setTierDesc] = useState('');
  const [tierPerksText, setTierPerksText] = useState('');
  const [tierStep, setTierStep] = useState(1);

  const steps = [
    {
      id: 'profile',
      title: 'Complete Profile',
      description: 'Add a profile picture and banner to stand out.',
      completed: hasProfile,
    },
    {
      id: 'bank',
      title: 'Set up Payouts',
      description: 'Link your bank account to receive earnings.',
      completed: hasBank,
    },
    {
      id: 'tier',
      title: 'Create your first Tier',
      description: 'Set up a subscription level for your fans.',
      completed: hasTiers,
    },
    {
      id: 'publish',
      title: 'Publish Page',
      description: 'Make your page visible to the world.',
      completed: isPublished,
    }
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);
  const isFinished = completedCount === steps.length;

  useEffect(() => {
    if (activeModal === 'bank') {
      const fetchBanks = async () => {
        setBanksLoading(true);
        try {
          const res = await fetch('/api/banks');
          const data = await res.json();
          if (Array.isArray(data)) {
            const uniqueBanks = data.filter((b, index, self) => 
              index === self.findIndex((t) => t.code === b.code)
            );
            setAvailableBanks(uniqueBanks);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setBanksLoading(false);
        }
      };
      fetchBanks();
    }
  }, [activeModal]);

  useEffect(() => {
    const resolveAccount = async () => {
      if (bankAccount.length !== 10 || !bankCode) {
        setResolvedName('');
        setResolveError('');
        return;
      }
      setResolvingBank(true);
      setResolveError('');
      setResolvedName('');
      try {
        const res = await fetch('/api/banks/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bankCode, accountNumber: bankAccount })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setResolvedName(data.account_name);
      } catch (err: any) {
        setResolveError(err.message || 'Could not verify account. Please try again.');
      } finally {
        setResolvingBank(false);
      }
    };
    const timeoutId = setTimeout(() => resolveAccount(), 500);
    return () => clearTimeout(timeoutId);
  }, [bankAccount, bankCode]);

  if (isFinished) return null;

  const handlePublish = async () => {
    if (!hasBank) {
      alert("You must set up payouts before publishing.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('creator_profiles').update({ is_published: true }).eq('id', userId);
      if (error) throw error;
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const saveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/creators/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankCode, accountNumber: bankAccount })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to setup payouts');
      
      setActiveModal(null);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const saveTier = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const amountKobo = Math.round(parseFloat(tierPrice) * 100);
      if (amountKobo < 100) throw new Error('Minimum tier amount is ₦1');
      const perksArray = tierPerksText.split('\n').map(p => p.trim()).filter(p => p.length > 0);
      
      const response = await fetch('/api/tiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tierName, amount: amountKobo, description: tierDesc, perks: perksArray })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create tier');
      
      setActiveModal(null);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const closeDrawer = () => {
    setActiveModal(null);
    setError(null);
    setTierStep(1);
  };

  return (
    <>
      {/* Checklist Widget */}
      <div style={{ 
        background: 'var(--v2-surface-lowest)', 
        borderRadius: '12px', 
        border: '1px solid var(--v2-outline)', 
        marginBottom: '32px', 
        position: 'relative', 
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, height: '4px', background: 'var(--v2-primary)', width: `${progressPercent}%`, transition: 'width 0.5s ease' }} />

        <div style={{ padding: '24px', borderBottom: '1px solid var(--v2-outline)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--v2-primary)' }}>Setup your Page</h2>
          <p style={{ color: 'var(--v2-text-variant)', fontSize: '14px', margin: 0 }}>
            <span style={{ fontWeight: 700, color: 'var(--v2-primary)' }}>{completedCount} of {steps.length} complete</span>
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0' }}>
          {steps.map((step, index) => (
            <div 
              key={step.id}
              onClick={() => {
                if (step.completed) return;
                if (step.id === 'publish') handlePublish();
                else setActiveModal(step.id);
              }}
              style={{
                padding: '24px',
                background: step.completed ? 'var(--v2-surface-bright, #f8f9ff)' : 'transparent',
                borderRight: index < steps.length - 1 ? '1px solid var(--v2-outline)' : 'none',
                borderBottom: 'none',
                cursor: step.completed ? 'default' : 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: step.completed ? 'var(--v2-green, #096c4b)' : 'var(--v2-text-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                    {step.completed ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: step.completed ? 'var(--v2-green, #096c4b)' : 'var(--v2-text-variant)', textTransform: 'uppercase' }}>
                  {step.completed ? 'Completed' : 'Pending'}
                </span>
              </div>
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 600, color: 'var(--v2-primary)', textDecoration: step.completed ? 'line-through' : 'none', opacity: step.completed ? 0.6 : 1 }}>
                  {step.title}
                </h4>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--v2-text-variant)', lineHeight: 1.5, opacity: step.completed ? 0.6 : 1 }}>
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Slide-Over Drawer */}
      {activeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
          {/* Backdrop */}
          <div 
            onClick={closeDrawer} 
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.3s ease' }} 
          />
          
          {/* Drawer Panel */}
          <div style={{ 
            width: '100%', 
            maxWidth: '500px', 
            background: 'var(--v2-surface-lowest)', 
            height: '100%', 
            position: 'relative', 
            zIndex: 1001, 
            display: 'flex', 
            flexDirection: 'column',
            boxShadow: '-8px 0 32px rgba(0,0,0,0.1)',
            animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <style>{`
              @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
              @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', borderBottom: '1px solid var(--v2-outline)' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: 'var(--v2-primary)' }}>
                {activeModal === 'profile' && 'Complete Profile'}
                {activeModal === 'bank' && 'Set up Payouts'}
                {activeModal === 'tier' && 'Create a Tier'}
              </h3>
              <button onClick={closeDrawer} style={{ background: 'var(--v2-surface-low)', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--v2-text-variant)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px' }}>
              {error && <div style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px', fontWeight: 500 }}>{error}</div>}

              {activeModal === 'profile' && (
                <div>
                  <p style={{ color: 'var(--v2-text-variant)', marginBottom: '24px', lineHeight: 1.6 }}>Your public profile is where fans come to subscribe. To complete it, you should upload a profile picture and set a cover banner so it looks premium.</p>
                  <button onClick={() => router.push('/creator/settings')} className="v2-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                    Open Profile Settings
                  </button>
                </div>
              )}

              {activeModal === 'bank' && (
                <form onSubmit={saveBank}>
                  <p style={{ color: 'var(--v2-text-variant)', marginBottom: '32px', lineHeight: 1.6 }}>Connect your Nigerian bank account to receive automatic weekly payouts.</p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--v2-primary)' }}>Select Bank</label>
                      <select 
                        required 
                        value={bankCode} 
                        onChange={e => setBankCode(e.target.value)} 
                        disabled={banksLoading}
                        style={{ width: '100%', padding: '14px 16px', border: '1px solid var(--v2-outline)', borderRadius: '8px', background: 'var(--v2-surface)', fontSize: '16px', color: 'var(--v2-primary)' }}
                      >
                        <option value="" disabled>{banksLoading ? 'Loading banks...' : 'Select your bank...'}</option>
                        {availableBanks.map(b => (
                          <option key={b.code} value={b.code}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--v2-primary)' }}>Account Number</label>
                      <input 
                        required 
                        maxLength={10}
                        value={bankAccount} 
                        onChange={e => setBankAccount(e.target.value)} 
                        placeholder="0123456789"
                        style={{ width: '100%', padding: '14px 16px', border: '1px solid var(--v2-outline)', borderRadius: '8px', background: 'var(--v2-surface)', fontSize: '16px', color: 'var(--v2-primary)' }} 
                      />
                    </div>

                    <div style={{ minHeight: '48px' }}>
                      {resolvingBank && (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--v2-text-variant)', fontSize: '14px' }}>
                          <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                          Resolving account name...
                        </div>
                      )}
                      
                      {resolveError && !resolvingBank && (
                        <div style={{ color: '#dc2626', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span>
                          {resolveError}
                        </div>
                      )}

                      {resolvedName && !resolvingBank && (
                        <div style={{ color: '#059669', fontWeight: 600, fontSize: '15px', background: '#ecfdf5', padding: '12px 16px', borderRadius: '8px', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>verified</span> 
                          {resolvedName}
                        </div>
                      )}
                    </div>
                  </div>
                  <button type="submit" disabled={loading || !resolvedName} className="v2-btn-primary" style={{ width: '100%', justifyContent: 'center', opacity: (loading || !resolvedName) ? 0.5 : 1 }}>
                    {loading ? 'Saving...' : 'Save Bank Details'}
                  </button>
                </form>
              )}

              {activeModal === 'tier' && (
                <form onSubmit={saveTier}>
                  {tierStep === 1 ? (
                    <div>
                      <p style={{ color: 'var(--v2-text-variant)', marginBottom: '32px', lineHeight: 1.6 }}>Give your fans a way to support you by creating a subscription tier.</p>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--v2-primary)' }}>Tier Name</label>
                          <input required value={tierName} onChange={e => setTierName(e.target.value)} placeholder="e.g. Super Fan, Inner Circle" style={{ width: '100%', padding: '14px 16px', border: '1px solid var(--v2-outline)', borderRadius: '8px', background: 'var(--v2-surface)', fontSize: '16px' }} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--v2-primary)' }}>Description</label>
                          <textarea required value={tierDesc} onChange={e => setTierDesc(e.target.value)} rows={3} placeholder="What is this tier about?" style={{ width: '100%', padding: '14px 16px', border: '1px solid var(--v2-outline)', borderRadius: '8px', background: 'var(--v2-surface)', fontSize: '16px' }} />
                        </div>
                        <button type="button" onClick={() => setTierStep(2)} className="v2-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                          Continue
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px', cursor: 'pointer', color: 'var(--v2-text-variant)' }} onClick={() => setTierStep(1)}>
                        <span className="material-symbols-outlined">arrow_back</span>
                        <span style={{ fontSize: '14px', fontWeight: 600 }}>Back to Details</span>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--v2-primary)' }}>Monthly Price (₦)</label>
                          <input type="number" required min="100" step="100" value={tierPrice} onChange={e => setTierPrice(e.target.value)} placeholder="e.g. 5000" style={{ width: '100%', padding: '14px 16px', border: '1px solid var(--v2-outline)', borderRadius: '8px', background: 'var(--v2-surface)', fontSize: '16px' }} />
                          <span style={{ display: 'block', marginTop: '8px', fontSize: '13px', color: 'var(--v2-text-variant)' }}>Minimum price is ₦100.</span>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--v2-primary)' }}>Perks (One per line)</label>
                          <textarea 
                            value={tierPerksText} 
                            onChange={e => setTierPerksText(e.target.value)} 
                            rows={4} 
                            placeholder={"Exclusive videos\nPrivate Discord\nMonthly Q&A"} 
                            style={{ width: '100%', padding: '14px 16px', border: '1px solid var(--v2-outline)', borderRadius: '8px', background: 'var(--v2-surface)', fontSize: '16px', lineHeight: 1.6 }} 
                          />
                        </div>
                        <button type="submit" disabled={loading} className="v2-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                          {loading ? 'Publishing Tier...' : 'Create Tier'}
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
