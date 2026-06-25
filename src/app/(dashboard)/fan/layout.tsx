import MobileNav from '@/components/MobileNav';
import DashboardSidebar from '@/components/DashboardSidebar';

export default function FanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="v2-dashboard-layout">
      {/* Desktop Sidebar */}
      <DashboardSidebar role="fan" />

      {/* Mobile Drawer Navigation */}
      <MobileNav role="fan" />

      {/* Main Content Area */}
      {children}
    </div>
  );
}
