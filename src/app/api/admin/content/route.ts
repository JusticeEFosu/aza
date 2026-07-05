import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient();
    const data = await request.json();
    
    // In a real app we'd also check if the user is an admin here via auth cookie + role,
    // but the API can be secured by middleware or we use a custom server route checking.
    // For simplicity, we just use adminClient and assume the /api/admin/* route is protected by middleware.
    
    const { id, title, slug, content, is_published } = data;

    if (!title || !slug) {
      return NextResponse.json({ error: 'Title and Slug are required' }, { status: 400 });
    }

    if (id === 'new') {
      const { data: newPage, error } = await supabase
        .from('platform_pages')
        .insert({
          title,
          slug,
          content: content || '',
          is_published: !!is_published
        })
        .select()
        .single();
        
      if (error) throw error;
      return NextResponse.json({ page: newPage });
    } else {
      const { data: updatedPage, error } = await supabase
        .from('platform_pages')
        .update({
          title,
          slug,
          content: content || '',
          is_published: !!is_published,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ page: updatedPage });
    }
  } catch (error: any) {
    console.error('Content API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = createAdminClient();
    const { id } = await request.json();
    
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const { error } = await supabase
      .from('platform_pages')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Content Delete API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
