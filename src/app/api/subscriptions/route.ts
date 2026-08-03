import { createClient } from '@/lib/supabase/server';
import { initializeTransaction } from '@/lib/paystack';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // We must ensure the user is logged in
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'You must be logged in to subscribe.' }, { status: 401 });
    }

    const { tierId } = await request.json();
    if (!tierId) {
      return NextResponse.json({ error: 'Tier ID is required.' }, { status: 400 });
    }

    // 1. Fetch Tier & Creator Details using Admin client (bypasses RLS on creator_profiles for fans)
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const adminSupabase = createAdminClient();

    const { data: tier, error: tierError } = await adminSupabase
      .from('tiers')
      .select('*, creator_profiles (paystack_subaccount_code, is_verified)')
      .eq('id', tierId)
      .single();

    if (tierError || !tier) {
      console.error('Subscription Tier Lookup Error:', tierError, 'tierId:', tierId);
      return NextResponse.json({ error: 'Tier not found.' }, { status: 404 });
    }

    if (!tier.creator_profiles?.is_verified) {
      return NextResponse.json({ error: 'Creator cannot accept payments yet.' }, { status: 400 });
    }

    // 2. Initialize Transaction in Paystack
    // The plan code ensures recurring billing.
    // The subaccount ensures the creator gets paid (split routing).
    const initResponse = await initializeTransaction({
      email: user.email!, // Guaranteed to exist via Supabase Auth
      amount: tier.amount, // in kobo
      plan: tier.paystack_plan_code,
      subaccount: tier.creator_profiles.paystack_subaccount_code,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/fan`, // Back to fan dashboard on success
      metadata: {
        fan_id: user.id,
        tier_id: tier.id,
        creator_id: tier.creator_id,
        type: 'subscription'
      }
    });

    if (!initResponse.status) {
      return NextResponse.json({ error: 'Failed to connect to checkout.' }, { status: 500 });
    }

    // Return the Paystack checkout URL so the frontend can redirect
    return NextResponse.json({ authorization_url: initResponse.data.authorization_url });

  } catch (error: any) {
    console.error('Subscription error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
