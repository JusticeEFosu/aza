import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import HeaderShareButton from '@/components/HeaderShareButton';
import { Suspense } from 'react';
import SetupWidgetWrapper from '@/components/dashboard/SetupWidgetWrapper';
import DashboardStatsWrapper from '@/components/dashboard/DashboardStatsWrapper';
import RecentActivityWrapper from '@/components/dashboard/RecentActivityWrapper';

export default async function CreatorDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, display_name, role, avatar_url')
    .eq('id', user.id)
    .single();

  if (!profile?.role || profile?.role === 'user') redirect('/onboarding');
  if (profile?.role !== 'creator') redirect('/fan');

  const { data: creatorProfile } = await supabase
    .from('creator_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const shareUrl = `https://aza-chi.vercel.app/c/${creatorProfile?.slug}`;

  const hasBank = Boolean(creatorProfile?.bank_account_number && creatorProfile?.bank_code);
  const hasProfile = Boolean(profile?.avatar_url);
  const isPublished = Boolean(creatorProfile?.is_published);

  return (
    <main style={{ padding: '24px 16px' }}>
        <header className="v2-dash-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="az-h1" style={{ fontSize: '32px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', margin: 0 }}>Overview</h1>
            <p className="az-body" style={{ color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)', margin: '4px 0 0 0' }}>Here's what's happening with your community today.</p>
          </div>
          <div className="hidden md:flex">
             {isPublished && <HeaderShareButton url={shareUrl} />}
          </div>
        </header>

        <Suspense fallback={<div className="animate-pulse" style={{ width: '100%', height: '160px', backgroundColor: '#e2e8f0', borderRadius: '16px', marginBottom: '32px' }}></div>}>
          <SetupWidgetWrapper 
            userId={user.id} 
            hasProfile={hasProfile} 
            hasBank={hasBank} 
            isPublished={isPublished} 
          />
        </Suspense>

        <Suspense fallback={
          <div className="v2-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            <div className="animate-pulse" style={{ height: '140px', backgroundColor: '#e2e8f0', borderRadius: '12px' }}></div>
            <div className="animate-pulse" style={{ height: '350px', backgroundColor: '#e2e8f0', borderRadius: '12px' }}></div>
            <div className="animate-pulse" style={{ height: '140px', backgroundColor: '#e2e8f0', borderRadius: '12px' }}></div>
          </div>
        }>
          <DashboardStatsWrapper userId={user.id} />
        </Suspense>

        <Suspense fallback={<div className="animate-pulse" style={{ width: '100%', height: '400px', backgroundColor: '#e2e8f0', borderRadius: '16px' }}></div>}>
          <RecentActivityWrapper userId={user.id} isPublished={isPublished} />
        </Suspense>
    </main>
  );
}
