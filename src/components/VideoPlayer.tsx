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
        poster={poster}
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
            zIndex: 10,
            overflow: 'hidden'
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
                objectFit: 'cover',
                opacity: 1
              }} 
            />
          )}

          {/* Subtle gradient to make the play button pop without dimming the whole image */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.4) 100%)',
            pointerEvents: 'none'
          }} />

          {/* Premium Play Button Overlay */}
          <div style={{ 
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 20
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '40px', color: 'white', marginLeft: '4px' }}>play_arrow</span>
          </div>

          {/* Corner badge */}
          <div style={{
            position: 'absolute',
            bottom: '1rem',
            right: '1rem',
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
            padding: '4px 12px',
            borderRadius: '16px',
            fontSize: '12px',
            color: 'white',
            fontWeight: 600,
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>play_circle</span>
            Video
          </div>
        </div>
      )}
    </div>
  );
}
