'use client';

import { useState } from 'react';
import DonationModal from './DonationModal';

export default function TipButton({ creatorId, creatorName }: { creatorId: string, creatorName: string }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button 
        onClick={() => setShowModal(true)}
        className="v2-btn v2-btn-primary"
        style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>volunteer_activism</span>
        Tip {creatorName}
      </button>
      
      {showModal && (
        <DonationModal
          creatorId={creatorId}
          title={`Support ${creatorName}`}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
