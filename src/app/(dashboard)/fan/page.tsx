import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function FanDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'fan') redirect('/creator');

  // Fetch active subscriptions with tier and creator info
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select(`
      id,
      status,
      current_period_end,
      tier_id,
      creator_id
    `)
    .eq('fan_id', user.id)
    .eq('status', 'active');

  return (
    <div className="container" style={{ paddingTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>My Subscriptions</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Welcome back, {profile?.full_name}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <a href="/creators" className="btn btn-primary btn-sm">Discover Creators</a>
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="btn btn-secondary btn-sm">
              Sign Out
            </button>
          </form>
        </div>
      </div>

      {(!subscriptions || subscriptions.length === 0) ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎧</p>
          <h3 style={{ marginBottom: '0.5rem' }}>No subscriptions yet</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Discover amazing Nigerian creators and support their work
          </p>
          <a href="/creators" className="btn btn-primary">
            Browse Creators
          </a>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {subscriptions.map((sub) => (
            <div key={sub.id} className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: 600 }}>Subscription</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    Status: <span style={{ color: 'var(--success)' }}>{sub.status}</span>
                  </p>
                </div>
                {sub.current_period_end && (
                  <p style={{ fontSize: '0.813rem', color: 'var(--text-muted)' }}>
                    Renews: {new Date(sub.current_period_end).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
