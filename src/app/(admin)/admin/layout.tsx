import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import AdminLayoutClient from '@/components/admin/AdminLayoutClient';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Final server-side check (double protection after middleware)
  const { data: profile } = await supabase
    .from('profiles')
    .select('admin_role')
    .eq('id', user.id)
    .single();

  if (!profile?.admin_role) {
    redirect('/login');
  }

  const role = profile.admin_role;

  // Fetch unread feedback count for sidebar badge
  const admin = createAdminClient();
  const { count: feedbackCount } = await admin
    .from('platform_feedback')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'new');

  return (
    <AdminLayoutClient role={role} feedbackCount={feedbackCount ?? 0}>
      {children}
    </AdminLayoutClient>
  );
}
