import { createClient } from '@/lib/supabase/server';
import SuspendUserButton from '@/components/SuspendUserButton';
import AdminUserSearch from '@/components/AdminUserSearch';
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const sp = await searchParams;
  const query = typeof sp?.q === 'string' ? sp.q : '';

  // Fetch all users with creator info if they have it
  let queryBuilder = supabase
    .from('profiles')
    .select(`
      id,
      email,
      full_name,
      display_name,
      role,
      admin_role,
      is_suspended,
      created_at,
      creator_profiles ( slug, total_earnings, subscriber_count )
    `);
    
  if (query) {
    queryBuilder = queryBuilder.or(`email.ilike.%${query}%,full_name.ilike.%${query}%,display_name.ilike.%${query}%`);
  }

  const { data: users } = await queryBuilder.order('created_at', { ascending: false });

  return (
    <div>
      <h1 style={{ fontSize: '32px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', marginBottom: '8px', letterSpacing: '-0.02em' }}>User Management</h1>
      <p style={{ color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)', marginBottom: '24px', fontSize: '16px' }}>View and manage all accounts on the platform.</p>

      <AdminUserSearch />

      <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <div className="v2-table-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ minWidth: '800px' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 1fr 1fr 1fr 0.5fr', padding: '16px 24px', background: '#f8f9ff', borderBottom: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em' }}>User</span>
              <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</span>
              <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</span>
              <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Joined</span>
              <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Earnings</span>
              <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</span>
            </div>

            {/* Rows */}
            {users?.map(user => {
              const cProfile = Array.isArray(user.creator_profiles) ? user.creator_profiles[0] : user.creator_profiles;
              
              return (
                <div key={user.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 1fr 1fr 1fr 0.5fr', padding: '16px 24px', borderBottom: '1px solid #E2E8F0', alignItems: 'center', opacity: user.is_suspended ? 0.6 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#eff4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#004e34', fontFamily: 'var(--font-heading, Montserrat, sans-serif)' }}>
                      {user.full_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#0b1c30', fontSize: '14px', fontFamily: 'var(--font-body, Inter, sans-serif)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {user.full_name}
                        {user.admin_role && <span style={{ fontSize: '10px', background: '#ecfdf5', color: '#059669', border: '1px solid #059669', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 700 }}>Staff</span>}
                        {user.is_suspended && <span style={{ fontSize: '10px', background: '#ffdad6', color: '#ba1a1a', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 700 }}>Suspended</span>}
                      </div>
                      {cProfile && <div style={{ fontSize: '12px', color: '#6f7a72', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>@{cProfile.slug}</div>}
                    </div>
                  </div>

                  <div style={{ fontSize: '14px', color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
                    {user.email}
                  </div>

                  <div>
                    <span style={{ 
                      padding: '4px 10px', 
                      borderRadius: '9999px', 
                      fontSize: '12px', 
                      fontWeight: 600,
                      fontFamily: 'var(--font-body, Inter, sans-serif)',
                      background: user.admin_role ? '#eff4ff' : user.role === 'creator' ? '#ecfdf5' : '#f3f4f6',
                      color: user.admin_role ? '#004e34' : user.role === 'creator' ? '#059669' : '#3f4943',
                      border: user.admin_role ? '1px solid #004e34' : user.role === 'creator' ? '1px solid #059669' : '1px solid #E2E8F0'
                    }}>
                      {user.admin_role ? user.admin_role.replace('_', ' ') : (user.role.charAt(0).toUpperCase() + user.role.slice(1))}
                    </span>
                  </div>

                  <div style={{ fontSize: '14px', color: '#6f7a72', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
                    {new Date(user.created_at).toLocaleDateString()}
                  </div>

                  <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-body, Inter, sans-serif)', color: cProfile?.total_earnings ? '#059669' : '#6f7a72' }}>
                    {cProfile ? `₦${((cProfile.total_earnings || 0) / 100).toLocaleString()}` : '-'}
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <SuspendUserButton userId={user.id} isSuspended={user.is_suspended} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
