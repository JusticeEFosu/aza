import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, minPrice, isPublic, imageUrl, thumbnailUrl, embedUrl } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('posts')
      .update({
        title,
        content,
        minimum_tier_amount: isPublic ? 0 : (minPrice || 0),
        is_public: isPublic,
        image_url: imageUrl,
        thumbnail_url: thumbnailUrl,
        embed_url: embedUrl
      })
      .eq('id', id)
      .eq('creator_id', user.id) // Ensure they can only update their own post
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Post update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id)
      .eq('creator_id', user.id); // Ensure they can only delete their own post

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Post deletion error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
