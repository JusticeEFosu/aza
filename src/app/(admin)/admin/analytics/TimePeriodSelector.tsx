'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const PERIODS = [
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' },
  { label: 'All Time', value: 'all' },
];

export default function TimePeriodSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get('period') || '30d';

  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {PERIODS.map(p => {
        const isActive = current === p.value;
        return (
          <button
            key={p.value}
            onClick={() => router.push(`/admin/analytics?period=${p.value}`)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: isActive ? '2px solid #004e34' : '1px solid #E2E8F0',
              background: isActive ? '#004e34' : '#ffffff',
              color: isActive ? '#ffffff' : '#3f4943',
              fontSize: '13px',
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
  );
}
