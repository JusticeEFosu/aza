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
    if (selectedTiers.includes(tierId)) {
      setSelectedTiers(selectedTiers.filter(id => id !== tierId));
    } else {
      setSelectedTiers([...selectedTiers, tierId]);
    }
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

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {error && (
        <div style={{ padding: '16px', backgroundColor: 'rgba(255,59,48,0.1)', color: '#ff3b30', borderRadius: '12px', fontSize: '15px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-outlined">error</span>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ fontSize: '15px', fontWeight: 600, color: 'var(--v2-text)' }}>Group Chat Name</label>
        <input
          type="text"
          placeholder="e.g. The VIP Inner Circle"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{
            width: '100%',
            padding: '16px 20px',
            borderRadius: '12px',
            border: '2px solid var(--v2-outline)',
            fontSize: '16px',
            backgroundColor: 'var(--v2-surface)',
            color: 'var(--v2-text)',
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => e.target.style.borderColor = 'var(--v2-primary)'}
          onBlur={(e) => e.target.style.borderColor = 'var(--v2-outline)'}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ fontSize: '15px', fontWeight: 600, color: 'var(--v2-text)' }}>Allowed Subscription Tiers</label>
          <p style={{ fontSize: '14px', color: 'var(--v2-text-variant)', marginTop: '4px' }}>
            Only fans with an active subscription to one of the selected tiers will be able to view and message in this chat.
          </p>
        </div>

        {tiers.length === 0 ? (
          <div style={{ padding: '24px', backgroundColor: 'var(--v2-surface-highest)', borderRadius: '16px', fontSize: '15px', color: 'var(--v2-text-variant)', textAlign: 'center', border: '1px solid var(--v2-outline)' }}>
            You don&apos;t have any active subscription tiers yet. Create a tier first to start a group chat.
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
            gap: '16px' 
          }}>
            {tiers.map((tier) => {
              const isSelected = selectedTiers.includes(tier.id);
              return (
                <div 
                  key={tier.id} 
                  onClick={() => toggleTier(tier.id)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '20px', 
                    padding: '20px', 
                    border: isSelected ? '2px solid var(--v2-primary)' : '2px solid var(--v2-outline)', 
                    borderRadius: '16px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'rgba(var(--v2-primary-rgb, 0,0,0), 0.02)' : 'var(--v2-surface)',
                    boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.2s ease',
                    transform: isSelected ? 'scale(1.01)' : 'scale(1)'
                  }}
                >
                  <div style={{ 
                    width: '28px', 
                    height: '28px', 
                    borderRadius: '50%', 
                    border: isSelected ? 'none' : '2px solid var(--v2-outline)',
                    backgroundColor: isSelected ? 'var(--v2-primary)' : 'transparent',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.2s ease'
                  }}>
                    {isSelected && <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '18px', fontWeight: 700 }}>check</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '16px', color: 'var(--v2-text)', marginBottom: '4px' }}>{tier.name}</div>
                    <div style={{ fontSize: '14px', color: 'var(--v2-text-variant)', fontWeight: 500 }}>₦{(tier.amount / 100).toLocaleString()} / month</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
        disabled={isLoading || tiers.length === 0}
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
