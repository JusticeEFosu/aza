import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('impersonation_return_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'No return token found. You may need to manually log back in as admin.' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // 1. Verify token in database
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('admin_impersonation_tokens')
      .select('admin_id, return_url, expires_at')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json({ error: 'Invalid or expired return token' }, { status: 400 });
    }

    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Return token expired' }, { status: 400 });
    }

    // 2. Burn the token (one-time use)
    await supabaseAdmin
      .from('admin_impersonation_tokens')
      .delete()
      .eq('token', token);
      
    // Clear the cookie
    cookieStore.delete('impersonation_return_token');

    // 3. Get admin email
    const { data: adminUser, error: adminError } = await supabaseAdmin.auth.admin.getUserById(tokenData.admin_id);
    
    if (adminError || !adminUser?.user?.email) {
      throw new Error('Failed to fetch admin user details');
    }

    // 4. Generate Magic Link to log back in as admin
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: adminUser.user.email,
    });

    if (linkError) throw linkError;

    // 5. Return the action link and the original return URL
    return NextResponse.json({ 
      action_link: linkData.properties.action_link,
      return_url: tokenData.return_url
    });
    
  } catch (error: any) {
    console.error('Return from impersonation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
