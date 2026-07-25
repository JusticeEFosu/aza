import { createClient } from '@/lib/supabase/server';
import RecentActivityFeed from '@/components/dashboard/RecentActivityFeed';

interface RecentActivityWrapperProps {
  userId: string;
  isPublished: boolean;
}

export default async function RecentActivityWrapper({ userId, isPublished }: RecentActivityWrapperProps) {
  const supabase = await createClient();

  // Fetch only the data needed for recent activity
  const [
    { data: donations },
    { data: transactions }
  ] = await Promise.all([
    supabase.from('donations').select('id, amount, fundraiser_id, created_at, donor_name, donor_note').eq('creator_id', userId).eq('status', 'success').order('created_at', { ascending: false }),
    supabase.from('transactions').select(`
      id,
      amount,
      status,
      created_at,
      profiles ( full_name, display_name, avatar_url ),
      subscriptions (
        tiers ( name )
      )
    `).eq('creator_id', userId).order('created_at', { ascending: false }).limit(10)
  ]);

  // Merge transactions and donations for recent activity
  const allRecentActivity = [
    ...(transactions || []).map((tx: any) => ({
      ...tx,
      _type: 'subscription'
    })),
    ...(donations || []).slice(0, 10).map((d: any) => ({
      ...d,
      _type: 'donation',
      id: d.id || Math.random().toString()
    }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);

  return (
    <RecentActivityFeed activities={allRecentActivity as any} isPublished={isPublished} />
  );
}
