import MobileNav from '@/components/MobileNav';
import DashboardSidebar from '@/components/DashboardSidebar';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Messages | MyAzaa',
  description: 'Direct Messages and Group Chats',
};

export default async function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_suspended, admin_role')
    .eq('id', user.id)
    .single();

  if (profile?.is_suspended) {
    redirect('/suspended');
  } else if (profile?.admin_role) {
    redirect('/admin');
  }

  const role = profile?.role === 'creator' ? 'creator' : 'fan';

  return (
    <div className="v2-dashboard-layout" style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Desktop Sidebar */}
      <DashboardSidebar role={role} />

      {/* Mobile Drawer Navigation */}
      <MobileNav role={role} />

      {/* Main Content Area */}
      <div className="v2-main-content" style={{ padding: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
}
