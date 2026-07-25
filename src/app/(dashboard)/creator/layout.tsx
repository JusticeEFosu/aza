import MobileNav from '@/components/MobileNav';
import DashboardSidebar from '@/components/DashboardSidebar';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, admin_role, is_suspended')
      .eq('id', user.id)
      .single();
      
    if (profile?.is_suspended) {
        redirect('/suspended');
    } else if (profile?.admin_role) {
        redirect('/admin');
    } else if (!profile?.role || profile?.role === 'user') {
        redirect('/onboarding');
    } else if (profile?.role !== 'creator') {
        redirect('/fan');
    } else {
        const { data: creatorProfile } = await supabase
          .from('creator_profiles')
          .select('display_name')
          .eq('id', user.id)
          .single();
          
        if (!creatorProfile?.display_name || creatorProfile.display_name.startsWith('Creator ')) {
            redirect('/onboarding');
        }
    }
  }

  return (
    <div className="v2-dashboard-layout" style={{ backgroundColor: '#f8f9ff', minHeight: '100vh' }}>
      {/* Desktop Sidebar */}
      <DashboardSidebar role="creator" />

      {/* Mobile Drawer Navigation */}
      <MobileNav role="creator" />

      {/* Main Content Area */}
      <div className="v2-main-content">
        {children}
      </div>
    </div>
  );
}
