import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { hasPermission } from '@/lib/permissions';

export default async function TeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Verify Super Admin status
  const { data: profile } = await supabase
    .from('profiles')
    .select('admin_role')
    .eq('id', user.id)
    .single();

  if (profile?.admin_role !== 'super_admin') {
    redirect('/admin');
  }

  // Fetch all staff members
  const { data: staff, error } = await supabase
    .from('profiles')
    .select('id, full_name, display_name, email, admin_role, created_at')
    .not('admin_role', 'is', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching staff:', error);
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 800, color: '#0b1c30', letterSpacing: '-0.02em', margin: '0 0 8px 0' }}>Staff Management</h1>
          <p style={{ color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '16px', margin: 0 }}>Manage team members, roles, and access permissions.</p>
        </div>
      </div>

      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #E2E8F0', background: '#f8f9ff' }}>
          <h2 style={{ fontSize: '18px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', margin: 0 }}>Active Team Members</h2>
        </div>

        <div className="v2-table-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
            <thead>
              <tr style={{ background: '#f8f9ff', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '16px 24px', color: '#3f4943', fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>User</th>
                <th style={{ padding: '16px 24px', color: '#3f4943', fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</th>
                <th style={{ padding: '16px 24px', color: '#3f4943', fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</th>
                <th style={{ padding: '16px 24px', color: '#3f4943', fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff?.map((member) => (
                <tr key={member.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontWeight: 600, color: '#0b1c30', fontSize: '14px', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
                      {member.full_name}
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', color: '#3f4943', fontSize: '14px', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
                    {member.email}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ 
                      padding: '4px 10px', 
                      borderRadius: '9999px', 
                      fontSize: '11px', 
                      fontWeight: 700,
                      fontFamily: 'var(--font-body, Inter, sans-serif)',
                      background: member.admin_role === 'super_admin' ? '#eff4ff' : '#ecfdf5',
                      color: member.admin_role === 'super_admin' ? '#004e34' : '#059669',
                      border: member.admin_role === 'super_admin' ? '1px solid #004e34' : '1px solid #059669'
                    }}>
                      {member.admin_role.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    {member.id !== user.id && (
                      <form action="/api/admin/team/revoke" method="POST" style={{ display: 'inline' }}>
                        <input type="hidden" name="userId" value={member.id} />
                        <button type="submit" style={{ background: '#ffdad6', color: '#ba1a1a', border: '1px solid #ba1a1a', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-body, Inter, sans-serif)', cursor: 'pointer' }}>
                          Revoke Access
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {(!staff || staff.length === 0) && (
                <tr>
                  <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: '#6f7a72', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
                    No team members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: '40px', background: '#ffffff', borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #E2E8F0', background: '#f8f9ff' }}>
          <h2 style={{ fontSize: '18px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', margin: 0 }}>Assign Role to Existing User</h2>
          <p style={{ color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '14px', marginTop: '4px', margin: 0 }}>
            The user must already have a normal account. Enter their email address and select the new role to grant them staff access.
          </p>
        </div>
        <form action="/api/admin/team/assign" method="POST" style={{ padding: '24px', display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: '240px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#0b1c30', fontFamily: 'var(--font-body, Inter, sans-serif)', marginBottom: '8px' }}>User Email</label>
            <input type="email" name="email" required placeholder="team.member@example.com" style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#ffffff', color: '#0b1c30', fontSize: '16px', outline: 'none', fontFamily: 'var(--font-body, Inter, sans-serif)' }} />
          </div>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#0b1c30', fontFamily: 'var(--font-body, Inter, sans-serif)', marginBottom: '8px' }}>Staff Role</label>
            <select name="role" required style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#ffffff', color: '#0b1c30', fontSize: '16px', outline: 'none', cursor: 'pointer', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
              <option value="finance_manager">Finance Manager</option>
              <option value="moderator">Moderator</option>
              <option value="support_agent">Support Agent</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <button type="submit" className="az-btn-primary" style={{ padding: '12px 24px', height: '46px', fontSize: '14px' }}>
            Grant Access
          </button>
        </form>
      </div>

    </div>
  );
}
