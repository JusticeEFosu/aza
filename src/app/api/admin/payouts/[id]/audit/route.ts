import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: payoutId } = await params;
    const supabase = createAdminClient();
    
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select(`
        id,
        created_at,
        creator_share,
        profiles!transactions_fan_id_fkey ( full_name, display_name )
      `)
      .eq('payout_id', payoutId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ transactions: transactions || [] });
  } catch (error: any) {
    console.error('Audit Fetch Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
