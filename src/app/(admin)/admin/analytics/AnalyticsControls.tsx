'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const TABS = [
  { id: 'growth', label: 'Growth' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'creators', label: 'Creators' },
];

const PERIODS = [
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
  { label: 'All', value: 'all' },
];

export default function AnalyticsControls() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'growth';
  const currentPeriod = searchParams.get('period') || '30d';

  const navigate = (tab: string, period: string) => {
    router.push(`/admin/analytics?tab=${tab}&period=${period}`);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', background: '#f1f5f9', borderRadius: '8px', padding: '3px' }}>
        {TABS.map(tab => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.id, currentPeriod)}
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                border: 'none',
                background: isActive ? '#ffffff' : 'transparent',
                color: isActive ? '#0b1c30' : '#6f7a72',
                fontSize: '13px',
                fontWeight: 600,
                fontFamily: 'var(--font-body, Inter, sans-serif)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Period selector */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {PERIODS.map(p => {
          const isActive = currentPeriod === p.value;
          return (
            <button
              key={p.value}
              onClick={() => navigate(currentTab, p.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: isActive ? '1px solid #004e34' : '1px solid #E2E8F0',
                background: isActive ? '#004e34' : '#ffffff',
                color: isActive ? '#ffffff' : '#6f7a72',
                fontSize: '12px',
                fontWeight: 600,
                fontFamily: 'var(--font-body, Inter, sans-serif)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
