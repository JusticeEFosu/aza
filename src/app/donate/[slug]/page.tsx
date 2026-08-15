import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import StreamDonationForm from '@/components/StreamDonationForm';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DonatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  
  const { data: creator, error } = await supabase
    .from('creator_profiles')
    .select(`
      id,
      slug,
      bio,
      display_name,
      profiles (
        full_name,
        avatar_url
      )
    `)
    .eq('slug', slug.toLowerCase())
    .single();

  if (error || !creator) {
    notFound();
  }

  const displayName = creator.display_name || (creator.profiles as any)?.full_name;
  const avatarUrl = (creator.profiles as any)?.avatar_url;

  return (
    <div className="v2-dashboard-layout" style={{ backgroundColor: '#f8f9ff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <nav style={{ width: '100%', padding: '24px', display: 'flex', justifyContent: 'center', background: '#fff', borderBottom: '1px solid #E2E8F0' }}>
        <Link href={`/c/${creator.slug}`} style={{ fontSize: '24px', fontWeight: 700, color: 'var(--az-primary, #004e34)', textDecoration: 'none', fontFamily: 'var(--font-heading)' }}>
          MyAzaa
        </Link>
      </nav>
      
      <main style={{ width: '100%', maxWidth: '500px', padding: '48px 16px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <div style={{ textAlign: 'center' }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} style={{ width: '96px', height: '96px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 16px', border: '4px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
          ) : (
            <div style={{ width: '96px', height: '96px', borderRadius: '50%', backgroundColor: 'var(--az-primary, #004e34)', color: '#fff', fontSize: '32px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '4px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              {displayName?.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0b1c30', margin: '0 0 8px 0', fontFamily: 'var(--font-heading)' }}>Support {displayName}</h1>
          <p style={{ fontSize: '15px', color: '#3f4943', margin: 0, fontFamily: 'var(--font-body)' }}>Your donation will appear live on stream!</p>
        </div>

        <StreamDonationForm creatorId={creator.id} />
      </main>
    </div>
  );
}
