import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const reportId = formData.get('reportId') as string;
    const postId = formData.get('postId') as string;
    const action = formData.get('action') as string;

    if (!reportId || !action) {
      return NextResponse.redirect(new URL('/admin/moderation?error=Missing+Data', request.url));
    }

    const supabaseAdmin = createAdminClient();

    if (action === 'delete') {
      // 1. Delete the post
      if (postId) {
        await supabaseAdmin.from('posts').delete().eq('id', postId);
      }
      // 2. Mark report as resolved
      await supabaseAdmin.from('content_reports').update({ status: 'resolved' }).eq('id', reportId);
    } else if (action === 'dismiss') {
      // Mark report as dismissed
      await supabaseAdmin.from('content_reports').update({ status: 'dismissed' }).eq('id', reportId);
    }

    // Redirect back to moderation queue
    return NextResponse.redirect(new URL('/admin/moderation?success=true', request.url));
  } catch (error: any) {
    console.error('Moderation resolve error:', error);
    return NextResponse.redirect(new URL(`/admin/moderation?error=${encodeURIComponent(error.message)}`, request.url));
  }
}
