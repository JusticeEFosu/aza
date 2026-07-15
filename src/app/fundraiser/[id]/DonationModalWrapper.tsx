'use client';

import { useState } from 'react';
import DonationModal from '@/components/DonationModal';

export default function DonationModalWrapper({ 
  creatorId, 
  fundraiserId, 
  title 
}: { 
  creatorId: string, 
  fundraiserId: string, 
  title: string 
}) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button 
        onClick={() => setShowModal(true)}
        className="v2-btn v2-btn-primary"
        style={{ width: '100%', padding: '20px', fontSize: '18px', borderRadius: '16px', boxShadow: '0 8px 16px rgba(34, 197, 94, 0.2)' }}
      >
        Contribute to Goal
      </button>

      {showModal && (
        <DonationModal
          creatorId={creatorId}
          fundraiserId={fundraiserId}
          title={title}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
