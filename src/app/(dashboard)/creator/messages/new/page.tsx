import { createClient } from '@/lib/supabase/server';
import CreateGroupChatForm from '@/components/messages/CreateGroupChatForm';
import { redirect } from 'next/navigation';

export default async function NewGroupChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Fetch the creator's active tiers to show in the selection list
  const { data: tiers } = await supabase
    .from('tiers')
    .select('id, name, amount')
    .eq('creator_id', user.id)
    .eq('is_active', true)
    .order('amount', { ascending: true });

  return (
    <main style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <h1 className="v2-dash-title">Create Group Chat</h1>
      <p className="v2-dash-subtitle" style={{ marginBottom: '32px' }}>
        Create a new private community chat and select which subscription tiers get access.
      </p>

      <div className="v2-card">
        <CreateGroupChatForm creatorId={user.id} tiers={tiers || []} />
      </div>
      </div>
    </main>
  );
}
