'use client';

import { useState } from 'react';

interface ExpandableTextProps {
  text: string;
  maxLength?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function ExpandableText({ text, maxLength = 250, className = '', style = {} }: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text) return null;

  const baseStyle: React.CSSProperties = {
    whiteSpace: 'pre-wrap',
    lineHeight: 1.6,
    margin: 0,
    fontSize: 'inherit',
    ...style
  };

  if (text.length <= maxLength) {
    return <p className={className} style={baseStyle}>{text}</p>;
  }

  const displayText = isExpanded ? text : `${text.substring(0, maxLength)}...`;

  return (
    <div>
      <p className={className} style={baseStyle}>
        {displayText}
      </p>
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--v2-primary)',
          fontWeight: 600,
          padding: '4px 0',
          marginTop: '4px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        {isExpanded ? 'Show Less' : 'Read More'}
      </button>
    </div>
  );
}
