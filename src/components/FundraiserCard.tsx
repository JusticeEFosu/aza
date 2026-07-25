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
    <div id={fundraiser.id} className="az-card" style={{ padding: '32px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <div style={{ flex: 1, minWidth: '260px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--az-primary)', letterSpacing: '0.05em', textTransform: 'uppercase', background: 'var(--az-surface-low)', padding: '4px 10px', borderRadius: '4px', display: 'inline-block', marginBottom: '12px' }}>
            Fundraiser Goal
          </span>
          <h2 className="az-h2" style={{ marginBottom: '8px', fontSize: '24px' }}>{fundraiser.title}</h2>
          <p className="az-body" style={{ color: 'var(--az-text-muted)', fontSize: '15px' }}>{fundraiser.description}</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="az-btn-primary"
          style={{ padding: '12px 32px', fontSize: '16px' }}
        >
          Contribute
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
          <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--az-primary)' }}>
            ₦{currentAmount.toLocaleString()} <span style={{ color: 'var(--az-text-muted)', fontSize: '14px', fontWeight: 500 }}>raised</span>
          </span>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--az-text-muted)' }}>
            Goal: ₦{targetAmount.toLocaleString()}
          </span>
        </div>
        <div style={{ height: '12px', background: 'var(--az-surface-low)', borderRadius: '9999px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'var(--az-primary)', borderRadius: '9999px', transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
        </div>
      </div>

      {fundraiser.show_leaderboard && donations && donations.length > 0 && (
        <div style={{ marginTop: '32px', borderTop: '1px solid var(--az-border)', paddingTop: '24px' }}>
          <h3 className="az-label" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--az-text-main)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Top Supporters
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {donations.map((d, index) => {
              let badgeBg = 'var(--az-surface-low)';
              let badgeColor = 'var(--az-primary)';
              if (index === 0) { badgeBg = '#fed65b'; badgeColor = '#745c00'; } // Gold
              if (index === 1) { badgeBg = '#e2e8f0'; badgeColor = '#334155'; } // Silver
              if (index === 2) { badgeBg = '#ffdad6'; badgeColor = '#904340'; } // Bronze

              return (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: 'var(--az-radius-lg)', background: '#ffffff', border: '1px solid var(--az-border)' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: badgeBg, color: badgeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px' }}>
                    #{index + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p className="az-body" style={{ margin: 0, fontWeight: 600, fontSize: '14px' }}>
                      {d.donor_name || 'Guest'} <span style={{ color: 'var(--az-primary)', fontWeight: 700 }}>donated ₦{(d.amount / 100).toLocaleString()}</span>
                    </p>
                    {d.donor_note && (
                      <p style={{ margin: '2px 0 0 0', color: 'var(--az-text-muted)', fontSize: '13px', fontStyle: 'italic' }}>"{d.donor_note}"</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
