import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'fan') {
       return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { fullName, displayName } = body;

    const updateData: any = {};
    if (fullName !== undefined) updateData.full_name = fullName;
    if (displayName !== undefined) updateData.display_name = displayName;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: true, message: 'Nothing to update' });
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, message: 'Profile updated successfully' });

  } catch (error: any) {
    console.error('Fan settings error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
