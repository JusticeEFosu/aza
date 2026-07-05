import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId, reason } = await request.json();

    if (!postId || !reason) {
      return NextResponse.json({ error: 'Missing postId or reason' }, { status: 400 });
    }

    const { error } = await supabase
      .from('content_reports')
      .insert({
        reporter_id: user.id,
        post_id: postId,
        reason: reason
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Report submission error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
