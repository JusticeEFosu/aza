import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Verify caller is super_admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('admin_role')
      .eq('id', user.id)
      .single();

    if (profile?.admin_role !== 'super_admin') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const formData = await request.formData();
    const targetUserId = formData.get('userId') as string;

    if (!targetUserId || targetUserId === user.id) {
      return new NextResponse('Invalid user ID', { status: 400 });
    }

    // Revoke role (set to null)
    const { error } = await supabase
      .from('profiles')
      .update({ admin_role: null })
      .eq('id', targetUserId);

    if (error) {
      console.error('Error revoking role:', error);
      return new NextResponse('Error revoking role', { status: 500 });
    }

    return NextResponse.redirect(new URL('/admin/team', request.url));
  } catch (err: any) {
    console.error('Error in revoke route:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
