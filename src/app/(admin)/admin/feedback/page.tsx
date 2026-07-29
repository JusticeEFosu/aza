import { createAdminClient } from '@/lib/supabase/admin';
import FeedbackAdminClient from './FeedbackAdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminFeedbackPage() {
  const admin = createAdminClient();

  const { data: feedback, error } = await admin
    .from('platform_feedback')
    .select('*, profiles ( display_name, email )')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching feedback:', error);
  }

  return <FeedbackAdminClient feedback={feedback || []} />;
}
