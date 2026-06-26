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
    <div className="glass-card" style={{ marginBottom: '2.5rem', border: '1px solid var(--accent-primary)', position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        height: '4px',
        background: 'var(--accent-primary)',
        width: `${progressPercent}%`,
        transition: 'width 0.5s ease'
      }} />

      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Complete Your Setup</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.938rem' }}>
          Finish these {steps.length} steps to start earning and sharing with fans.
          <span style={{ marginLeft: '0.5rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
            {completedCount}/{steps.length} Done
          </span>
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        {steps.map((step) => (
          <Link 
            key={step.id}
            href={step.href}
            style={{
              textDecoration: 'none',
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              background: step.completed ? 'rgba(34, 197, 94, 0.05)' : 'var(--bg-secondary)',
              border: `1px solid ${step.completed ? 'rgba(34, 197, 94, 0.2)' : 'var(--border-color)'}`,
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ 
                fontSize: '1.25rem',
                opacity: step.completed ? 1 : 0.4
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  {step.completed ? 'check_circle' : 'radio_button_unchecked'}
                </span>
              </span>
              <span style={{ 
                fontSize: '0.75rem', 
                fontWeight: 600, 
                color: step.completed ? 'var(--success)' : 'var(--text-muted)',
                textTransform: 'uppercase'
              }}>
                {step.completed ? 'Completed' : 'Pending'}
              </span>
            </div>
            <div>
              <h4 style={{ 
                margin: 0, 
                color: step.completed ? 'var(--text-secondary)' : 'var(--text-primary)',
                textDecoration: step.completed ? 'line-through' : 'none'
              }}>
                {step.title}
              </h4>
              <p style={{ 
                margin: '0.25rem 0 0', 
                fontSize: '0.813rem', 
                color: 'var(--text-muted)',
                lineHeight: 1.4
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
