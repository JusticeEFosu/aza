import { createAdminClient } from '@/lib/supabase/admin';
import SuspendFundraiserButton from '@/components/admin/SuspendFundraiserButton';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminFundraisersPage() {
  const supabase = createAdminClient();

  const { data: fundraisers } = await supabase
    .from('fundraisers')
    .select(`
      *,
      creator_profiles (
        slug,
        profiles ( full_name, avatar_url, email )
      )
    `)
    .order('created_at', { ascending: false });

  return (
    <div>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', marginBottom: '8px', letterSpacing: '-0.02em' }}>Global Fundraisers</h1>
        <p style={{ color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '16px' }}>Monitor and moderate all fundraisers across the platform.</p>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #E2E8F0', background: '#f8f9ff' }}>
          <h2 style={{ fontSize: '20px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', margin: 0 }}>Active Campaigns</h2>
        </div>
        
        {!fundraisers || fundraisers.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
            No fundraisers exist on the platform yet.
          </div>
        ) : (
          <div className="v2-table-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ minWidth: '900px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 1.5fr 1fr 1fr', padding: '16px 24px', background: '#f8f9ff', borderBottom: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Creator</span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fundraiser</span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Progress</span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</span>
              </div>

              {fundraisers.map((campaign: any) => {
                const profile = Array.isArray(campaign.creator_profiles?.profiles) 
                  ? campaign.creator_profiles.profiles[0] 
                  : campaign.creator_profiles?.profiles;
                const creatorName = profile?.full_name || 'Creator';
                const creatorSlug = campaign.creator_profiles?.slug;
                
                const raised = campaign.current_amount;
                const goal = campaign.target_amount;
                const percent = Math.min(100, Math.round((raised / goal) * 100)) || 0;
                
                return (
                  <div key={campaign.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 1.5fr 1fr 1fr', padding: '16px 24px', borderBottom: '1px solid #E2E8F0', alignItems: 'center' }}>
                    
                    {/* Creator Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e2e8f0', overflow: 'hidden', flexShrink: 0 }}>
                        {profile?.avatar_url ? (
                          <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>person</span>
                        )}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: '#0b1c30', fontSize: '14px', fontFamily: 'var(--font-body, Inter, sans-serif)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{creatorName}</div>
                        {creatorSlug && <div style={{ fontSize: '12px', color: '#6f7a72', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>@{creatorSlug}</div>}
                      </div>
                    </div>

                    {/* Campaign Info */}
                    <div style={{ paddingRight: '16px' }}>
                      <div style={{ fontWeight: 600, color: '#0b1c30', fontSize: '14px', fontFamily: 'var(--font-body, Inter, sans-serif)', marginBottom: '4px' }}>
                        {campaign.title}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6f7a72', fontFamily: 'var(--font-body, Inter, sans-serif)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {campaign.description}
                      </div>
                    </div>

                    {/* Progress */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontFamily: 'var(--font-body, Inter, sans-serif)', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, color: '#059669' }}>₦{(raised / 100).toLocaleString()}</span>
                        <span style={{ color: '#6f7a72' }}>of ₦{(goal / 100).toLocaleString()}</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ width: `${percent}%`, height: '100%', background: '#059669', borderRadius: '999px' }} />
                      </div>
                    </div>

                    {/* Status */}
                    <div>
                      <span style={{ 
                        fontSize: '11px', 
                        fontFamily: 'var(--font-body, Inter, sans-serif)',
                        fontWeight: 600,
                        padding: '4px 8px', 
                        borderRadius: '12px', 
                        textTransform: 'uppercase',
                        background: campaign.status === 'active' ? '#ecfdf5' : campaign.status === 'completed' ? '#eff4ff' : '#fef2f2',
                        color: campaign.status === 'active' ? '#059669' : campaign.status === 'completed' ? '#2563eb' : '#dc2626',
                        border: `1px solid ${campaign.status === 'active' ? '#059669' : campaign.status === 'completed' ? '#bfdbfe' : '#fecaca'}`
                      }}>
                        {campaign.status}
                      </span>
                    </div>

                    {/* Actions */}
                    <div style={{ textAlign: 'right' }}>
                      <SuspendFundraiserButton fundraiserId={campaign.id} status={campaign.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
