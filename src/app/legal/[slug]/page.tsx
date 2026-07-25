import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

import LandingNavbar from '@/components/LandingNavbar';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('platform_pages')
    .select('title')
    .eq('slug', resolvedParams.slug)
    .eq('is_published', true)
    .single();

  return {
    title: data ? `${data.title} - MyAzaa` : 'Page Not Found',
  };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const supabase = await createClient();
  
  const { data: page } = await supabase
    .from('platform_pages')
    .select('*')
    .eq('slug', resolvedParams.slug)
    .eq('is_published', true)
    .single();

  if (!page) {
    notFound();
  }

  // Get user to determine dashboard URL
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  let dashboardUrl = '/login';
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    dashboardUrl = profile?.role === 'creator' ? '/creator' : '/fan';
  }

  return (
    <div style={{ background: '#f8f9ff', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <LandingNavbar user={user} dashboardUrl={dashboardUrl} />

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '120px 24px 80px 24px', display: 'flex', justifyContent: 'center' }}>
        <article style={{ width: '100%', maxWidth: '800px', background: '#ffffff', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '40px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <header style={{ marginBottom: '40px', paddingBottom: '24px', borderBottom: '1px solid #E2E8F0' }}>
            <h1 style={{ fontSize: '36px', fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 800, color: '#0b1c30', letterSpacing: '-0.03em', marginBottom: '12px' }}>
              {page.title}
            </h1>
            <div style={{ fontSize: '14px', fontFamily: 'var(--font-body, Inter, sans-serif)', color: '#6f7a72' }}>
              Last updated: {new Date(page.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </header>

          <div className="markdown-content" style={{ color: '#3f4943', lineHeight: 1.8, fontSize: '16px', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
            <style dangerouslySetInnerHTML={{__html: `
              .markdown-content h1, .markdown-content h2, .markdown-content h3 {
                color: #0b1c30;
                font-family: var(--font-heading, Montserrat, sans-serif);
                font-weight: 700;
                margin-top: 32px;
                margin-bottom: 16px;
                letter-spacing: -0.02em;
              }
              .markdown-content h2 { font-size: 24px; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px; }
              .markdown-content h3 { font-size: 20px; }
              .markdown-content p { margin-bottom: 16px; }
              .markdown-content ul, .markdown-content ol { margin-bottom: 16px; padding-left: 24px; }
              .markdown-content li { margin-bottom: 8px; }
              .markdown-content a { color: #004e34; font-weight: 600; text-decoration: none; }
              .markdown-content a:hover { text-decoration: underline; }
              .markdown-content blockquote { border-left: 4px solid #004e34; padding: 16px; color: #3f4943; font-style: italic; background: #f8f9ff; border-radius: 0 8px 8px 0; }
              .markdown-content code { background: #f8f9ff; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.9em; border: 1px solid #E2E8F0; color: #004e34; }
            `}} />
            <ReactMarkdown>{page.content}</ReactMarkdown>
          </div>
        </article>
      </main>

      {/* Footer */}
      <footer style={{ background: '#ffffff', borderTop: '1px solid #E2E8F0', padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ fontFamily: 'var(--font-heading, Montserrat, sans-serif)', fontWeight: 800, fontSize: '20px', color: '#004e34', marginBottom: '8px' }}>MyAzaa</div>
          <div style={{ color: '#6f7a72', fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '14px' }}>&copy; {new Date().getFullYear()} MyAzaa. Supporting Nigerian Creators.</div>
        </div>
      </footer>
    </div>
  );
}
