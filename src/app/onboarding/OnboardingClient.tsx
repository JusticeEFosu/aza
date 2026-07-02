'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface OnboardingClientProps {
  userId: string;
  initialName: string;
  initialSlug: string;
  initialBio: string;
}

export default function OnboardingClient({ userId, initialName, initialSlug, initialBio }: OnboardingClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  
  const [slug, setSlug] = useState(initialSlug);
  const [bio, setBio] = useState(initialBio);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Basic validation
    if (!slug.trim()) {
      setError('URL is required.');
      setLoading(false);
      return;
    }

    try {
      // Update Slug and Bio in creator_profiles
      const { error: creatorError } = await supabase
        .from('creator_profiles')
        .update({ 
          slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'), // enforce slug format
          bio: bio 
        })
        .eq('id', userId);

      if (creatorError) {
        if (creatorError.code === '23505') {
          throw new Error('That URL is already taken. Please choose another.');
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

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '36px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, marginBottom: '8px', color: 'var(--v2-on-surface)' }}>Create your page</h1>
        <p style={{ color: 'var(--v2-text-variant)', fontSize: '16px', margin: 0 }}>You can always edit this information later.</p>
      </div>

      {error && (
        <div style={{ padding: '12px', background: 'var(--v2-error-container, #ffdad6)', color: 'var(--v2-on-error-container, #93000a)', borderRadius: '4px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label htmlFor="slug" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--v2-on-surface)' }}>Choose your URL</label>
        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--v2-outline)', borderRadius: '4px', overflow: 'hidden' }}>
          <span style={{ padding: '12px 16px', background: 'var(--v2-surface-low)', color: 'var(--v2-text-variant)', borderRight: '1px solid var(--v2-outline)' }}>
            azaa.com/
          </span>
          <input 
            id="slug"
            type="text" 
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="JusticeFosu"
            style={{ 
              padding: '12px 16px', 
              border: 'none',
              flex: 1,
              fontSize: '16px',
              outline: 'none'
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label htmlFor="bio" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--v2-on-surface)' }}>What do you create?</label>
        <textarea 
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="E.g. A podcast for pizza makers"
          rows={3}
          style={{ 
            padding: '12px 16px', 
            borderRadius: '4px', 
            border: '1px solid var(--v2-outline)', 
            fontSize: '16px',
            outline: 'none',
            resize: 'vertical'
          }}
          onFocus={(e) => e.target.style.borderColor = 'var(--v2-primary)'}
          onBlur={(e) => e.target.style.borderColor = 'var(--v2-outline)'}
        />
        <span style={{ fontSize: '12px', color: 'var(--v2-text-variant)' }}>Be specific to help people discover your work.</span>
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className="v2-btn-primary lg"
        style={{ marginTop: '16px', width: '100%', justifyContent: 'center', background: 'var(--v2-accent, #fed65b)', color: '#241a00' }}
      >
        {loading ? 'Saving...' : 'Finish Setup'}
      </button>
    </form>
  );
}
