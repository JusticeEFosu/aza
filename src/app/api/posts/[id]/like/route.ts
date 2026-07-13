import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;
  const supabase = await createClient();

  // 1. Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Insert the like
  // RLS will automatically block this if `has_post_access(user.id, postId)` is false
  const { error } = await supabase
    .from('post_likes')
    .insert({
      post_id: postId,
      user_id: user.id
    });

  if (error) {
    console.error('Failed to like post:', error);
    
    // Check if it's an RLS violation (meaning they don't have access)
    if (error.code === '42501') {
      return NextResponse.json({ error: 'You must be subscribed to a qualifying tier to like this post.' }, { status: 403 });
    }
    
    // Check if it's a unique constraint violation (already liked)
    if (error.code === '23505') {
       return NextResponse.json({ success: true }); // Already liked, ignore
    }

    return NextResponse.json({ error: 'Failed to like post' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('post_likes')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Failed to unlike post:', error);
    return NextResponse.json({ error: 'Failed to unlike post' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
