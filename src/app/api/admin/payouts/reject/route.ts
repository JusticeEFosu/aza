import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify Admin status
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { payout_id } = await request.json();

    if (!payout_id) {
      return NextResponse.json({ error: 'Invalid payout ID provided' }, { status: 400 });
    }

    // Fetch the pending payout
    const { data: payout, error: payoutError } = await supabase
      .from('payouts')
      .select('id, status, net_amount, creator_id')
      .eq('id', payout_id)
      .in('status', ['pending', 'calculated'])
      .single();

    if (payoutError || !payout) {
      return NextResponse.json({ error: 'Payout not found or not in pending state' }, { status: 404 });
    }

    // Mark as failed
    await supabase.from('payouts').update({ status: 'failed' }).eq('id', payout.id);

    // Note: In a real system, you might want to credit the balance back to the creator's wallet here,
    // or log a transaction marking a refund. Since our total balance is calculated dynamically
    // based on `transactions` table (and payouts are separate), marking it as failed just prevents it from settling.

    return NextResponse.json({ success: true, message: 'Payout rejected' });

  } catch (error: any) {
    console.error('Payout Reject Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
