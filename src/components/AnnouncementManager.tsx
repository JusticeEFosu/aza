'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AnnouncementManager({ initialAnnouncement }: { initialAnnouncement: any }) {
  const [message, setMessage] = useState(initialAnnouncement?.message || '');
  const [isActive, setIsActive] = useState(initialAnnouncement?.is_active || false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, isActive }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        alert('Failed to update announcement');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred');
    }
    setLoading(false);
  };

  return (
    <div style={{ background: 'var(--v2-surface)', border: '1px solid var(--v2-outline)', borderRadius: '16px', overflow: 'hidden', marginBottom: '32px' }}>
      <div style={{ padding: '24px', borderBottom: '1px solid var(--v2-outline)', background: 'var(--v2-surface-lowest)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--v2-primary)', marginBottom: '4px' }}>Global Announcement</h2>
          <p style={{ color: 'var(--v2-text-variant)', fontSize: '14px', margin: 0 }}>Display a persistent banner at the top of the entire platform.</p>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input 
            type="checkbox" 
            checked={isActive} 
            onChange={(e) => setIsActive(e.target.checked)} 
            style={{ width: '18px', height: '18px', accentColor: 'var(--v2-primary)' }}
          />
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--v2-primary)' }}>Banner Active</span>
        </label>
      </div>
      
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="E.g., Scheduled maintenance tonight at 2AM WAT"
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid var(--v2-outline)',
              background: 'var(--v2-surface-lowest)',
              color: 'var(--v2-text)',
              fontSize: '15px'
            }}
          />
          <button 
            onClick={handleSave} 
            disabled={loading}
            className="v2-btn v2-btn-primary" 
            style={{ padding: '12px 24px' }}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
