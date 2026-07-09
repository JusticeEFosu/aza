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
          <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--v2-primary)', letterSpacing: '-0.02em', margin: '0 0 8px 0' }}>Staff Management</h1>
          <p style={{ color: 'var(--v2-text-variant)', fontSize: '16px', margin: 0 }}>Manage team members, roles, and access permissions.</p>
        </div>
      </div>

      <div style={{ background: 'var(--v2-surface)', borderRadius: '16px', border: '1px solid var(--v2-outline)', overflow: 'hidden' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid var(--v2-outline)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--v2-primary)', margin: 0 }}>Active Team Members</h2>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--v2-surface-low)' }}>
                <th style={{ padding: '16px 24px', color: 'var(--v2-text-variant)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>User</th>
                <th style={{ padding: '16px 24px', color: 'var(--v2-text-variant)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</th>
                <th style={{ padding: '16px 24px', color: 'var(--v2-text-variant)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</th>
                <th style={{ padding: '16px 24px', color: 'var(--v2-text-variant)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff?.map((member) => (
                <tr key={member.id} style={{ borderBottom: '1px solid var(--v2-outline)' }}>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--v2-primary)', fontSize: '14px' }}>
                      {member.full_name}
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', color: 'var(--v2-text-variant)', fontSize: '14px' }}>
                    {member.email}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '12px', 
                      fontSize: '12px', 
                      fontWeight: 600,
                      background: member.admin_role === 'super_admin' ? '#f3e8ff' : '#e0f2fe',
                      color: member.admin_role === 'super_admin' ? '#6b21a8' : '#0369a1',
                      border: member.admin_role === 'super_admin' ? '1px solid #d8b4fe' : '1px solid #bae6fd'
                    }}>
                      {member.admin_role.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    {member.id !== user.id && (
                      <form action="/api/admin/team/revoke" method="POST" style={{ display: 'inline' }}>
                        <input type="hidden" name="userId" value={member.id} />
                        <button type="submit" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                          Revoke Access
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {(!staff || staff.length === 0) && (
                <tr>
                  <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: 'var(--v2-text-variant)' }}>
                    No team members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: '40px', background: 'var(--v2-surface)', borderRadius: '16px', border: '1px solid var(--v2-outline)', overflow: 'hidden' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid var(--v2-outline)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--v2-primary)', margin: 0 }}>Assign Role to Existing User</h2>
          <p style={{ color: 'var(--v2-text-variant)', fontSize: '14px', marginTop: '4px' }}>
            The user must already have a normal account. Enter their email address and select the new role to grant them staff access.
          </p>
        </div>
        <form action="/api/admin/team/assign" method="POST" style={{ padding: '24px', display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
          <div style={{ flex: 2 }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--v2-primary)', marginBottom: '8px' }}>User Email</label>
            <input type="email" name="email" required placeholder="team.member@example.com" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--v2-outline)', background: 'var(--v2-surface-lowest)', color: 'var(--v2-text)', fontSize: '14px', outline: 'none' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--v2-primary)', marginBottom: '8px' }}>Staff Role</label>
            <select name="role" required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--v2-outline)', background: 'var(--v2-surface-lowest)', color: 'var(--v2-text)', fontSize: '14px', outline: 'none', cursor: 'pointer' }}>
              <option value="finance_manager">Finance Manager</option>
              <option value="moderator">Moderator</option>
              <option value="support_agent">Support Agent</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <button type="submit" className="v2-sub-btn v2-sub-btn-primary" style={{ padding: '12px 24px', height: '43px' }}>
            Grant Access
          </button>
        </form>
      </div>

    </div>
  );
}
