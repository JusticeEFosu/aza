'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function InitiateMessageButton({ 
  creatorId, 
  creatorName 
}: { 
  creatorId: string, 
  creatorName: string 
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleMessage = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/messages/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ creator_id: creatorId })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate message');
      }

      // Successfully found or created the channel, redirect to messages UI
      router.push('/messages');
      router.refresh();

    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button 
      onClick={handleMessage}
      disabled={isLoading}
      className="v2-btn" 
      style={{ 
        padding: '8px 16px', 
        fontSize: '14px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        width: 'auto',
        opacity: isLoading ? 0.7 : 1
      }}
      title={`Message ${creatorName}`}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
        {isLoading ? 'hourglass_empty' : 'mail'}
      </span>
      {isLoading ? 'Opening...' : 'Message'}
    </button>
  );
}
