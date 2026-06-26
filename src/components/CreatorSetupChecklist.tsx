'use client';

import Link from 'next/link';

interface CreatorSetupChecklistProps {
  steps: {
    id: string;
    title: string;
    description: string;
    href: string;
    completed: boolean;
  }[];
}

export default function CreatorSetupChecklist({ steps }: CreatorSetupChecklistProps) {
  const completedCount = steps.filter(s => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);
  const isFinished = completedCount === steps.length;

  if (isFinished) return null;

  return (
    <div style={{ 
      background: 'var(--v2-surface-lowest)', 
      borderRadius: '12px', 
      border: '1px solid var(--v2-outline)', 
      marginBottom: '32px', 
      position: 'relative', 
      overflow: 'hidden',
      boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        height: '4px',
        background: 'var(--v2-primary)',
        width: `${progressPercent}%`,
        transition: 'width 0.5s ease'
      }} />

      <div style={{ padding: '24px', borderBottom: '1px solid var(--v2-outline)' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--v2-primary)' }}>Complete Your Setup</h2>
        <p style={{ color: 'var(--v2-text-variant)', fontSize: '14px', margin: 0 }}>
          Finish these {steps.length} steps to start earning.
          <span style={{ marginLeft: '12px', fontWeight: 700, color: 'var(--v2-primary)' }}>
            {completedCount}/{steps.length} Done
          </span>
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0' }}>
        {steps.map((step, index) => (
          <Link 
            key={step.id}
            href={step.href}
            style={{
              textDecoration: 'none',
              padding: '24px',
              background: step.completed ? 'var(--v2-surface-bright, #f8f9ff)' : 'transparent',
              borderRight: index < steps.length - 1 ? '1px solid var(--v2-outline)' : 'none',
              borderBottom: 'none',
              transition: 'background 0.2s',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              if (!step.completed) e.currentTarget.style.background = 'var(--v2-surface-low)';
            }}
            onMouseLeave={(e) => {
              if (!step.completed) e.currentTarget.style.background = 'transparent';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ 
                color: step.completed ? 'var(--v2-green)' : 'var(--v2-text-variant)',
                display: 'flex',
                alignItems: 'center'
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                  {step.completed ? 'check_circle' : 'radio_button_unchecked'}
                </span>
              </span>
              <span style={{ 
                fontSize: '12px', 
                fontWeight: 700, 
                color: step.completed ? 'var(--v2-green)' : 'var(--v2-text-variant)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                {step.completed ? 'Completed' : 'Pending'}
              </span>
            </div>
            <div>
              <h4 style={{ 
                margin: '0 0 6px 0', 
                fontSize: '16px',
                fontWeight: 600,
                color: step.completed ? 'var(--v2-primary)' : 'var(--v2-primary)',
                textDecoration: step.completed ? 'line-through' : 'none',
                opacity: step.completed ? 0.6 : 1
              }}>
                {step.title}
              </h4>
              <p style={{ 
                margin: 0, 
                fontSize: '14px', 
                color: 'var(--v2-text-variant)',
                lineHeight: 1.5,
                opacity: step.completed ? 0.6 : 1
              }}>
                {step.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
