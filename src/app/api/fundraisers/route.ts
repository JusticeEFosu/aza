import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description, targetAmount, showLeaderboard } = await request.json();

    if (!title || !targetAmount) {
      return NextResponse.json({ error: 'Title and Target Amount are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('fundraisers')
      .insert({
        creator_id: user.id,
        title,
        description,
        target_amount: targetAmount,
        show_leaderboard: showLeaderboard ?? true
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Fundraiser creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const creatorId = searchParams.get('creatorId');

    const supabase = await createClient();
    let query = supabase.from('fundraisers').select('*').order('created_at', { ascending: false });

    if (creatorId) {
      query = query.eq('creator_id', creatorId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
