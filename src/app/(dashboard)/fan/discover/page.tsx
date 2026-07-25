import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import CreatorsGrid from '@/components/CreatorsGrid';
import MobileNav from '@/components/MobileNav';

export default async function FanDiscoverPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'fan') redirect('/creator');

  const { data: creators } = await supabase
    .from('creator_profiles')
    .select(`
      slug,
      bio,
      subscriber_count,
      display_name,
      profiles ( full_name, display_name, avatar_url )
    `)
    .order('subscriber_count', { ascending: false });

  return (
    <main className="az-container" style={{ paddingTop: '32px', paddingBottom: '64px' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 className="az-h1" style={{ fontSize: '32px', color: 'var(--az-primary, #004e34)' }}>Discover Creators</h1>
        <p className="az-body-lg" style={{ color: 'var(--az-text-muted, #6f7a72)', marginTop: '4px' }}>Find your next favorite creator on MyAzaa.</p>
      </header>

      <CreatorsGrid initialCreators={creators || []} />
    </main>
  );
}
