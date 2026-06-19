import { createAdminClient } from '@/lib/supabase/admin';
import { verifyWebhookSignature } from '@/lib/paystack';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    if (!signature || !verifyWebhookSignature(rawBody, signature)) {
      console.error('Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const supabase = createAdminClient(); // We need admin to bypass RLS since this is a server-to-server call

    if (event.event === 'charge.success') {
      const {
        reference,
        amount,          // in kobo
        metadata,
        customer,
        plan
      } = event.data;

      // Ensure we have our custom metadata
      if (!metadata || !metadata.fan_id || metadata.type !== 'subscription') {
        return NextResponse.json({ success: true, message: 'Ignored unrelated charge' });
      }

      // Check if transaction already exists (Paystack can send duplicate webhooks)
      const { data: existingTx } = await supabase
        .from('transactions')
        .select('id')
        .eq('paystack_reference', reference)
        .single();
        
      if (existingTx) {
        return NextResponse.json({ success: true, message: 'Already processed' });
      }

      // 1. Calculate fees (10% platform, 90% creator)
      const platform_fee = Math.floor(amount * 0.1);
      const creator_share = amount - platform_fee;

      // 2. Fetch or create subscription record
      // Look up by fan_id + creator_id (not tier_id) to find ANY existing subscription
      // This prevents duplicate entries when a fan upgrades tiers
      let subscriptionId;
      let isNewSubscriber = false;
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id, tier_id')
        .eq('fan_id', metadata.fan_id)
        .eq('creator_id', metadata.creator_id)
        .eq('status', 'active')
        .single();

      const newEndDate = new Date();
      newEndDate.setMonth(newEndDate.getMonth() + 1);

      if (existingSub) {
        subscriptionId = existingSub.id;
        // Upgrade: update the tier and extend the period
        await supabase
          .from('subscriptions')
          .update({ 
            tier_id: metadata.tier_id,
            current_period_end: newEndDate.toISOString() 
          })
          .eq('id', subscriptionId);
      } else {
        // Brand new subscriber for this creator
        isNewSubscriber = true;
        
        const { data: newSub } = await supabase
          .from('subscriptions')
          .insert({
            fan_id: metadata.fan_id,
            creator_id: metadata.creator_id,
            tier_id: metadata.tier_id,
            paystack_subscription_code: event.data.subscription?.subscription_code || ('PAYSTACK_SUB_' + Date.now()),
            paystack_email_token: event.data.subscription?.email_token || 'TOKEN',
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: newEndDate.toISOString()
          })
          .select()
          .single();
        
        subscriptionId = newSub?.id;
      }

      // 3. Record Transaction
      await supabase
        .from('transactions')
        .insert({
          subscription_id: subscriptionId,
          fan_id: metadata.fan_id,
          creator_id: metadata.creator_id,
          amount,
          platform_fee,
          creator_share,
          paystack_reference: reference,
          status: 'success',
          paid_at: new Date().toISOString()
        });

      // 4. Update Creator's total earnings & subscriber count (only increment for new subscribers)
      const { data: creator } = await supabase
        .from('creator_profiles')
        .select('total_earnings, subscriber_count')
        .eq('id', metadata.creator_id)
        .single();

      if (creator) {
        const updates: any = {
          total_earnings: (creator.total_earnings || 0) + creator_share,
        };
        // Only bump subscriber count for genuinely new subscribers, not tier upgrades
        if (isNewSubscriber) {
          updates.subscriber_count = (creator.subscriber_count || 0) + 1;
        }
        await supabase
          .from('creator_profiles')
          .update(updates)
          .eq('id', metadata.creator_id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Webhook processing error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
