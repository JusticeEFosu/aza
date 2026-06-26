import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify caller is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { userId, suspend } = body;

    if (!userId || typeof suspend !== 'boolean') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Update the suspension status
    const { error } = await supabase
      .from('profiles')
      .update({ is_suspended: suspend })
      .eq('id', userId);

    if (error) {
      console.error('Error updating suspension status:', error);
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    return NextResponse.json({ success: true, is_suspended: suspend });
  } catch (err) {
    console.error('Unexpected error in suspend API:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
