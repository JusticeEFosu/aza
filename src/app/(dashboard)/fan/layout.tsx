import MobileNav from '@/components/MobileNav';
import DashboardSidebar from '@/components/DashboardSidebar';
import UnreadCountProvider from '@/components/providers/UnreadCountProvider';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function FanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    // Final server-side role check
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, admin_role, is_suspended')
      .eq('id', user.id)
      .single();

    if (profile?.is_suspended) {
        redirect('/suspended');
    } else if (profile?.admin_role) {
        redirect('/admin');
    } else if (profile?.role === 'creator') {
        redirect('/creator');
    }
  }

  return (
    <div 
      className="v2-dashboard-layout" 
      style={{ 
        backgroundColor: 'var(--az-bg, #f8f9ff)', 
        minHeight: '100vh',
        color: 'var(--az-text-main, #0b1c30)'
      }}
    >
      <UnreadCountProvider>
        {/* Desktop Sidebar */}
        <DashboardSidebar role="fan" />

        {/* Mobile Drawer Navigation */}
        <MobileNav role="fan" />

        {/* Main Content Area */}
        <div className="v2-main-content">
          {children}
        </div>
      </UnreadCountProvider>
    </div>
  );
}
