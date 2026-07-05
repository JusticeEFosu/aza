import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

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
  const { data: { user } } = await supabase.auth.getUser();
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
    <div className="landing-v2" style={{ background: 'var(--v2-bg-lowest)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* TopNavBar Component */}
      <nav className="v2-nav">
        <div className="v2-nav-inner">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Link href="/" className="v2-brand">MyAzaa</Link>
            <div className="v2-nav-links">
              <Link href="/creators" className="v2-nav-link">Discover</Link>
              <Link href="/how-it-works" className="v2-nav-link">How it Works</Link>
            </div>
          </div>
          <div className="v2-nav-actions">
            {user ? (
              <Link href={dashboardUrl} className="v2-btn-outline v2-hidden-mobile">My Dashboard</Link>
            ) : (
              <Link href="/login" className="v2-btn-outline v2-hidden-mobile">Log In</Link>
            )}
            <Link href="/signup" className="v2-btn-primary">Create Account</Link>
            <button className="v2-mobile-menu">
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '80px 24px' }}>
        <article style={{ width: '100%', maxWidth: '800px' }}>
          <header style={{ marginBottom: '40px', paddingBottom: '24px', borderBottom: '1px solid var(--v2-outline)' }}>
            <h1 style={{ fontSize: '40px', fontWeight: 800, color: 'var(--v2-primary)', letterSpacing: '-0.03em', marginBottom: '16px' }}>
              {page.title}
            </h1>
            <div style={{ fontSize: '14px', color: 'var(--v2-text-variant)' }}>
              Last updated: {new Date(page.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </header>

          <div className="markdown-content" style={{ color: 'var(--v2-text)', lineHeight: 1.8, fontSize: '16px' }}>
            {/* 
              We'll inject global styles for markdown-content in this component 
              or rely on global.css. We use an inline style tag here for quick scoping.
            */}
            <style dangerouslySetInnerHTML={{__html: `
              .markdown-content h1, .markdown-content h2, .markdown-content h3 {
                color: var(--v2-primary);
                font-weight: 700;
                margin-top: 32px;
                margin-bottom: 16px;
                letter-spacing: -0.02em;
              }
              .markdown-content h2 { font-size: 24px; border-bottom: 1px solid var(--v2-outline); padding-bottom: 8px; }
              .markdown-content h3 { font-size: 20px; }
              .markdown-content p { margin-bottom: 16px; }
              .markdown-content ul, .markdown-content ol { margin-bottom: 16px; padding-left: 24px; }
              .markdown-content li { margin-bottom: 8px; }
              .markdown-content a { color: var(--v2-green); text-decoration: none; }
              .markdown-content a:hover { text-decoration: underline; }
              .markdown-content blockquote { border-left: 4px solid var(--v2-green); padding-left: 16px; color: var(--v2-text-variant); font-style: italic; background: var(--v2-surface-lowest); padding: 16px; border-radius: 0 8px 8px 0; }
              .markdown-content code { background: var(--v2-surface-lowest); padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.9em; border: 1px solid var(--v2-outline); color: var(--v2-primary); }
            `}} />
            <ReactMarkdown>{page.content}</ReactMarkdown>
          </div>
        </article>
      </main>

      {/* Footer */}
      <footer className="v2-footer">
        <div className="v2-footer-inner" style={{ textAlign: 'center' }}>
          <div className="v2-brand" style={{ marginBottom: '16px', display: 'inline-block' }}>MyAzaa</div>
          <div style={{ color: 'var(--v2-text-variant)' }}>&copy; {new Date().getFullYear()} MyAzaa. Supporting Nigerian Creators.</div>
        </div>
      </footer>
    </div>
  );
}
