import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: `Unauthorized: ${authError?.message || 'No user session found'}` }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, isPublic, minPrice, imageUrl, thumbnailUrl, embedUrl, pollOptions } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Insert into posts table
    const { data, error } = await supabase
      .from('posts')
      .insert({
        creator_id: user.id, // Ensure only the current creator can create a post for themselves
        title,
        content,
        minimum_tier_amount: isPublic ? 0 : (minPrice || 0),
        is_public: isPublic,
        image_url: imageUrl,
        thumbnail_url: thumbnailUrl,
        embed_url: embedUrl,
        has_poll: Array.isArray(pollOptions) && pollOptions.length > 0
      })
      .select()
      .single();

    if (error) throw error;

    if (Array.isArray(pollOptions) && pollOptions.length > 0) {
      const optionsToInsert = pollOptions.map((opt: any) => ({
        post_id: data.id,
        text: opt.text,
        image_url: opt.imageUrl || null
      }));
      
      const { error: pollError } = await supabase.from('poll_options').insert(optionsToInsert);
      if (pollError) console.error('Error inserting poll options:', pollError);
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Post creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const creatorId = searchParams.get('creatorId');

    const supabase = await createClient();

    let query = supabase
      .from('posts')
      .select('*, creator_profiles(slug, display_name, profiles(full_name, avatar_url)), poll_options(*), poll_votes(*), likes:post_likes(count), comments:post_comments(count)')
      .order('created_at', { ascending: false });

    if (creatorId) {
      query = query.eq('creator_id', creatorId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
