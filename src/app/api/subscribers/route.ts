import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all subscriptions for this creator, joined with fan profile and tier info
    const { data: subscribers, error } = await supabase
      .from('subscriptions')
      .select(`
        id,
        status,
        created_at,
        current_period_end,
        fan_id,
        tier_id,
        tiers (id, name, amount),
        profiles:fan_id (id, display_name, full_name, avatar_url, email)
      `)
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching subscribers:', error);
      return NextResponse.json({ error: 'Failed to fetch subscribers' }, { status: 500 });
    }

    // Also fetch the creator's tiers for the filter dropdown & badge ranking
    const { data: tiers } = await supabase
      .from('tiers')
      .select('id, name, amount')
      .eq('creator_id', user.id)
      .eq('is_active', true)
      .order('amount', { ascending: true });

    return NextResponse.json({ subscribers: subscribers || [], tiers: tiers || [] });
  } catch (err: any) {
    console.error('Subscribers API error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
