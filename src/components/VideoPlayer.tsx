'use client';

import { useState, useRef, useEffect } from 'react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function VideoPlayer({ 
  src, 
  poster, 
  className = '', 
  style = {} 
}: VideoPlayerProps) {
  const [hasStarted, setHasStarted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setHasStarted(true);
    if (videoRef.current) {
      videoRef.current.play().catch(err => {
        console.error("Video play failed:", err);
      });
    }
  };

  return (
    <div 
      className={className}
      style={{ 
        position: 'relative', 
        width: '100%', 
        backgroundColor: '#000',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style 
      }}
    >
      <video
        ref={videoRef}
        src={src}
        controls
        controlsList="nodownload"
        onContextMenu={(e) => e.preventDefault()}
        playsInline
        onPlay={() => setHasStarted(true)}
        style={{ 
          width: '100%', 
          maxHeight: '500px', 
          objectFit: 'contain'
        }}
      />
      
      {!hasStarted && (
        <div 
          onClick={handlePlay}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: '#000',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10
          }}
        >
          {poster && (
            <img 
              src={poster} 
              alt="Video thumbnail" 
              style={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%', 
                height: '100%', 
                objectFit: 'contain',
                opacity: 0.8
              }} 
            />
          )}

          {/* Premium Play Button Overlay */}
          <div style={{ 
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
            transition: 'all 0.3s ease',
            zIndex: 20
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          >
            <svg 
              width="32" 
              height="32" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                d="M8 5V19L19 12L8 5Z" 
                fill="white" 
              />
            </svg>
          </div>

          {/* Corner badge */}
          <div style={{
            position: 'absolute',
            bottom: '1rem',
            right: '1rem',
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            padding: '0.25rem 0.75rem',
            borderRadius: '1rem',
            fontSize: '0.75rem',
            color: 'white',
            fontWeight: 600,
            zIndex: 20
          }}>
            Video
          </div>
        </div>
      )}
    </div>
  );
}
