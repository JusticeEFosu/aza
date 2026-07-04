'use client';

export default function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel', 
  isDestructive = false 
}: {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: 'var(--v2-surface-lowest)', borderRadius: '16px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '24px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px 0', color: isDestructive ? '#dc2626' : 'var(--v2-primary)' }}>{title}</h3>
        <p style={{ fontSize: '15px', color: 'var(--v2-text-variant)', margin: '0 0 24px 0', lineHeight: 1.5 }}>{message}</p>
        
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button 
            type="button" 
            onClick={onCancel} 
            style={{ padding: '10px 16px', background: 'transparent', border: '1px solid var(--v2-outline)', borderRadius: '8px', fontWeight: 600, color: 'var(--v2-text-variant)', cursor: 'pointer' }}
          >
            {cancelText}
          </button>
          <button 
            type="button" 
            onClick={onConfirm} 
            style={{ padding: '10px 16px', background: isDestructive ? '#dc2626' : 'var(--v2-primary)', border: 'none', borderRadius: '8px', fontWeight: 600, color: 'white', cursor: 'pointer' }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
