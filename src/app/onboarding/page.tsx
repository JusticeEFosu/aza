import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import OnboardingClient from './OnboardingClient';

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch the existing profile and creator profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, display_name, role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'creator') {
    redirect('/dashboard');
  }

  const { data: creatorProfile } = await supabase
    .from('creator_profiles')
    .select('slug, bio')
    .eq('id', user.id)
    .single();

  // The DB auto-appends an 8-character ID to the slug for uniqueness (e.g. justice-fosu-a1b2c3d4).
  // We strip that out here so we can suggest a clean, readable URL to the user in the form.
  const cleanSlug = creatorProfile?.slug?.replace(/-[a-f0-9]{8}$/i, '') || '';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--v2-surface-lowest)' }}>
      {/* Left side: Form */}
      <div style={{ flex: 1, padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: '480px', marginTop: '64px' }}>
          <OnboardingClient 
            userId={user.id} 
            initialName={profile?.display_name || profile?.full_name || ''} 
            initialSlug={cleanSlug}
            initialBio={creatorProfile?.bio || ''}
          />
        </div>
      </div>
      
      {/* Right side: Preview */}
      <div style={{ flex: 1, background: 'var(--v2-primary)', display: 'none', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '48px' }} className="v2-hidden-mobile">
         <div style={{ color: 'var(--v2-on-primary)', textAlign: 'center', maxWidth: '400px' }}>
            <h2 style={{ fontSize: '32px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, marginBottom: '16px' }}>Your journey starts here.</h2>
            <p style={{ fontSize: '18px', opacity: 0.8, lineHeight: 1.6 }}>Connect with your truest fans, offer exclusive value, and build a sustainable income on your own terms.</p>
         </div>
      </div>
    </div>
  );
}
