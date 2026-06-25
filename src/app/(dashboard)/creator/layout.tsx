import MobileNav from '@/components/MobileNav';
import DashboardSidebar from '@/components/DashboardSidebar';

export default function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="v2-dashboard-layout">
      {/* Desktop Sidebar */}
      <DashboardSidebar role="creator" />

      {/* Mobile Drawer Navigation */}
      <MobileNav role="creator" />

      {/* Main Content Area */}
      {children}
    </div>
  );
}
