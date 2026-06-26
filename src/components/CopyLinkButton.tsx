'use client';
import { useState } from 'react';

export default function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button 
      className="btn btn-primary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch (err) {
          console.error(err);
        }
      }}
    >
      {copied ? 'Copied!' : 'Copy Link'}
    </button>
  );
}
