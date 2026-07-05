import { createClient } from '@/lib/supabase/server';
import SuspendUserButton from '@/components/SuspendUserButton';
import AdminUserSearch from '@/components/AdminUserSearch';
import ImpersonateButton from '@/components/ImpersonateButton';

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
      is_admin,
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
      <h1 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--v2-primary)', marginBottom: '8px', letterSpacing: '-0.02em' }}>User Management</h1>
      <p style={{ color: 'var(--v2-text-variant)', marginBottom: '24px', fontSize: '16px' }}>View and manage all accounts on the platform.</p>

      <AdminUserSearch />

      <div style={{ background: 'var(--v2-surface)', border: '1px solid var(--v2-outline)', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ minWidth: '800px' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 1fr 1fr 1fr 0.5fr', padding: '16px 24px', background: 'var(--v2-surface-low)', borderBottom: '1px solid var(--v2-outline)' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>User</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Joined</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Earnings</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</span>
            </div>

            {/* Rows */}
            {users?.map(user => {
              const cProfile = Array.isArray(user.creator_profiles) ? user.creator_profiles[0] : user.creator_profiles;
              
              return (
                <div key={user.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 1fr 1fr 1fr 0.5fr', padding: '16px 24px', borderBottom: '1px solid var(--v2-outline)', alignItems: 'center', opacity: user.is_suspended ? 0.6 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--v2-surface-low)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: 'var(--v2-primary)' }}>
                      {user.full_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--v2-primary)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {user.full_name}
                        {user.is_admin && <span style={{ fontSize: '10px', background: 'var(--v2-green)', color: '#002116', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 700 }}>Admin</span>}
                        {user.is_suspended && <span style={{ fontSize: '10px', background: '#ffdad6', color: '#ba1a1a', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 700 }}>Suspended</span>}
                      </div>
                      {cProfile && <div style={{ fontSize: '12px', color: 'var(--v2-text-variant)' }}>@{cProfile.slug}</div>}
                    </div>
                  </div>

                  <div style={{ fontSize: '14px', color: 'var(--v2-text-variant)' }}>
                    {user.email}
                  </div>

                  <div>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '8px', 
                      fontSize: '12px', 
                      fontWeight: 600,
                      background: user.is_admin ? '#cce5ff' : user.role === 'creator' ? 'var(--v2-surface-low)' : 'transparent',
                      color: user.is_admin ? '#004085' : user.role === 'creator' ? 'var(--v2-primary)' : 'var(--v2-text-variant)',
                      border: user.is_admin ? '1px solid #b8daff' : user.role === 'creator' ? '1px solid var(--v2-outline)' : '1px solid transparent'
                    }}>
                      {user.is_admin ? 'Admin' : (user.role.charAt(0).toUpperCase() + user.role.slice(1))}
                    </span>
                  </div>

                  <div style={{ fontSize: '14px', color: 'var(--v2-text-variant)' }}>
                    {new Date(user.created_at).toLocaleDateString()}
                  </div>

                  <div style={{ fontSize: '14px', fontWeight: 600, color: cProfile?.total_earnings ? 'var(--v2-green)' : 'var(--v2-text-variant)' }}>
                    {cProfile ? `₦${((cProfile.total_earnings || 0) / 100).toLocaleString()}` : '-'}
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    {!user.is_admin && <ImpersonateButton userId={user.id} email={user.email} />}
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
