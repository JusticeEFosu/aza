import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name || name.trim().length < 3) {
      return NextResponse.json({ available: false }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Check if the name exists, ignoring the current user's own profile
    let query = supabase
      .from('creator_profiles')
      .select('id')
      .ilike('display_name', name.trim());

    if (user) {
      query = query.neq('id', user.id);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ available: data.length === 0 });
  } catch (error: any) {
    console.error('Check name error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
