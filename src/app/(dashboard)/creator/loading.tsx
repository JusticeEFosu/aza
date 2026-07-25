import React from 'react';

export default function CreatorDashboardLoading() {
  return (
    <main style={{ padding: '24px 16px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      <header className="v2-dash-header animate-pulse" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ height: '38px', width: '180px', backgroundColor: '#e2e8f0', borderRadius: '8px', marginBottom: '8px' }}></div>
          <div style={{ height: '20px', width: '300px', backgroundColor: '#e2e8f0', borderRadius: '8px' }}></div>
        </div>
      </header>

      {/* Setup Widget Skeleton */}
      <div className="animate-pulse" style={{ width: '100%', height: '160px', backgroundColor: '#e2e8f0', borderRadius: '16px', marginBottom: '32px' }}></div>

      {/* Stats Grid Skeleton */}
      <div className="v2-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="animate-pulse" style={{ height: '140px', backgroundColor: '#e2e8f0', borderRadius: '12px' }}></div>
        <div className="animate-pulse" style={{ height: '350px', backgroundColor: '#e2e8f0', borderRadius: '12px' }}></div>
        <div className="animate-pulse" style={{ height: '140px', backgroundColor: '#e2e8f0', borderRadius: '12px' }}></div>
      </div>

      {/* Recent Activity Skeleton */}
      <div className="animate-pulse" style={{ width: '100%', height: '400px', backgroundColor: '#e2e8f0', borderRadius: '16px' }}></div>
    </main>
  );
}
