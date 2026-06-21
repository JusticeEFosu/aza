'use client';
import { useState } from 'react';

export default function HeaderShareButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button 
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch (err) {
          console.error(err);
        }
      }}
      className="v2-share-btn"
    >
      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
        {copied ? 'check' : 'share'}
      </span>
      {copied ? 'Copied URL' : 'Share Page'}
    </button>
  );
}
