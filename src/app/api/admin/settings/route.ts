import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('admin_role')
      .eq('id', user.id)
      .single();

    if (!profile || !['super_admin', 'finance_manager'].includes(profile.admin_role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is not found
      throw error;
    }

    return NextResponse.json({ data: data || null });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('admin_role')
      .eq('id', user.id)
      .single();

    if (!profile || !['super_admin', 'finance_manager'].includes(profile.admin_role || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { suggested_rate_usd, suggested_rate_eur, suggested_rate_gbp } = body;

    if (!suggested_rate_usd || !suggested_rate_eur || !suggested_rate_gbp) {
      return NextResponse.json({ error: 'Missing required rates' }, { status: 400 });
    }

    // We assume there's always one row, let's get its ID or just update all (since it's a singleton)
    // Supabase update without eq will fail if no eq is provided in JS SDK, so let's get the ID first
    const { data: existing } = await supabase
      .from('platform_settings')
      .select('id')
      .limit(1)
      .single();

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('platform_settings')
        .update({
          suggested_rate_usd,
          suggested_rate_eur,
          suggested_rate_gbp
        })
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    } else {
      // In case the singleton doesn't exist yet
      const { data, error } = await supabase
        .from('platform_settings')
        .insert({
          suggested_rate_usd,
          suggested_rate_eur,
          suggested_rate_gbp
        })
        .select()
        .single();
        
      if (error) throw error;
      result = data;
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Settings update error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
