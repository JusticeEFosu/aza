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
    const email = formData.get('email') as string;
    const role = formData.get('role') as string;

    if (!email || !role) {
      return new NextResponse('Missing email or role', { status: 400 });
    }

    // Assign role
    const { error } = await supabase
      .from('profiles')
      .update({ admin_role: role })
      .eq('email', email);

    if (error) {
      console.error('Error assigning role:', error);
      return new NextResponse('Error assigning role', { status: 500 });
    }

    return NextResponse.redirect(new URL('/admin/team', request.url));
  } catch (err: any) {
    console.error('Error in assign route:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
