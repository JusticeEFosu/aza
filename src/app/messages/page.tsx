import { createClient } from '@/lib/supabase/server';
import MessagesClient from '@/components/messages/MessagesClient';
import { redirect } from 'next/navigation';

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch full profile info
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, display_name, avatar_url, role')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/login');
  }

  return (
    <MessagesClient currentUser={profile} />
  );
}
