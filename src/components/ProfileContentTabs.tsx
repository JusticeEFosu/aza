'use client';
import { useState, useEffect } from 'react';

export default function ProfileContentTabs({ 
  membershipContent, 
  postsContent, 
  defaultTab = 'posts' 
}: { 
  membershipContent: React.ReactNode, 
  postsContent: React.ReactNode,
  defaultTab?: 'posts' | 'membership'
}) {
  const [activeTab, setActiveTab] = useState<'posts' | 'membership'>(defaultTab);

  // Listen to hash changes so if a user clicks a link with #tiers, it switches to the membership tab
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#tiers') {
        setActiveTab('membership');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    // Check initial hash
    if (window.location.hash === '#tiers') {
      setActiveTab('membership');
    }
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <div style={{ marginTop: '32px' }}>
      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid var(--v2-outline)', marginBottom: '40px' }}>
        <button 
          onClick={() => setActiveTab('posts')}
          style={{ 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'posts' ? '2px solid var(--v2-primary)' : '2px solid transparent',
            color: activeTab === 'posts' ? 'var(--v2-primary)' : 'var(--v2-text-variant)',
            fontWeight: 600,
            fontSize: '16px',
            padding: '12px 0',
            cursor: 'pointer',
            transition: 'all 0.2s',
            outline: 'none'
          }}
        >
          Posts
        </button>
        <button 
          onClick={() => setActiveTab('membership')}
          style={{ 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'membership' ? '2px solid var(--v2-primary)' : '2px solid transparent',
            color: activeTab === 'membership' ? 'var(--v2-primary)' : 'var(--v2-text-variant)',
            fontWeight: 600,
            fontSize: '16px',
            padding: '12px 0',
            cursor: 'pointer',
            transition: 'all 0.2s',
            outline: 'none'
          }}
        >
          Membership & Tiers
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ minHeight: '50vh' }}>
        <div style={{ display: activeTab === 'posts' ? 'block' : 'none' }}>
          {postsContent}
        </div>
        <div style={{ display: activeTab === 'membership' ? 'block' : 'none' }}>
          {membershipContent}
        </div>
      </div>
    </div>
  );
}
