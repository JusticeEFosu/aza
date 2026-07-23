'use client';

import { useState } from 'react';
import Link from 'next/link';

type Fundraiser = {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
};

export default function ActiveGoalsCard({ fundraisers }: { fundraisers: Fundraiser[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!fundraisers || fundraisers.length === 0) {
    return null;
  }

  const currentGoal = fundraisers[currentIndex] || fundraisers[0];
  const goalTarget = currentGoal.target_amount / 100;
  const goalCurrent = currentGoal.current_amount / 100;
  const goalProgress = goalTarget > 0 ? Math.min(100, Math.round((goalCurrent / goalTarget) * 100)) : 0;
  const isGoalOverFunded = goalCurrent >= goalTarget && goalTarget > 0;

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % fundraisers.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + fundraisers.length) % fundraisers.length);
  };

  return (
    <div className="v2-stat-card">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <p className="v2-stat-label" style={{ margin: 0 }}>Active Goal</p>
              {fundraisers.length > 1 && (
                <span 
                  style={{ 
                    fontSize: '11px', 
                    fontWeight: 600, 
                    padding: '2px 8px', 
                    borderRadius: '999px', 
                    background: 'var(--v2-surface-low)', 
                    color: 'var(--v2-text-variant)' 
                  }}
                >
                  {currentIndex + 1} of {fundraisers.length}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {fundraisers.length > 1 && (
                <div style={{ display: 'flex', gap: '2px' }}>
                  <button
                    type="button"
                    onClick={handlePrev}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px',
                      color: 'var(--v2-text-variant)',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Previous Goal"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_left</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px',
                      color: 'var(--v2-text-variant)',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Next Goal"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_right</span>
                  </button>
                </div>
              )}

              <Link href="/creator/fundraisers" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-green)', textDecoration: 'none' }}>
                Manage →
              </Link>
            </div>
          </div>

          <h3 className="v2-stat-value" style={{ fontSize: '18px', margin: '0 0 12px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={currentGoal.title}>
            {currentGoal.title}
          </h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px', fontSize: '13px' }}>
            <span style={{ fontWeight: 700, color: 'var(--v2-primary)' }}>₦ {goalCurrent.toLocaleString()}</span>
            <span style={{ color: 'var(--v2-text-variant)' }}>of ₦ {goalTarget.toLocaleString()} ({goalProgress}%)</span>
          </div>

          <div style={{ height: '6px', background: 'var(--v2-surface-low)', borderRadius: '999px', overflow: 'hidden' }}>
            <div 
              style={{
                height: '100%',
                width: `${goalProgress}%`,
                borderRadius: '999px',
                background: isGoalOverFunded ? 'linear-gradient(90deg, var(--v2-green), #10b981)' : 'var(--v2-green)',
                transition: 'width 0.5s ease',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
