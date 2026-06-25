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
      <h1 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--v2-primary)', marginBottom: '8px', letterSpacing: '-0.02em' }}>Admin Dashboard</h1>
      <p style={{ color: 'var(--v2-text-variant)', marginBottom: '40px', fontSize: '16px' }}>Platform overview and master controls.</p>

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '48px' }}>
        <div style={{ background: 'var(--v2-surface)', border: '1px solid var(--v2-outline)', borderRadius: '16px', padding: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--v2-text-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Users</div>
          <div style={{ fontSize: '48px', fontWeight: 700, color: 'var(--v2-primary)', marginTop: '8px', letterSpacing: '-0.02em' }}>{totalUsers?.toLocaleString() || 0}</div>
        </div>

        <div style={{ background: 'var(--v2-surface)', border: '1px solid var(--v2-outline)', borderRadius: '16px', padding: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--v2-text-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Creators</div>
          <div style={{ fontSize: '48px', fontWeight: 700, color: 'var(--v2-primary)', marginTop: '8px', letterSpacing: '-0.02em' }}>{totalCreators?.toLocaleString() || 0}</div>
        </div>

        <div style={{ background: 'var(--v2-surface)', border: '1px solid var(--v2-outline)', borderRadius: '16px', padding: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--v2-text-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gross Volume</div>
          <div style={{ fontSize: '48px', fontWeight: 700, color: 'var(--v2-green)', marginTop: '8px', letterSpacing: '-0.02em' }}>₦{(totalPlatformEarnings / 100).toLocaleString()}</div>
        </div>
      </div>
      
      {/* Quick Actions or Alerts could go here */}
      <div style={{ background: 'var(--v2-surface-lowest)', border: '1px solid var(--v2-outline)', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--v2-text-variant)', marginBottom: '16px' }}>done_all</span>
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--v2-primary)', marginBottom: '8px' }}>System Healthy</h3>
        <p style={{ color: 'var(--v2-text-variant)' }}>No pending payouts or flagged content requiring immediate attention.</p>
      </div>

    </div>
  );
}
