import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';

export default async function AdminContentPage() {
  const supabase = createAdminClient();

  const { data: pages } = await supabase
    .from('platform_pages')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--v2-primary)', marginBottom: '8px', letterSpacing: '-0.02em' }}>Content Hub</h1>
          <p style={{ color: 'var(--v2-text-variant)', fontSize: '16px' }}>Manage your Terms of Service, Privacy Policy, and other legal pages.</p>
        </div>
        <Link href="/admin/content/new" className="v2-btn v2-btn-primary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-outlined">add</span>
          Create New Page
        </Link>
      </div>

      <div style={{ background: 'var(--v2-surface)', border: '1px solid var(--v2-outline)', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid var(--v2-outline)', background: 'var(--v2-surface-lowest)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--v2-primary)' }}>All Pages</h2>
        </div>
        
        {(!pages || pages.length === 0) ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--v2-text-variant)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--v2-outline)', marginBottom: '16px' }}>description</span>
            <p style={{ margin: 0 }}>You haven't created any pages yet.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: '600px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', padding: '16px 24px', background: 'var(--v2-surface-low)', borderBottom: '1px solid var(--v2-outline)' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Title</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Slug</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--v2-text-variant)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</span>
              </div>

              {pages.map((page: any) => (
                <div key={page.id} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', padding: '16px 24px', borderBottom: '1px solid var(--v2-outline)', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600, color: 'var(--v2-primary)', fontSize: '15px' }}>{page.title}</div>
                  <div style={{ color: 'var(--v2-text-variant)', fontSize: '14px', fontFamily: 'monospace' }}>/legal/{page.slug}</div>
                  <div>
                    <span style={{ 
                      display: 'inline-block', 
                      padding: '4px 8px', 
                      borderRadius: '9999px', 
                      fontSize: '11px', 
                      fontWeight: 600, 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.05em',
                      background: page.is_published ? 'rgba(5, 150, 105, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                      color: page.is_published ? 'var(--v2-green)' : '#eab308'
                    }}>
                      {page.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <Link href={`/admin/content/${page.id}`} className="v2-btn v2-btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', textDecoration: 'none' }}>Edit</Link>
                    {page.is_published && (
                      <Link href={`/legal/${page.slug}`} target="_blank" className="v2-btn v2-btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', textDecoration: 'none' }}>View</Link>
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
