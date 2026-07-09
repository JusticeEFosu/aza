'use client';
import { useState } from 'react';

export default function ProfileMembershipToggle({ children, defaultHidden }: { children: React.ReactNode, defaultHidden: boolean }) {
  const [isOpen, setIsOpen] = useState(!defaultHidden);
  
  if (!defaultHidden) return <>{children}</>;

  return (
    <div style={{ marginBottom: '64px' }}>
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)} 
          className="v2-sub-btn v2-sub-btn-secondary" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>settings</span>
          Manage Membership & Tiers
        </button>
      )}
      {isOpen && (
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setIsOpen(false)} 
            style={{ position: 'absolute', top: 0, right: 0, display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--v2-surface-low)', border: 'none', color: 'var(--v2-text-variant)', cursor: 'pointer', fontWeight: 600, padding: '8px 16px', borderRadius: '99px', zIndex: 10 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
            Hide
          </button>
          {children}
        </div>
      )}
    </div>
  );
}
