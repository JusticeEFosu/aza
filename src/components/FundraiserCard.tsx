'use client';

import { useState } from 'react';
import DonationModal from './DonationModal';

export default function FundraiserCard({
  fundraiser,
  creatorId,
  donations
}: {
  fundraiser: any;
  creatorId: string;
  donations: any[]; // The top donations to show on the leaderboard
}) {
  const [showModal, setShowModal] = useState(false);

  const targetAmount = fundraiser.target_amount / 100;
  const currentAmount = fundraiser.current_amount / 100;
  const progress = targetAmount > 0 ? Math.min(100, Math.round((currentAmount / targetAmount) * 100)) : 0;

  return (
    <div id={fundraiser.id} style={{ background: 'var(--v2-surface-lowest)', border: '1px solid var(--v2-outline)', borderRadius: '16px', overflow: 'hidden', marginBottom: '24px' }}>
      <div style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-green)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Fundraiser Goal</span>
            <h2 style={{ fontSize: '24px', fontWeight: 600, margin: '0 0 8px 0', color: 'var(--v2-primary)' }}>{fundraiser.title}</h2>
            <p style={{ color: 'var(--v2-text-variant)', margin: 0, fontSize: '15px' }}>{fundraiser.description}</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="v2-btn v2-btn-primary"
            style={{ padding: '12px 32px', fontSize: '16px' }}
          >
            Contribute
          </button>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '16px', fontWeight: 600 }}>
            <span style={{ color: 'var(--v2-primary)' }}>₦{currentAmount.toLocaleString()} <span style={{ color: 'var(--v2-text-variant)', fontSize: '14px', fontWeight: 500 }}>raised</span></span>
            <span style={{ color: 'var(--v2-text-variant)' }}>₦{targetAmount.toLocaleString()}</span>
          </div>
          <div style={{ height: '16px', background: 'var(--v2-surface-container)', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--v2-green)', transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
          </div>
        </div>

        {fundraiser.show_leaderboard && donations && donations.length > 0 && (
          <div style={{ marginTop: '32px', borderTop: '1px solid var(--v2-outline)', paddingTop: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--v2-text-variant)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top Supporters</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {donations.map((d, index) => {
                let badgeColor = 'var(--v2-surface-low)';
                let textColor = 'var(--v2-text-variant)';
                if (index === 0) { badgeColor = 'rgba(234, 179, 8, 0.1)'; textColor = '#ca8a04'; } // Gold
                if (index === 1) { badgeColor = 'rgba(148, 163, 184, 0.1)'; textColor = '#64748b'; } // Silver
                if (index === 2) { badgeColor = 'rgba(180, 83, 9, 0.1)'; textColor = '#92400e'; } // Bronze

                return (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', borderRadius: '12px', background: 'var(--v2-surface-lowest)', border: '1px solid var(--v2-outline)' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: badgeColor, color: textColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '14px' }}>
                      #{index + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 600, color: 'var(--v2-primary)', fontSize: '14px' }}>
                        {d.donor_name || 'Guest'} <span style={{ color: 'var(--v2-green)' }}>donated ₦{(d.amount / 100).toLocaleString()}</span>
                      </p>
                      {d.donor_note && (
                        <p style={{ margin: '4px 0 0 0', color: 'var(--v2-text-variant)', fontSize: '13px', fontStyle: 'italic' }}>"{d.donor_note}"</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <DonationModal
          creatorId={creatorId}
          fundraiserId={fundraiser.id}
          title={`Support: ${fundraiser.title}`}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
