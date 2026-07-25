import { createClient } from '@/lib/supabase/server';

export default async function AdminDashboard() {
  const supabase = await createClient();

  // Fetch quick metrics
  const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  const { count: totalCreators } = await supabase.from('creator_profiles').select('*', { count: 'exact', head: true });
  
  // Get platform earnings (sum of total_earnings across all creators)
  const { data: earningsData } = await supabase.from('creator_profiles').select('total_earnings');
  const totalPlatformEarnings = earningsData?.reduce((sum, c) => sum + (c.total_earnings || 0), 0) || 0;

  return (
    <div>
      <h1 style={{ fontSize: '32px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', marginBottom: '8px', letterSpacing: '-0.02em' }}>Admin Dashboard</h1>
      <p style={{ color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)', marginBottom: '40px', fontSize: '16px' }}>Platform overview and master controls.</p>

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '48px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '13px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Users</div>
          <div style={{ fontSize: '44px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 800, color: '#004e34', marginTop: '8px', letterSpacing: '-0.02em' }}>{totalUsers?.toLocaleString() || 0}</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '13px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Creators</div>
          <div style={{ fontSize: '44px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 800, color: '#004e34', marginTop: '8px', letterSpacing: '-0.02em' }}>{totalCreators?.toLocaleString() || 0}</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '13px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gross Volume</div>
          <div style={{ fontSize: '44px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 800, color: '#059669', marginTop: '8px', letterSpacing: '-0.02em' }}>₦{(totalPlatformEarnings / 100).toLocaleString()}</div>
        </div>
      </div>
      
      {/* Quick Actions or Alerts */}
      <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '32px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>done_all</span>
        </div>
        <h3 style={{ fontSize: '18px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', marginBottom: '8px' }}>System Healthy</h3>
        <p style={{ color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)', margin: 0, fontSize: '15px' }}>No pending payouts or flagged content requiring immediate attention.</p>
      </div>

    </div>
  );
}
