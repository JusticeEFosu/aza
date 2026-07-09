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

    const { error: insertError } = await supabase
      .from('chat_channels')
      .insert({
        creator_id: creatorId,
        name: name.trim(),
        type: 'group_chat',
        allowed_tier_ids: selectedTiers
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
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(255,59,48,0.1)', color: '#ff3b30', borderRadius: '12px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      <div>
        <label className="v2-label">Group Chat Name</label>
        <input
          type="text"
          className="v2-input"
          placeholder="e.g. Gold VIP Lounge"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="v2-label">Allowed Subscription Tiers</label>
        <p style={{ fontSize: '14px', color: 'var(--v2-text-variant)', marginBottom: '12px' }}>
          Only fans with an active subscription to one of the selected tiers will be able to view and message in this chat.
        </p>

        {tiers.length === 0 ? (
          <div style={{ padding: '16px', backgroundColor: 'var(--v2-surface-highest)', borderRadius: '12px', fontSize: '14px', color: 'var(--v2-text-variant)' }}>
            You don&apos;t have any active subscription tiers yet. Create a tier first to start a group chat.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {tiers.map((tier) => (
              <label 
                key={tier.id} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  padding: '16px', 
                  border: '1px solid var(--v2-outline)', 
                  borderRadius: '12px',
                  cursor: 'pointer',
                  backgroundColor: selectedTiers.includes(tier.id) ? 'var(--v2-surface-highest)' : 'transparent'
                }}
              >
                <input 
                  type="checkbox" 
                  checked={selectedTiers.includes(tier.id)}
                  onChange={() => toggleTier(tier.id)}
                  style={{ width: '20px', height: '20px', accentColor: 'var(--v2-primary)' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{tier.name}</div>
                  <div style={{ fontSize: '14px', color: 'var(--v2-text-variant)' }}>₦{(tier.amount / 100).toLocaleString()} / month</div>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      <button 
        type="submit" 
        className="v2-btn" 
        style={{ marginTop: '16px' }}
        disabled={isLoading || tiers.length === 0}
      >
        {isLoading ? 'Creating...' : 'Create Group Chat'}
      </button>
    </form>
  );
}
