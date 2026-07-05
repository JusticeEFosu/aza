'use client';

import { useState } from 'react';

export default function ReportPostButton({ postId }: { postId: string }) {
  const [loading, setLoading] = useState(false);
  const [reported, setReported] = useState(false);

  const handleReport = async () => {
    const reason = prompt('Why are you reporting this post? (e.g., Spam, Inappropriate, Broken)');
    if (!reason) return;

    setLoading(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, reason })
      });

      if (res.ok) {
        setReported(true);
        alert('Report submitted successfully to the moderation team.');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to submit report');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred');
    }
    setLoading(false);
  }

  if (reported) {
    return <span style={{ fontSize: '12px', color: 'var(--v2-text-variant)', display: 'flex', alignItems: 'center', gap: '4px' }}><span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check_circle</span> Reported</span>;
  }

  return (
    <button 
      onClick={handleReport} 
      disabled={loading}
      style={{ 
        background: 'transparent', 
        border: 'none', 
        color: 'var(--v2-text-variant)', 
        fontSize: '12px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '4px', 
        cursor: 'pointer',
        padding: 0,
        opacity: loading ? 0.5 : 1
      }}
      title="Report Post"
    >
      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>flag</span>
      Report
    </button>
  );
}
