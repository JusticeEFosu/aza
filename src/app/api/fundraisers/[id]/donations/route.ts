import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the user owns this fundraiser
    const { data: fundraiser, error: fundError } = await supabase
      .from('fundraisers')
      .select('creator_id')
      .eq('id', id)
      .single();

    if (fundError || !fundraiser || fundraiser.creator_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch the donations using admin client to bypass any read restrictions for the creator
    const { data: donations, error: donationsError } = await adminSupabase
      .from('donations')
      .select('id, amount, donor_name, donor_note, created_at, status')
      .eq('fundraiser_id', id)
      .eq('status', 'success')
      .order('created_at', { ascending: false });

    if (donationsError) {
      throw donationsError;
    }

    return NextResponse.json({ data: donations });
  } catch (error: any) {
    console.error('Error fetching donations:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
