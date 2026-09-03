import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { title, description, targetAmount, isActive, showLeaderboard, autoCloseOnGoal } = body;

    const parsedTargetAmount = targetAmount !== null && targetAmount !== undefined && targetAmount !== ''
      ? Math.floor(Number(targetAmount))
      : null;

    const { data, error } = await supabase
      .from('fundraisers')
      .update({
        title: title?.trim(),
        description: description !== undefined ? (description?.trim() || null) : undefined,
        target_amount: parsedTargetAmount,
        is_active: isActive,
        show_leaderboard: showLeaderboard,
        auto_close_on_goal: parsedTargetAmount ? (autoCloseOnGoal ?? false) : false
      })
      .eq('id', id)
      .eq('creator_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { error } = await supabase
      .from('fundraisers')
      .delete()
      .eq('id', id)
      .eq('creator_id', user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
