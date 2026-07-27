import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasPermission } from '@/lib/permissions';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabaseUser = await createClient();
    const { data: { user } } = await supabaseUser.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabaseUser.from('profiles').select('admin_role').eq('id', user.id).single();
    if (!hasPermission(profile?.admin_role, 'canSuspendFundraisers')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { suspend } = body;

    const supabaseAdmin = createAdminClient();

    const { error } = await supabaseAdmin
      .from('fundraisers')
      .update({ status: suspend ? 'suspended' : 'active', updated_at: new Date().toISOString() })
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Suspend error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
