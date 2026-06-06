'use client';

import { useState } from 'react';

export default function ShareButton({ url, username }: { url: string, username: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Support ${username} on Aza`,
          text: `Subscribe to my tiers on Aza for exclusive perks and content!`,
          url: url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  return (
    <button onClick={handleShare} className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }}>
      {copied ? '✅ Link Copied!' : '📤 Share Profile'}
    </button>
  );
}
