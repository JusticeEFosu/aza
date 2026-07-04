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

  return (
    <>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      {/* Sleek Vertical Timeline Widget */}
      <div style={{ 
        background: 'var(--v2-surface-lowest)', 
        borderRadius: '16px', 
        border: '1px solid var(--v2-outline)', 
        marginBottom: '40px', 
        boxShadow: '0 8px 24px rgba(0,0,0,0.02)',
        overflow: 'hidden'
      }}>
        {/* Header with Circular Progress */}
        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--v2-outline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--v2-primary)' }}>Setup your Page</h2>
            <p style={{ color: 'var(--v2-text-variant)', fontSize: '15px', margin: 0, fontWeight: 500 }}>
              Complete these steps to start earning.
            </p>
          </div>
          <div style={{ position: 'relative', width: '56px', height: '56px' }}>
            <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%' }}>
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--v2-surface-low)" strokeWidth="3" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--v2-green)" strokeWidth="3" strokeDasharray={`${progressPercent}, 100`} style={{ transition: 'stroke-dasharray 0.5s ease' }} />
            </svg>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: 'var(--v2-primary)' }}>
              {completedCount}/{steps.length}
            </div>
          </div>
        </div>

        {/* Vertical Timeline Body */}
        <div style={{ padding: '16px 0', position: 'relative' }}>
          {/* Vertical Connecting Line Background */}
          <div style={{ position: 'absolute', left: '44px', top: '48px', bottom: '48px', width: '2px', background: 'var(--v2-outline)', zIndex: 0 }}></div>
          
          {/* Active Connector Line overlay (green) */}
          <div style={{ position: 'absolute', left: '44px', top: '48px', height: `calc(${Math.max(0, completedCount - 1)} * 100px)`, width: '2px', background: 'var(--v2-green)', zIndex: 1, transition: 'height 0.5s ease' }}></div>

          {steps.map((step, index) => {
            const isNextPending = !step.completed && (index === 0 || steps[index - 1].completed);
            const isActive = activeModal === step.id;
            
            return (
              <div 
                key={step.id}
                style={{
                  position: 'relative',
                  zIndex: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '24px 32px',
                  background: isActive ? 'var(--v2-surface-low)' : 'transparent',
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (!step.completed && !isActive) e.currentTarget.style.background = 'var(--v2-surface-bright, #f8f9ff)';
                }}
                onMouseLeave={(e) => {
                  if (!step.completed && !isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                {/* Header Row */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {/* Timeline Icon Node */}
                  <div style={{ 
                    width: '26px', 
                    height: '26px', 
                    borderRadius: '50%', 
                    background: step.completed ? 'var(--v2-green)' : 'var(--v2-surface-lowest)', 
                    border: step.completed ? '2px solid var(--v2-green)' : (isNextPending ? '2px solid var(--v2-primary)' : '2px solid var(--v2-outline)'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '24px',
                    boxShadow: '0 0 0 8px ' + (isActive ? 'var(--v2-surface-low)' : 'var(--v2-surface-lowest)'), 
                    flexShrink: 0,
                    transition: 'box-shadow 0.2s ease'
                  }}>
                    {step.completed && (
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'white', fontWeight: 800 }}>check</span>
                    )}
                    {isNextPending && (
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--v2-primary)' }}></div>
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, cursor: step.completed ? 'default' : 'pointer' }} onClick={() => {
                    if (step.completed) return;
                    if (step.id === 'publish') handlePublish();
                    else setActiveModal(isActive ? null : step.id);
                  }}>
                    <h4 style={{ 
                      margin: '0 0 4px 0', 
                      fontSize: '17px', 
                      fontWeight: 700, 
                      color: step.completed ? 'var(--v2-text-variant)' : 'var(--v2-primary)'
                    }}>
                      {step.title}
                    </h4>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '14px', 
                      color: 'var(--v2-text-variant)', 
                      lineHeight: 1.5, 
                    }}>
                      {step.description}
                    </p>
                  </div>

                  {/* Action Button */}
                  <div style={{ marginLeft: '24px' }}>
                    {step.completed ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--v2-green)', fontSize: '13px', fontWeight: 700, padding: '8px 16px', borderRadius: '999px', background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>verified</span>
                        Completed
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                          if (step.id === 'publish') handlePublish();
                          else setActiveModal(isActive ? null : step.id);
                        }}
                        style={{ 
                          background: 'var(--v2-primary)', 
                          color: 'white', 
                          border: 'none', 
                          padding: '10px 24px', 
                          borderRadius: '999px', 
                          fontSize: '14px', 
                          fontWeight: 600, 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          opacity: isNextPending ? 1 : 0.6
                        }}>
                        {step.id === 'publish' ? 'Publish' : (isActive ? 'Close' : 'Start')}
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{isActive ? 'expand_less' : 'arrow_forward'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Expansion Form */}
                {isActive && (
                  <div style={{ marginLeft: '50px', marginTop: '24px', animation: 'fadeIn 0.2s ease' }}>
                    {error && <div style={{ color: 'red', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}

                    {step.id === 'profile' && (
                      <div style={{ background: 'white', padding: '24px', borderRadius: '8px', border: '1px solid var(--v2-outline)' }}>
                        <p style={{ color: 'var(--v2-text-variant)', marginBottom: '24px' }}>Your public profile is where fans come to subscribe. To complete it, you should upload a profile picture and set a cover banner so it looks premium.</p>
                        <button onClick={() => router.push('/creator/settings')} className="v2-btn-primary" style={{ width: '100%', justifyContent: 'center', background: 'var(--v2-accent, #fed65b)', color: '#241a00', border: 'none', borderRadius: '4px', padding: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                          Open Profile Settings
                        </button>
                      </div>
                    )}

                    {step.id === 'bank' && (
                      <div style={{ background: 'white', padding: '24px', borderRadius: '8px', border: '1px solid var(--v2-outline)' }}>
                        <form onSubmit={saveBank}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Select Bank</label>
                              <select 
                                required 
                                value={bankCode} 
                                onChange={e => setBankCode(e.target.value)} 
                                disabled={banksLoading}
                                style={{ width: '100%', padding: '12px', border: '1px solid var(--v2-outline)', borderRadius: '4px', background: 'white', fontSize: '14px' }}
                              >
                                <option value="" disabled>{banksLoading ? 'Loading banks...' : 'Select your bank...'}</option>
                                {availableBanks.map(b => (
                                  <option key={b.code} value={b.code}>{b.name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Account Number</label>
                              <input 
                                required 
                                maxLength={10}
                                value={bankAccount} 
                                onChange={e => setBankAccount(e.target.value)} 
                                placeholder="0123456789"
                                style={{ width: '100%', padding: '12px', border: '1px solid var(--v2-outline)', borderRadius: '4px', background: 'white', fontSize: '14px' }} 
                              />
                            </div>

                            <div style={{ minHeight: '24px' }}>
                              {resolvingBank && (
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--v2-text-variant)', fontSize: '13px' }}>
                                  <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
                                  Resolving account name...
                                </div>
                              )}
                              
                              {resolveError && !resolvingBank && (
                                <div style={{ color: 'red', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>error</span>
                                  {resolveError}
                                </div>
                              )}

                              {resolvedName && !resolvingBank && (
                                <div style={{ color: '#096c4b', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>verified</span> 
                                  Account Name: {resolvedName}
                                </div>
                              )}
                            </div>
                          </div>
                          <button type="submit" disabled={loading || !resolvedName} className="v2-btn-primary" style={{ width: '100%', justifyContent: 'center', background: 'var(--v2-accent, #fed65b)', color: '#241a00', border: 'none', borderRadius: '4px', padding: '12px', fontSize: '14px', fontWeight: 600, cursor: (loading || !resolvedName) ? 'not-allowed' : 'pointer', opacity: (loading || !resolvedName) ? 0.5 : 1 }}>
                            {loading ? 'Saving...' : 'Save Bank Details'}
                          </button>
                        </form>
                      </div>
                    )}

                    {step.id === 'tier' && (
                      <div style={{ background: 'white', padding: '24px', borderRadius: '8px', border: '1px solid var(--v2-outline)' }}>
                        <form onSubmit={saveTier}>
                          {tierStep === 1 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Tier Name</label>
                                <input required value={tierName} onChange={e => setTierName(e.target.value)} placeholder="e.g. Super Fan" style={{ width: '100%', padding: '12px', border: '1px solid var(--v2-outline)', borderRadius: '4px', background: 'white', fontSize: '14px' }} />
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Description</label>
                                <textarea required value={tierDesc} onChange={e => setTierDesc(e.target.value)} rows={3} style={{ width: '100%', padding: '12px', border: '1px solid var(--v2-outline)', borderRadius: '4px', background: 'white', fontSize: '14px' }} />
                              </div>
                              <button type="button" onClick={() => setTierStep(2)} className="v2-btn-primary" style={{ width: '100%', justifyContent: 'center', background: 'var(--v2-accent, #fed65b)', color: '#241a00', border: 'none', borderRadius: '4px', padding: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                                Next
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Price (in Naira)</label>
                                <input type="number" required min="100" step="100" value={tierPrice} onChange={e => setTierPrice(e.target.value)} placeholder="5000" style={{ width: '100%', padding: '12px', border: '1px solid var(--v2-outline)', borderRadius: '4px', background: 'white', fontSize: '14px' }} />
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Perks (One per line)</label>
                                <textarea 
                                  value={tierPerksText} 
                                  onChange={e => setTierPerksText(e.target.value)} 
                                  rows={4} 
                                  style={{ width: '100%', padding: '12px', border: '1px solid var(--v2-outline)', borderRadius: '4px', background: 'white', fontSize: '14px' }} 
                                />
                              </div>
                              <div style={{ display: 'flex', gap: '12px' }}>
                                <button type="button" onClick={() => setTierStep(1)} className="v2-btn-outline" style={{ flex: 1, justifyContent: 'center', border: '1px solid var(--v2-outline)', borderRadius: '4px', padding: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', background: 'white', color: 'var(--v2-primary)' }}>
                                  Back
                                </button>
                                <button type="submit" disabled={loading} className="v2-btn-primary" style={{ flex: 1, justifyContent: 'center', background: 'var(--v2-accent, #fed65b)', color: '#241a00', border: 'none', borderRadius: '4px', padding: '12px', fontSize: '14px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}>
                                  {loading ? 'Saving...' : 'Finish'}
                                </button>
                              </div>
                            </div>
                          )}
                        </form>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
