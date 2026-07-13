import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;
  const supabase = await createClient();

  // Fetch comments (RLS will handle whether they can see them or just get empty array)
  // Wait, our RLS says "Anyone can view comments" but the app needs to filter content
  // Actually, wait! In the migration I wrote: 
  // CREATE POLICY "Anyone can view comments" ON post_comments FOR SELECT USING (true);
  // So the server will return them. But we want to filter the text if they don't have access.
  
  // To keep it simple, we can check access server-side before returning
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data: accessData } = await supabase.rpc('has_post_access', {
    p_user_id: user?.id || '00000000-0000-0000-0000-000000000000',
    p_post_id: postId
  });

  const hasAccess = accessData === true;

  const { data: comments, error } = await supabase
    .from('post_comments')
    .select(`
      id,
      content,
      created_at,
      user_id,
      profiles (
        full_name,
        display_name,
        avatar_url
      )
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }

  // If they don't have access, we return the profiles but scrub the content
  const scrubbedComments = comments?.map(c => ({
    ...c,
    content: hasAccess ? c.content : 'Unlock this post to view comments.'
  }));

  return NextResponse.json({ comments: scrubbedComments });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { content } = await req.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
    }

    // Insert comment
    // RLS will block if they don't have `has_post_access()`
    const { data: newComment, error } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        content: content.trim()
      })
      .select(`
        id,
        content,
        created_at,
        user_id,
        profiles (
          full_name,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('Failed to post comment:', error);
      
      // Check if it's an RLS violation (meaning they don't have access)
      if (error.code === '42501') {
        return NextResponse.json({ error: 'You must be subscribed to a qualifying tier to comment on this post.' }, { status: 403 });
      }

      return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
    }

    return NextResponse.json({ comment: newComment });
  } catch (err) {
    console.error('Failed to parse comment request:', err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
