'use client';

import { useState } from 'react';
import Link from 'next/link';

type Fundraiser = {
  id: string;
  title: string;
  target_amount: number | null;
  current_amount: number;
};

export default function ActiveGoalsCard({ fundraisers }: { fundraisers: Fundraiser[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!fundraisers || fundraisers.length === 0) {
    return null;
  }

  const currentGoal = fundraisers[currentIndex] || fundraisers[0];
  const goalTarget = currentGoal.target_amount && currentGoal.target_amount > 0 ? currentGoal.target_amount / 100 : null;
  const hasTarget = goalTarget !== null;
  const goalCurrent = currentGoal.current_amount / 100;
  const goalProgress = goalTarget !== null && goalTarget > 0 ? Math.min(100, Math.round((goalCurrent / goalTarget) * 100)) : 0;
  const isGoalOverFunded = goalTarget !== null && goalCurrent >= goalTarget;

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % fundraisers.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + fundraisers.length) % fundraisers.length);
  };

  return (
    <div className="az-card" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '20px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <p className="az-label" style={{ margin: 0, color: '#3f4943', fontWeight: 600, fontFamily: 'var(--font-body, Inter, sans-serif)' }}>Active Goal</p>
              {fundraisers.length > 1 && (
                <span 
                  style={{ 
                    fontSize: '11px', 
                    fontWeight: 600, 
                    padding: '2px 8px', 
                    borderRadius: '999px', 
                    background: '#eff4ff', 
                    color: '#004e34',
                    fontFamily: 'var(--font-body, Inter, sans-serif)' 
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
                      color: '#3f4943',
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
                      color: '#3f4943',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Next Goal"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_right</span>
                  </button>
                </div>
              )}

              <Link href="/creator/fundraisers" style={{ fontSize: '12px', fontWeight: 600, color: '#004e34', textDecoration: 'none', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
                Manage →
              </Link>
            </div>
          </div>

          <h3 style={{ fontSize: '18px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 600, color: '#0b1c30', margin: '0 0 12px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={currentGoal.title}>
            {currentGoal.title}
          </h3>
          
          {hasTarget && goalTarget !== null ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px', fontSize: '13px', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
                <span style={{ fontWeight: 700, color: '#004e34' }}>₦ {goalCurrent.toLocaleString()}</span>
                <span style={{ color: '#3f4943' }}>of ₦ {goalTarget.toLocaleString()} ({goalProgress}%)</span>
              </div>

              <div style={{ height: '8px', background: '#eff4ff', borderRadius: '999px', overflow: 'hidden' }}>
                <div 
                  style={{
                    height: '100%',
                    width: `${goalProgress}%`,
                    borderRadius: '999px',
                    background: isGoalOverFunded ? 'linear-gradient(90deg, #004e34, #059669)' : '#004e34',
                    transition: 'width 0.5s ease',
                  }}
                />
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
              <div>
                <span style={{ fontWeight: 700, color: '#004e34', fontSize: '15px' }}>₦ {goalCurrent.toLocaleString()}</span>
                <span style={{ color: '#3f4943', fontSize: '12px', marginLeft: '4px' }}>raised</span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#004e34', background: '#eff4ff', padding: '2px 8px', borderRadius: '999px' }}>
                Ongoing Goal
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
