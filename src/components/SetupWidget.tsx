'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface SetupWidgetProps {
  userId: string;
  hasProfile: boolean; // avatar and bio
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

  // Form states
  const [bankAccount, setBankAccount] = useState('');
  const [bankCode, setBankCode] = useState('');
  
  const [tierName, setTierName] = useState('');
  const [tierPrice, setTierPrice] = useState('');
  const [tierDesc, setTierDesc] = useState('');
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
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to setup payouts');
      }
      
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
    try {
      const { error } = await supabase.from('tiers').insert({
        creator_id: userId,
        name: tierName,
        description: tierDesc,
        amount: parseInt(tierPrice) * 100, // convert Naira to kobo
        is_active: true
      });
      if (error) throw error;
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

      {/* Modals */}
      {activeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '32px', borderRadius: '8px', width: '100%', maxWidth: '500px', position: 'relative' }}>
            <button onClick={() => setActiveModal(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer' }}>
              <span className="material-symbols-outlined">close</span>
            </button>

            {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}

            {activeModal === 'profile' && (
              <div>
                <h3 style={{ fontSize: '24px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, marginBottom: '16px' }}>Complete Profile</h3>
                <p style={{ color: 'var(--v2-text-variant)', marginBottom: '24px' }}>Upload your avatar and banner. (Connecting social links is optional).</p>
                {/* Simplified for now, just a redirect to settings for complex file uploads */}
                <button onClick={() => router.push('/creator/settings')} className="v2-btn-primary" style={{ width: '100%', justifyContent: 'center', background: 'var(--v2-accent, #fed65b)', color: '#241a00' }}>
                  Go to Settings
                </button>
              </div>
            )}

            {activeModal === 'bank' && (
              <form onSubmit={saveBank}>
                <h3 style={{ fontSize: '24px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, marginBottom: '16px' }}>Set up Payouts</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Bank Code (e.g. 058 for GTB)</label>
                    <input required value={bankCode} onChange={e => setBankCode(e.target.value)} style={{ width: '100%', padding: '12px', border: '1px solid var(--v2-outline)', borderRadius: '4px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Account Number</label>
                    <input required value={bankAccount} onChange={e => setBankAccount(e.target.value)} style={{ width: '100%', padding: '12px', border: '1px solid var(--v2-outline)', borderRadius: '4px' }} />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="v2-btn-primary" style={{ width: '100%', justifyContent: 'center', background: 'var(--v2-accent, #fed65b)', color: '#241a00' }}>
                  {loading ? 'Saving...' : 'Save Bank Details'}
                </button>
              </form>
            )}

            {activeModal === 'tier' && (
              <form onSubmit={saveTier}>
                <h3 style={{ fontSize: '24px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, marginBottom: '16px' }}>
                  Create Tier (Step {tierStep} of 2)
                </h3>
                
                {tierStep === 1 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Tier Name</label>
                      <input required value={tierName} onChange={e => setTierName(e.target.value)} placeholder="e.g. Super Fan" style={{ width: '100%', padding: '12px', border: '1px solid var(--v2-outline)', borderRadius: '4px' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Description</label>
                      <textarea required value={tierDesc} onChange={e => setTierDesc(e.target.value)} rows={3} style={{ width: '100%', padding: '12px', border: '1px solid var(--v2-outline)', borderRadius: '4px' }} />
                    </div>
                    <button type="button" onClick={() => setTierStep(2)} className="v2-btn-primary" style={{ width: '100%', justifyContent: 'center', background: 'var(--v2-accent, #fed65b)', color: '#241a00' }}>
                      Next
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Price (in Naira)</label>
                      <input type="number" required value={tierPrice} onChange={e => setTierPrice(e.target.value)} placeholder="5000" style={{ width: '100%', padding: '12px', border: '1px solid var(--v2-outline)', borderRadius: '4px' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button type="button" onClick={() => setTierStep(1)} className="v2-btn-outline" style={{ flex: 1, justifyContent: 'center' }}>
                        Back
                      </button>
                      <button type="submit" disabled={loading} className="v2-btn-primary" style={{ flex: 1, justifyContent: 'center', background: 'var(--v2-accent, #fed65b)', color: '#241a00' }}>
                        {loading ? 'Saving...' : 'Finish'}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
