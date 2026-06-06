import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import CopyLinkButton from '@/components/CopyLinkButton';

export default async function CreatorDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'creator') redirect('/fan');

  const { data: creatorProfile } = await supabase
    .from('creator_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return (
    <div className="container" style={{ paddingTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Creator Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Welcome back, {profile?.full_name}
          </p>
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
          <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>
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
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Profile</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 700 }}>
            {creatorProfile?.is_verified ? '✅' : '⚠️'}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {creatorProfile?.is_verified ? 'Verified' : 'Setup needed'}
          </p>
        </div>
      </div>

      {/* Share Profile Link */}
      <div className="glass-card" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ marginBottom: '0.25rem' }}>Your Public Profile Link</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Paste this link in your TikTok bio or YouTube descriptions
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ background: 'var(--bg-input)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '0.875rem' }}>
            aza.com/c/{creatorProfile?.slug}
          </div>
          <CopyLinkButton url={`https://aza.com/c/${creatorProfile?.slug}`} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-card">
        <h3 style={{ marginBottom: '1rem' }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <a href="/creator/settings" className="btn btn-primary">Complete Profile</a>
          <a href="/creator/tiers" className="btn btn-secondary">Manage Tiers</a>
          <a href="/creator/posts" className="btn btn-secondary">Create Post</a>
        </div>
      </div>
    </div>
  );
}
