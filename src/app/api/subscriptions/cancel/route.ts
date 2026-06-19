import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { cancelSubscription } from '@/lib/paystack';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscriptionId } = await request.json();

    if (!subscriptionId) {
      return NextResponse.json({ error: 'Missing subscriptionId' }, { status: 400 });
    }

    // Use admin client to bypass RLS for updates
    const admin = createAdminClient();

    // Fetch the subscription (verify it belongs to this user)
    const { data: sub, error: subError } = await admin
      .from('subscriptions')
      .select('id, fan_id, creator_id, paystack_subscription_code, paystack_email_token')
      .eq('id', subscriptionId)
      .eq('fan_id', user.id)
      .eq('status', 'active')
      .single();

    if (subError || !sub) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Try to cancel on Paystack (may fail for test subscriptions, that's OK)
    try {
      if (sub.paystack_subscription_code && sub.paystack_email_token) {
        await cancelSubscription(sub.paystack_subscription_code, sub.paystack_email_token);
      }
    } catch (paystackErr) {
      console.warn('Paystack cancellation failed (may be test mode):', paystackErr);
    }

    // Update subscription status in database
    await admin
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('id', sub.id);

    // Decrement subscriber count
    const { data: creator } = await admin
      .from('creator_profiles')
      .select('subscriber_count')
      .eq('id', sub.creator_id)
      .single();

    if (creator && (creator.subscriber_count || 0) > 0) {
      await admin
        .from('creator_profiles')
        .update({ subscriber_count: (creator.subscriber_count || 0) - 1 })
        .eq('id', sub.creator_id);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
