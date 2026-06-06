import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

export const revalidate = 60;

export default async function CreatorPublicProfile({ params }: { params: { slug: string } }) {
  const supabase = await createClient();
  
  // 1. Fetch Creator Profile
  const { data: creator, error: creatorError } = await supabase
    .from('creator_profiles')
    .select(`
      id,
      slug,
      bio,
      is_verified,
      subscriber_count,
      profiles (
        full_name,
        avatar_url
      )
    `)
    .eq('slug', params.slug)
    .single();

  if (creatorError || !creator) {
    notFound();
  }

  // 2. Fetch active Tiers
  const { data: tiers } = await supabase
    .from('tiers')
    .select('*')
    .eq('creator_id', creator.id)
    .eq('is_active', true)
    .order('amount', { ascending: true });

  // If there's no auth session we still show it (it's public), 
  // but we should know if they are a fan so we can point to checkout correctly in Phase 6.

  return (
    <div className="container" style={{ maxWidth: '900px', paddingTop: '3rem', paddingBottom: '5rem' }}>
      
      {/* Header Profile Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '3rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ 
            width: '100px', 
            height: '100px', 
            borderRadius: '50%', 
            background: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem',
            color: 'white',
            fontWeight: 'bold',
            boxShadow: 'var(--shadow-md)'
          }}>
            {(creator.profiles as any)?.full_name?.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: '2.5rem' }}>
              {(creator.profiles as any)?.full_name}
              {creator.is_verified && <span style={{ color: 'var(--success)', marginLeft: '0.5rem', fontSize: '1.5rem' }}>✓</span>}
            </h1>
            <p style={{ margin: '0.25rem 0', fontSize: '1rem', color: 'var(--text-muted)' }}>
              @{creator.slug} • {creator.subscriber_count} subscribers
            </p>
          </div>
        </div>
        
        {creator.bio && (
          <div className="glass-card" style={{ padding: '1.5rem', marginTop: '1rem' }}>
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{creator.bio}</p>
          </div>
        )}
      </div>

      {/* Tiers Section */}
      <h2 style={{ marginBottom: '1.5rem' }}>Select a Membership Tier</h2>
      
      {!tiers || tiers.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>This creator hasn't set up any membership tiers yet.</p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '1.5rem' 
        }}>
          {tiers.map((tier: any) => (
            <div key={tier.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{tier.name}</h3>
                <div style={{ margin: '0.5rem 0', fontSize: '2rem', fontWeight: 800 }}>
                  ₦{(tier.amount / 100).toLocaleString()}
                  <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 400 }}>/mo</span>
                </div>
                {tier.description && (
                  <p style={{ fontSize: '0.938rem', color: 'var(--text-secondary)' }}>{tier.description}</p>
                )}
              </div>

              {tier.perks && tier.perks.length > 0 && (
                <div style={{ flex: 1, marginBottom: '2rem' }}>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Includes:
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {tier.perks.map((perk: string, i: number) => (
                      <li key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.938rem' }}>
                        <span style={{ color: 'var(--accent-primary)' }}>✔</span>
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button className="btn btn-primary btn-full" disabled={!tier.paystack_plan_code}>
                {tier.paystack_plan_code ? 'Subscribe' : 'Unavailable'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
