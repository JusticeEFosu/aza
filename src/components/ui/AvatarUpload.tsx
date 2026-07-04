'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface AvatarUploadProps {
  currentUrl?: string;
  onUploadComplete?: (newUrl: string) => void;
  userId: string;
}

export default function AvatarUpload({ currentUrl, onUploadComplete, userId }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const router = useRouter();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setUploading(true);

    try {
      // 1. Fetch signature
      const sigRes = await fetch('/api/upload/signature?folder=avatars');
      if (!sigRes.ok) throw new Error('Could not get upload signature');
      const { signature, timestamp, apiKey, cloudName } = await sigRes.json();

      // 2. Direct upload to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'avatars');
      formData.append('signature', signature);
      formData.append('timestamp', timestamp);
      formData.append('api_key', apiKey);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Upload failed');

      const newUrl = data.secure_url;

      // Update the profile in Supabase
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: newUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      setPreviewUrl(newUrl);
      if (onUploadComplete) onUploadComplete(newUrl);
      router.refresh();
    } catch (error) {
      console.error('Avatar upload failed:', error);
      alert('Failed to upload profile picture. Please try again.');
      setPreviewUrl(currentUrl); // Revert on failure
    } finally {
      setUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="avatar-upload-container">
      <div 
        className={`avatar-preview ${uploading ? 'uploading' : ''}`}
        onClick={triggerFileInput}
        title="Click to change profile picture"
      >
        {previewUrl ? (
          <img src={previewUrl} alt="Profile" className="avatar-image" />
        ) : (
          <div className="avatar-placeholder">
            {/* Simple User Icon SVG */}
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
        )}
        
        {uploading && (
          <div className="avatar-overlay">
            <span className="spinner"></span>
          </div>
        )}
        
        <div className="avatar-edit-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
            <circle cx="12" cy="13" r="4"></circle>
          </svg>
        </div>
      </div>
      
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        style={{ display: 'none' }} 
      />

      <style jsx>{`
        .avatar-upload-container {
          display: flex;
          justify-content: center;
          margin-bottom: 1.5rem;
        }

        .avatar-preview {
          position: relative;
          width: 120px;
          height: 120px;
          border-radius: 50%;
          cursor: pointer;
          border: 4px solid var(--glass-border);
          transition: transform 0.2s ease, border-color 0.2s ease;
          overflow: visible; /* To allow badge to sit partially outside */
          background: var(--glass-bg);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .avatar-preview:hover {
          transform: scale(1.02);
          border-color: var(--primary);
        }

        .avatar-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }

        .avatar-placeholder {
          color: var(--text-muted);
        }

        .avatar-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
        }

        .avatar-edit-badge {
          position: absolute;
          bottom: 2px;
          right: 2px;
          background: var(--primary);
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid #111; /* Match background for separation */
          z-index: 3;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }

        .uploading {
          cursor: default;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
