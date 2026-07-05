import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const supabaseServer = await createClient();
    const supabaseAdmin = createAdminClient();
    
    // 1. Verify caller is an admin
    const { data: { user: adminUser } } = await supabaseServer.auth.getUser();
    if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabaseServer
      .from('profiles')
      .select('is_admin')
      .eq('id', adminUser.id)
      .single();

    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // 2. Get target user details
    const { userId, email, returnUrl } = await request.json();

    // 3. Create impersonation token to allow returning
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('admin_impersonation_tokens')
      .insert({
        admin_id: adminUser.id,
        return_url: returnUrl
      })
      .select('token')
      .single();

    if (tokenError) throw tokenError;

    // Set token in an HttpOnly cookie so the impersonated session can return
    const cookieStore = await cookies();
    cookieStore.set('impersonation_return_token', tokenData.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 3600 // 1 hour
    });

    // 4. Generate Magic Link for the target user (does not send email)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
    });

    if (linkError) throw linkError;

    // 5. Return the action link. The client will navigate to it.
    return NextResponse.json({ action_link: linkData.properties.action_link });
    
  } catch (error: any) {
    console.error('Impersonation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
