'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SubscribeButton from './SubscribeButton';
import ConfirmModal from './ConfirmModal';

interface Tier {
  id: string;
  name: string;
  amount: number;
  paystack_plan_code: string | null;
  description?: string | null;
  perks?: string[] | null;
}

interface ManageSubscriptionProps {
  subscriptionId: string;
  currentTierName: string;
  currentTierAmount: number;
  renewalDate: string;
  tiers: Tier[];
  maxFanTierAmount: number;
}

export default function ManageSubscription({
  subscriptionId,
  currentTierName,
  currentTierAmount,
  renewalDate,
  tiers,
  maxFanTierAmount
}: ManageSubscriptionProps) {
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleCancel = async () => {
    setShowCancelModal(true);
  };

  const executeCancel = async () => {
    setCancelling(true);
    setError('');

    try {
      const res = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel');

      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setCancelling(false);
    } finally {
      setShowCancelModal(false);
    }
  };

  const lowerTiers = tiers.filter(t => t.amount < currentTierAmount);
  const higherTiers = tiers.filter(t => t.amount > currentTierAmount);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px', alignItems: 'start' }}>
      
      {/* Left Column: Current Plan */}
      <div style={{ 
        background: 'linear-gradient(135deg, #111 0%, #000 100%)', 
        borderRadius: '24px', 
        padding: '32px', 
        color: '#D4AF37',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 20px 40px -10px rgba(212, 175, 55, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '300px',
        border: '1px solid rgba(212, 175, 55, 0.2)'
      }}>
        {/* Subtle decorative glow */}
        <div style={{ position: 'absolute', top: '-50%', right: '-20%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '48px', position: 'relative', zIndex: 1 }}>
          <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8 }}>
            Current Plan
          </span>
          <span style={{ fontSize: '12px', fontWeight: 600, background: 'rgba(212, 175, 55, 0.1)', padding: '4px 12px', borderRadius: '999px', border: '1px solid rgba(212, 175, 55, 0.3)', color: '#D4AF37' }}>
            Active
          </span>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <h3 style={{ fontSize: '32px', fontWeight: 700, margin: '0 0 8px 0', letterSpacing: '-0.02em', color: '#FFF' }}>{currentTierName}</h3>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '24px' }}>
            <span style={{ fontSize: '24px', fontWeight: 600 }}>₦{(currentTierAmount / 100).toLocaleString()}</span>
            <span style={{ fontSize: '14px', opacity: 0.8 }}>/mo</span>
          </div>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '32px', borderTop: '1px solid rgba(212, 175, 55, 0.2)', position: 'relative', zIndex: 1 }}>
          <p style={{ fontSize: '14px', opacity: 0.8, margin: '0 0 16px 0' }}>
            Renews on {new Date(renewalDate).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <button 
            onClick={handleCancel}
            disabled={cancelling}
            style={{ 
              background: 'none', border: 'none', color: 'rgba(212, 175, 55, 0.6)', 
              fontSize: '14px', fontWeight: 500, padding: 0, cursor: 'pointer',
              textDecoration: 'underline', textUnderlineOffset: '4px', transition: 'color 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.color = '#ff4444'}
            onMouseOut={e => e.currentTarget.style.color = 'rgba(212, 175, 55, 0.6)'}
          >
            {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
          </button>
          {error && <p style={{ color: '#ff4444', fontSize: '14px', margin: '8px 0 0' }}>{error}</p>}
        </div>
      </div>

      {/* Right Column: Other Tiers */}
      {(higherTiers.length > 0 || lowerTiers.length > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--v2-primary)', margin: 0 }}>Available Plans</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[...higherTiers, ...lowerTiers].sort((a, b) => b.amount - a.amount).map(tier => (
              <div key={tier.id} style={{ 
                background: 'var(--v2-surface-low)', 
                border: '1px solid var(--v2-outline)', 
                borderRadius: '16px', 
                padding: '20px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'default'
              }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 20px -10px rgba(0,0,0,0.1)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--v2-primary)' }}>{tier.name}</h4>
                    {tier.amount > currentTierAmount ? (
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--v2-green)', borderRadius: '999px', textTransform: 'uppercase' }}>Upgrade</span>
                    ) : (
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', background: 'var(--v2-outline)', color: 'var(--v2-text-variant)', borderRadius: '999px', textTransform: 'uppercase' }}>Downgrade</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--v2-primary)', letterSpacing: '-0.02em' }}>₦{(tier.amount / 100).toLocaleString()}</span>
                    <span style={{ fontSize: '12px', color: 'var(--v2-text-variant)' }}>/mo</span>
                  </div>
                </div>
                <div style={{ minWidth: '100px' }}>
                  <SubscribeButton tierId={tier.id} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={showCancelModal}
        title="Cancel Subscription"
        message="Are you sure you want to cancel your subscription? You will lose access to exclusive content at the end of your billing cycle."
        confirmText="Cancel Subscription"
        isDestructive={true}
        onConfirm={executeCancel}
        onCancel={() => setShowCancelModal(false)}
      />
    </div>
  );
}
