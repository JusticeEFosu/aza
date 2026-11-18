import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import PreviewDashboardClient from './PreviewDashboardClient';

export const dynamic = 'force-dynamic';

export default async function PreviewDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/preview/dashboard');
  }

  // 1. Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, display_name, role, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  // 2. Fetch creator profile
  const { data: creatorProfile } = await supabase
    .from('creator_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  // 3. Fetch tiers
  const { data: tiers } = await supabase
    .from('tiers')
    .select('*')
    .eq('creator_id', user.id)
    .eq('is_active', true);

  // 4. Fetch subscriptions, transactions, and fundraisers safely
  const [
    { data: subscriptions },
    { data: transactions },
    { data: fundraisers },
    { data: donations }
  ] = await Promise.all([
    supabase.from('subscriptions').select('id, created_at, status, tiers(amount)').eq('creator_id', user.id),
    supabase.from('transactions').select('id, amount, status, created_at').eq('creator_id', user.id).order('created_at', { ascending: false }).limit(20),
    supabase.from('fundraisers').select('id, title, target_amount, current_amount').eq('creator_id', user.id).eq('is_active', true).order('created_at', { ascending: false }),
    supabase.from('donations').select('id, amount, fundraiser_id, created_at, donor_name, donor_note').eq('creator_id', user.id).eq('status', 'success').order('created_at', { ascending: false }).limit(10)
  ]);

  // Compute metrics
  let mrr = 0;
  let activeSubsCount = 0;
  let newSubs7d = 0;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  if (subscriptions) {
    subscriptions.forEach(sub => {
      if (sub.status === 'active') {
        activeSubsCount++;
        const tierData = Array.isArray(sub.tiers) ? sub.tiers[0] : sub.tiers;
        mrr += (tierData?.amount || 0);
        if (new Date(sub.created_at) >= sevenDaysAgo) {
          newSubs7d++;
        }
      }
    });
  }

  // Combine recent activity
  const allRecentActivity = [
    ...(transactions || []).map((tx: any) => ({
      ...tx,
      _type: 'subscription'
    })),
    ...(donations || []).map((d: any) => ({
      ...d,
      _type: 'donation',
      id: d.id || Math.random().toString()
    }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);

  const hasBank = Boolean(creatorProfile?.bank_account_number && creatorProfile?.bank_code);
  const hasProfile = Boolean(profile?.avatar_url);
  const hasTiers = Boolean(tiers && tiers.length > 0);
  const isPublished = Boolean(creatorProfile?.is_published);

  return (
    <PreviewDashboardClient
      user={user}
      profile={profile}
      creatorProfile={creatorProfile}
      stats={{
        activeSubsCount,
        newSubs7d,
        mrr,
        totalFundraisers: (fundraisers || []).length
      }}
      checklist={{
        hasProfile,
        hasBank,
        hasTiers,
        isPublished
      }}
      fundraisers={fundraisers || []}
      recentActivities={allRecentActivity}
      transactions={transactions || []}
    />
  );
}
