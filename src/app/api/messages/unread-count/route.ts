import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ count: 0 }, { status: 401 });
    }

    const { data, error } = await supabase
      .rpc('get_unread_message_count', { p_user_id: user.id });

    if (error) {
      console.error('Error fetching unread count:', error);
      return NextResponse.json({ count: 0 });
    }

    return NextResponse.json({ count: data || 0 });
  } catch (error) {
    console.error('Failed to get unread count:', error);
    return NextResponse.json({ count: 0 });
  }
}
