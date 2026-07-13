'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function CreateGroupChatForm({ 
  creatorId, 
  tiers 
}: { 
  creatorId: string, 
  tiers: { id: string; name: string; amount: number }[] 
}) {
  const router = useRouter();
  const supabase = createClient();
  
  const [name, setName] = useState('');
  const [selectedTiers, setSelectedTiers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleTier = (tierId: string) => {
    // Only allow one minimum tier to be selected
    setSelectedTiers([tierId]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Group chat name is required');
      return;
    }
    if (selectedTiers.length === 0) {
      setError('You must select at least one subscription tier');
      return;
    }

    setIsLoading(true);
    setError('');

    // Auto-include higher tiers:
    // If they selected a tier (e.g. N1000), anyone on a higher tier (e.g. N5000) should automatically get access.
    const selectedTiersData = tiers.filter(t => selectedTiers.includes(t.id));
    const minSelectedAmount = Math.min(...selectedTiersData.map(t => t.amount));
    
    // Find all tiers that cost greater than or equal to the lowest selected tier
    const eligibleTierIds = tiers
      .filter(t => t.amount >= minSelectedAmount)
      .map(t => t.id);

    const { error: insertError } = await supabase
      .from('chat_channels')
      .insert({
        creator_id: creatorId,
        name: name.trim(),
        type: 'group_chat',
        allowed_tier_ids: eligibleTierIds
      });

    if (insertError) {
      console.error(insertError);
      setError('Failed to create group chat. Please try again.');
      setIsLoading(false);
    } else {
      router.push('/messages');
      router.refresh();
    }
  };

  // Only show tiers priced at 2500 NGN (250000 kobo) or higher
  const premiumTiers = tiers.filter(t => t.amount >= 250000);

  if (premiumTiers.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', background: 'var(--v2-surface-lowest)', borderRadius: '16px', border: '1px solid var(--v2-outline)', textAlign: 'center' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--v2-primary)', marginBottom: '16px' }}>forum</span>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: 'var(--v2-text)' }}>Community features require a qualifying tier</h2>
        <p style={{ fontSize: '15px', color: 'var(--v2-text-variant)', maxWidth: '400px', marginBottom: '24px', lineHeight: 1.5 }}>
          You must have a tier priced at ₦2,500 or higher to create group chat rooms for your fans.
        </p>
        <button 
          onClick={() => window.location.href = '/creator/settings'}
          className="v2-btn-primary lg"
        >
          Manage Tiers
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {error && (
        <div style={{ padding: '16px', backgroundColor: 'rgba(255,59,48,0.1)', color: '#ff3b30', borderRadius: '12px', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span>
          {error}
        </div>
      )}

      {/* Name Input */}
      <div>
        <label style={{ display: 'block', fontSize: '15px', fontWeight: 600, marginBottom: '8px', color: 'var(--v2-text)' }}>
          Chat Room Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. VIP Backstage Pass"
          required
          style={{ 
            width: '100%', 
            padding: '16px', 
            borderRadius: '12px', 
            border: '2px solid var(--v2-outline)', 
            background: 'var(--v2-surface)', 
            fontSize: '16px',
            color: 'var(--v2-text)',
            outline: 'none',
            transition: 'border-color 0.2s ease',
          }}
          onFocus={(e) => e.target.style.borderColor = 'var(--v2-primary)'}
          onBlur={(e) => e.target.style.borderColor = 'var(--v2-outline)'}
        />
      </div>

      {/* Tier Selection (Premium Cards) */}
      <div>
        <label style={{ display: 'block', fontSize: '15px', fontWeight: 600, marginBottom: '4px', color: 'var(--v2-text)' }}>
          Who can access this chat?
        </label>
        <p style={{ fontSize: '13px', color: 'var(--v2-text-variant)', marginBottom: '16px' }}>
          Select the minimum tier required. Higher tiers are automatically included.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
          {premiumTiers.map((tier) => {
            const isSelected = selectedTiers.includes(tier.id);
            return (
              <label 
                key={tier.id}
                onClick={(e) => {
                  e.preventDefault();
                  toggleTier(tier.id);
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '20px',
                  borderRadius: '16px',
                  border: isSelected ? '2px solid var(--v2-primary)' : '1px solid var(--v2-outline)',
                  background: isSelected ? 'rgba(var(--v2-primary-rgb), 0.05)' : 'var(--v2-surface-lowest)',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
                  transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                  boxShadow: isSelected ? '0 8px 24px -8px rgba(0,0,0,0.1)' : 'none',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={e => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = 'var(--v2-text-variant)';
                    e.currentTarget.style.transform = 'scale(1.01)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = 'var(--v2-outline)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }
                }}
              >
                <input
                  type="radio"
                  name="min_tier"
                  checked={isSelected}
                  readOnly
                  style={{ opacity: 0, position: 'absolute', width: 0, height: 0 }}
                />
                
                {/* Visual Checkmark */}
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: isSelected ? 'var(--v2-primary)' : 'var(--v2-surface)',
                  border: isSelected ? 'none' : '2px solid var(--v2-outline)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  transform: isSelected ? 'scale(1)' : 'scale(0.8)',
                  opacity: isSelected ? 1 : 0.5
                }}>
                  {isSelected && <span className="material-symbols-outlined" style={{ color: 'white', fontSize: '14px', fontWeight: 700 }}>check</span>}
                </div>

                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--v2-text)', paddingRight: '32px', marginBottom: '8px' }}>
                  {tier.name}
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--v2-primary)' }}>
                  ₦{(tier.amount / 100).toLocaleString()}
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--v2-text-variant)' }}>/mo</span>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <button 
        type="submit" 
        className="v2-btn-primary lg" 
        style={{ 
          marginTop: '8px', 
          width: '100%', 
          padding: '16px', 
          fontSize: '16px', 
          fontWeight: 600, 
          borderRadius: '12px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px'
        }}
        disabled={isLoading || premiumTiers.length === 0}
      >
        {isLoading ? (
          <>
            <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>autorenew</span>
            Creating...
          </>
        ) : (
          <>
            <span className="material-symbols-outlined">add_circle</span>
            Create Group Chat
          </>
        )}
      </button>
    </form>
  );
}
