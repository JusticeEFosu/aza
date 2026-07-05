import { createClient } from '@/lib/supabase/server';

export async function GlobalAnnouncement() {
  const supabase = await createClient();
  
  // Fetch active announcement
  const { data: announcement } = await supabase
    .from('platform_announcements')
    .select('message')
    .eq('is_active', true)
    .single();

  if (!announcement || !announcement.message) {
    return null;
  }

  return (
    <div style={{
      background: 'var(--v2-primary)',
      color: 'white',
      textAlign: 'center',
      padding: '8px 24px',
      fontSize: '14px',
      fontWeight: 600,
      letterSpacing: '0.02em',
      zIndex: 9999,
      position: 'relative'
    }}>
      {announcement.message}
    </div>
  );
}
