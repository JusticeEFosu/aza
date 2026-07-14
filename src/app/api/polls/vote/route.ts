import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: `Unauthorized: ${authError?.message || 'No user session found'}` }, { status: 401 });
    }

    const { postId, optionId } = await request.json();

    if (!postId || !optionId) {
      return NextResponse.json({ error: 'Post ID and Option ID are required' }, { status: 400 });
    }

    // Upsert the vote. If they already voted on this post, it updates to the new option_id
    const { data, error } = await supabase
      .from('poll_votes')
      .upsert({
        post_id: postId,
        option_id: optionId,
        fan_id: user.id,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'post_id, fan_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Voting error details:', error);
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Vote processing error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
