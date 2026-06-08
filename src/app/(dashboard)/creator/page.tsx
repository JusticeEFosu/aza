import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import CopyLinkButton from '@/components/CopyLinkButton';

export default async function CreatorDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, avatar_url')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'creator') redirect('/fan');

  const { data: creatorProfile } = await supabase
    .from('creator_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const { data: transactions } = await supabase
    .from('transactions')
    .select(`
      id,
      amount,
      creator_share,
      status,
      created_at,
      profiles ( full_name )
    `)
    .eq('creator_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {profile?.avatar_url ? (
            <img 
              src={profile.avatar_url} 
              alt="" 
              style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--glass-border)' }} 
            />
          ) : (
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.25rem' }}>
              {profile?.full_name?.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1>Creator Dashboard</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Welcome back, {profile?.full_name}
            </p>
          </div>
        </div>
        <form action="/api/auth/signout" method="POST">
          <button type="submit" className="btn btn-secondary btn-sm">
            Sign Out
          </button>
        </form>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="glass-card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Earnings</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--success)' }}>
            ₦{((creatorProfile?.total_earnings || 0) / 100).toLocaleString()}
          </p>
        </div>
        <div className="glass-card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Subscribers</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
            {creatorProfile?.subscriber_count || 0}
          </p>
        </div>
        <div className="glass-card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Profile Status</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 700 }}>
            {creatorProfile?.is_verified ? '✅' : '⚠️'}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {creatorProfile?.is_verified ? 'Verified & Active' : 'Bank verification needed'}
          </p>
        </div>
      </div>

      <div className="grid-split" style={{ marginBottom: '2rem' }}>
        {/* Quick Actions */}
        <div className="glass-card">
          <h3 style={{ marginBottom: '1rem' }}>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <a href="/creator/posts" className="btn btn-primary" style={{ justifyContent: 'center' }}>Create New Post</a>
            <a href="/creator/payouts" className="btn btn-secondary" style={{ justifyContent: 'center' }}>Payouts & Earnings</a>
            <a href="/creator/tiers" className="btn btn-secondary" style={{ justifyContent: 'center' }}>Manage Membership Tiers</a>
            <a href="/creator/settings" className="btn btn-secondary" style={{ justifyContent: 'center' }}>Account Settings & Bank</a>
          </div>
        </div>

        {/* Share Profile Link */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h3 style={{ marginBottom: '0.25rem' }}>Share Your Page</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Paste this link in your TikTok bio, Instagram or YouTube descriptions
            </p>
          </div>
          <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '0.938rem', textAlign: 'center' }}>
            aza.com/c/{creatorProfile?.slug}
          </div>
          <CopyLinkButton url={`https://aza.com/c/${creatorProfile?.slug}`} />
        </div>
      </div>

      {/* Transaction History */}
      <h2 style={{ marginBottom: '1.5rem', marginTop: '3rem' }}>Recent Fan Transactions</h2>
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        {(!transactions || transactions.length === 0) ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
             <p style={{ color: 'var(--text-muted)' }}>No transactions yet. Share your profile to get your first subscriber!</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.938rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 500, borderBottom: '1px solid var(--border-color)' }}>Date</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 500, borderBottom: '1px solid var(--border-color)' }}>Fan</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 500, borderBottom: '1px solid var(--border-color)' }}>Amount</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 500, borderBottom: '1px solid var(--border-color)' }}>Your Share</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 500, borderBottom: '1px solid var(--border-color)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx: any) => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>
                      {new Date(tx.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>
                      {tx.profiles?.full_name || 'Anonymous Fan'}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      ₦{(tx.amount / 100).toLocaleString()}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--success)', fontWeight: 600 }}>
                      +₦{(tx.creator_share / 100).toLocaleString()}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '1rem', 
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: tx.status === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: tx.status === 'success' ? 'var(--success)' : 'var(--danger)'
                      }}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
