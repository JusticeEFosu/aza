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
    <>
      <style>{`
        .glass-pill-btn {
          background: rgba(var(--v2-primary-rgb, 0, 0, 0), 0.05);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(var(--v2-primary-rgb, 0, 0, 0), 0.1);
          border-radius: 9999px;
          padding: 8px 20px;
          color: var(--v2-primary, #000);
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
        }
        
        .glass-pill-btn:hover:not(:disabled) {
          background: rgba(var(--v2-primary-rgb, 0, 0, 0), 0.08);
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(var(--v2-primary-rgb, 0, 0, 0), 0.15);
        }
        
        .glass-pill-btn:active:not(:disabled) {
          transform: translateY(0) scale(0.98);
        }
        
        .glass-pill-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Dark mode support if Aza uses it */
        @media (prefers-color-scheme: dark) {
          .glass-pill-btn {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #fff;
          }
          .glass-pill-btn:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.25);
          }
        }
      `}</style>
      <button 
        onClick={handleMessage}
        disabled={isLoading}
        className="glass-pill-btn" 
        title={`Message ${creatorName}`}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
          {isLoading ? 'hourglass_empty' : 'mail'}
        </span>
        {isLoading ? 'Opening...' : 'Message'}
      </button>
    </>
  );
}
