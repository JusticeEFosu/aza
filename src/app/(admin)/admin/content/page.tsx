import { createAdminClient } from '@/lib/supabase/admin';
import { AnnouncementManager } from '@/components/AnnouncementManager';
import Link from 'next/link';

export default async function AdminContentPage() {
  const supabase = createAdminClient();

  const { data: pages } = await supabase
    .from('platform_pages')
    .select('*')
    .order('created_at', { ascending: false });

  // Fetch the current global announcement
  const { data: announcement } = await supabase
    .from('platform_announcements')
    .select('*')
    .limit(1)
    .single();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', marginBottom: '8px', letterSpacing: '-0.02em' }}>Content Hub</h1>
          <p style={{ color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '16px' }}>Manage global announcements and legal pages.</p>
        </div>
        <Link href="/admin/content/new" className="az-btn-primary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '14px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
          Create New Page
        </Link>
      </div>

      <AnnouncementManager initialAnnouncement={announcement} />

      <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #E2E8F0', background: '#f8f9ff' }}>
          <h2 style={{ fontSize: '20px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#0b1c30', margin: 0 }}>All Pages</h2>
        </div>
        
        {(!pages || pages.length === 0) ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: '#3f4943', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#6f7a72', marginBottom: '16px', display: 'block' }}>description</span>
            <p style={{ margin: 0 }}>You haven't created any pages yet.</p>
          </div>
        ) : (
         <div className="v2-table-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ minWidth: '600px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', padding: '16px 24px', background: '#f8f9ff', borderBottom: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Title</span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Slug</span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 700, color: '#3f4943', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</span>
              </div>

              {pages.map((page: any) => (
                <div key={page.id} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', padding: '16px 24px', borderBottom: '1px solid #E2E8F0', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600, color: '#0b1c30', fontSize: '15px', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>{page.title}</div>
                  <div style={{ color: '#6f7a72', fontSize: '14px', fontFamily: 'monospace' }}>/legal/{page.slug}</div>
                  <div>
                    <span style={{ 
                      display: 'inline-block', 
                      padding: '4px 10px', 
                      borderRadius: '9999px', 
                      fontSize: '11px', 
                      fontWeight: 700, 
                      fontFamily: 'var(--font-body, Inter, sans-serif)',
                      textTransform: 'uppercase', 
                      letterSpacing: '0.05em',
                      background: page.is_published ? '#ecfdf5' : '#fed65b',
                      color: page.is_published ? '#059669' : '#735c00'
                    }}>
                      {page.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <Link href={`/admin/content/${page.id}`} className="az-btn-secondary" style={{ padding: '6px 14px', fontSize: '13px', textDecoration: 'none' }}>Edit</Link>
                    {page.is_published && (
                      <Link href={`/legal/${page.slug}`} target="_blank" className="az-btn-secondary" style={{ padding: '6px 14px', fontSize: '13px', textDecoration: 'none' }}>View</Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
