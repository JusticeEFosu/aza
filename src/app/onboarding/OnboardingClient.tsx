'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ConfirmModal from '@/components/ConfirmModal';

interface OnboardingClientProps {
  userId: string;
  initialName: string;
  initialSlug: string;
}

export default function OnboardingClient({ userId, initialName, initialSlug }: OnboardingClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  
  // If the initial name is the database fallback, start fresh
  const startingName = initialName?.startsWith('Creator ') ? '' : initialName;
  
  const [displayName, setDisplayName] = useState(startingName);
  const [slug, setSlug] = useState(initialSlug);
  const [error, setError] = useState<string | null>(null);

  // Real-time checking state
  const [checkingName, setCheckingName] = useState(false);
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);
  
  const [showRevertModal, setShowRevertModal] = useState(false);

  useEffect(() => {
    if (!displayName) {
      setNameAvailable(null);
      setCheckingName(false);
      return;
    }
    
    if (displayName.length < 3) {
      setNameAvailable(null);
      return;
    }

    setCheckingName(true);
    setNameAvailable(null);

    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(`/api/check-name?name=${encodeURIComponent(displayName)}`);
        const data = await res.json();
        setNameAvailable(data.available);
      } catch (err) {
        setNameAvailable(null);
      } finally {
        setCheckingName(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [displayName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Basic validation
    if (!displayName.trim()) {
      setError('Display Name is required.');
      setLoading(false);
      return;
    }
    
    if (!slug.trim()) {
      setError('URL is required.');
      setLoading(false);
      return;
    }

    if (nameAvailable === false) {
      setError('This display name is already taken.');
      setLoading(false);
      return;
    }

    try {
      // Update Display Name and Slug in creator_profiles
      const { error: creatorError } = await supabase
        .from('creator_profiles')
        .update({ 
          display_name: displayName.trim(),
          slug: slug.toLowerCase().replace(/[^a-z0-9]/g, '') // remove hyphens and special chars
        })
        .eq('id', userId);

      if (creatorError) {
        if (creatorError.code === '23505') {
          throw new Error('This name or URL is already taken. Please choose another.');
        }
        throw creatorError;
      }

      // Success, route to creator dashboard
      router.push('/creator');
      
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving your profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleRevertToFan = async () => {
    setShowRevertModal(true);
  };

  const executeRevertToFan = async () => {
    setLoading(true);
    try {
      await supabase.from('profiles').update({ role: 'fan' }).eq('id', userId);
      router.push('/fan');
    } catch (err: any) {
      alert("Something went wrong. Please try again.");
      setLoading(false);
    } finally {
      setShowRevertModal(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '32px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 800, marginBottom: '8px', color: '#0b1c30' }}>Create your page</h1>
        <p style={{ color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '16px', margin: 0 }}>Choose your creator name to get started.</p>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: '#ffdad6', color: '#ba1a1a', borderRadius: '8px', fontSize: '14px', fontFamily: 'var(--font-body, Inter, sans-serif)', fontWeight: 600 }}>
          {error}
        </div>
      )}

      {/* Display Name */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label htmlFor="displayName" style={{ fontSize: '14px', fontWeight: 600, color: '#0b1c30', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>Creator / Display Name</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input
            id="displayName"
            type="text"
            placeholder="E.g. Chef Boma"
            value={displayName}
            onChange={e => {
              setDisplayName(e.target.value);
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
            }}
            style={{ flex: 1, padding: '14px 16px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '16px', outline: 'none', fontFamily: 'var(--font-body, Inter, sans-serif)', color: '#0b1c30', background: '#ffffff' }}
            onFocus={(e) => e.target.style.borderColor = '#004e34'}
            onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
            required
          />
          {checkingName && (
            <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px', color: '#004e34', flexShrink: 0 }} />
          )}
          {!checkingName && nameAvailable === true && (
            <span className="material-symbols-outlined" style={{ color: '#059669', fontSize: '24px', flexShrink: 0 }} title="Available">check_circle</span>
          )}
          {!checkingName && nameAvailable === false && (
            <span className="material-symbols-outlined" style={{ color: '#ba1a1a', fontSize: '24px', flexShrink: 0 }} title="Taken">cancel</span>
          )}
        </div>
      </div>

      {/* URL Slug */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label htmlFor="slug" style={{ fontSize: '14px', fontWeight: 600, color: '#0b1c30', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>Your URL</label>
        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden', background: '#ffffff' }}>
          <span style={{ padding: '14px 16px', background: '#f8f9ff', color: '#6f7a72', borderRight: '1px solid #E2E8F0', fontSize: '15px', fontFamily: 'var(--font-body, Inter, sans-serif)', fontWeight: 500 }}>
            azaa.com/
          </span>
          <input 
            id="slug"
            type="text" 
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
            placeholder="chefboma"
            style={{ 
              padding: '14px 16px', 
              border: 'none',
              flex: 1,
              fontSize: '16px',
              outline: 'none',
              fontFamily: 'var(--font-body, Inter, sans-serif)',
              color: '#0b1c30'
            }}
          />
        </div>
      </div>

      <button 
        type="submit" 
        disabled={loading || nameAvailable === false || checkingName}
        className="az-btn-primary"
        style={{ marginTop: '16px', width: '100%', padding: '14px', fontSize: '16px', opacity: (loading || nameAvailable === false || checkingName) ? 0.5 : 1 }}
      >
        {loading ? 'Saving...' : 'Finish Setup'}
      </button>

      <div style={{ textAlign: 'center', marginTop: '16px' }}>
        <button 
          type="button" 
          onClick={handleRevertToFan}
          style={{ background: 'none', border: 'none', color: '#6f7a72', fontSize: '14px', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'var(--font-body, Inter, sans-serif)' }}
        >
          Wait, I just want to be a fan.
        </button>
      </div>

      <ConfirmModal 
        isOpen={showRevertModal}
        title="Skip Creator Setup?"
        message="Are you sure you want to skip creator setup and just be a fan? You can always become a creator later."
        confirmText="Skip Setup"
        isDestructive={false}
        onConfirm={executeRevertToFan}
        onCancel={() => setShowRevertModal(false)}
      />
    </form>
  );
}
