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
  description?: string;
  perks?: string[];
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
  const [showTiers, setShowTiers] = useState(false);
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
    <div>
      {/* Current Subscription Card */}
      <div className="glass-card" style={{ 
        padding: '2rem', 
        marginBottom: '1.5rem',
        border: '1px solid rgba(212, 175, 55, 0.3)',
        background: 'rgba(212, 175, 55, 0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-primary)', fontWeight: 600, marginBottom: '0.5rem' }}>
              Your Current Plan
            </p>
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>{currentTierName}</h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              ₦{(currentTierAmount / 100).toLocaleString()}<span style={{ fontSize: '0.875rem', fontWeight: 400, color: 'var(--text-muted)' }}>/mo</span>
            </p>
          </div>
          <span style={{
            fontSize: '0.75rem',
            padding: '0.375rem 0.75rem',
            borderRadius: '1rem',
            background: 'rgba(34, 197, 94, 0.1)',
            color: 'var(--success)',
            fontWeight: 600,
            border: '1px solid rgba(34, 197, 94, 0.2)'
          }}>
            Active
          </span>
        </div>

        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Renews on {new Date(renewalDate).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {(higherTiers.length > 0 || lowerTiers.length > 0) && (
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => setShowTiers(!showTiers)}
            >
              {showTiers ? 'Hide Plans' : 'Change Plan'}
            </button>
          )}
          <button 
            className="btn btn-secondary btn-sm"
            onClick={handleCancel}
            disabled={cancelling}
            style={{ 
              color: 'var(--danger)', 
              borderColor: 'rgba(239, 68, 68, 0.3)',
              backgroundColor: 'rgba(239, 68, 68, 0.05)'
            }}
          >
            {cancelling ? <span className="spinner" /> : 'Cancel Subscription'}
          </button>
        </div>

        {error && <p className="form-error" style={{ marginTop: '0.75rem' }}>{error}</p>}
      </div>

      {/* Upgrade/Downgrade Tiers */}
      {showTiers && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {higherTiers.length > 0 && (
            <>
              <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Upgrade
              </p>
              {higherTiers.map(tier => (
                <div key={tier.id} className="glass-card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: 0 }}>{tier.name}</h4>
                    <p style={{ margin: '0.25rem 0 0', fontWeight: 600, color: 'var(--accent-primary)' }}>
                      ₦{(tier.amount / 100).toLocaleString()}/mo
                    </p>
                  </div>
                  <div style={{ minWidth: '120px' }}>
                    <SubscribeButton tierId={tier.id} planCode={tier.paystack_plan_code} />
                  </div>
                </div>
              ))}
            </>
          )}

          {lowerTiers.length > 0 && (
            <>
              <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.5rem' }}>
                Downgrade
              </p>
              {lowerTiers.map(tier => (
                <div key={tier.id} className="glass-card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: 0 }}>{tier.name}</h4>
                    <p style={{ margin: '0.25rem 0 0', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      ₦{(tier.amount / 100).toLocaleString()}/mo
                    </p>
                  </div>
                  <div style={{ minWidth: '120px' }}>
                    <SubscribeButton tierId={tier.id} planCode={tier.paystack_plan_code} />
                  </div>
                </div>
              ))}
            </>
          )}
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
