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
      } = event.data;

      let activeMetadata = metadata;

      // Handle subscription renewals (Paystack strips custom metadata on recurring charges)
      if (!activeMetadata || !activeMetadata.type) {
        let resolvedSub = null;

        // Strategy 1: Look up by subscription_code (if Paystack includes it)
        const subCode = event.data.subscription?.subscription_code;
        if (subCode) {
          const { data } = await supabase
            .from('subscriptions')
            .select('fan_id, creator_id, tier_id, paystack_subscription_code')
            .eq('paystack_subscription_code', subCode)
            .single();
          resolvedSub = data;
        }

        // Strategy 2: Look up by plan_code + customer email
        if (!resolvedSub) {
          const planCode = event.data.plan?.plan_code || event.data.plan_object?.plan_code;
          const email = event.data.customer?.email;
          if (planCode && email) {
            // Find the tier by plan code, then find the active subscription
            const { data: tier } = await supabase
              .from('tiers')
              .select('id, creator_id')
              .eq('paystack_plan_code', planCode)
              .single();

            if (tier) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', email)
                .single();

              if (profile) {
                resolvedSub = {
                  fan_id: profile.id,
                  creator_id: tier.creator_id,
                  tier_id: tier.id,
                };
              }
            }
          }
        }

        if (resolvedSub) {
          activeMetadata = {
            type: 'subscription',
            fan_id: resolvedSub.fan_id,
            creator_id: resolvedSub.creator_id,
            tier_id: resolvedSub.tier_id
          };
          console.log(`Resolved renewal for fan ${resolvedSub.fan_id} -> creator ${resolvedSub.creator_id}`);
        } else {
          return NextResponse.json({ success: true, message: 'Ignored unrelated charge' });
        }
      }

      if (activeMetadata.type === 'donation' || activeMetadata.type === 'stream_donation') {
        // Handle Donation Success
        const { error } = await supabase.rpc('process_donation_success', {
          p_donation_id: activeMetadata.donation_id,
          p_fundraiser_id: activeMetadata.fundraiser_id || null,
          p_amount: amount
        });

        if (error) {
          console.error('Donation RPC Error:', error);
          throw error;
        }

        return NextResponse.json({ success: true, message: 'Donation Processed via RPC' });
      }

      if (activeMetadata.type !== 'subscription' || !activeMetadata.fan_id) {
        return NextResponse.json({ success: true, message: 'Ignored unrelated charge' });
      }

      // Calculate fees (10% platform, 90% creator)
      const platform_fee = Math.floor(amount * 0.1);
      const creator_share = amount - platform_fee;

      // Call our secure Postgres RPC to handle everything atomically
      const { error } = await supabase.rpc('process_paystack_charge_success', {
        p_reference: reference,
        p_amount: amount,
        p_platform_fee: platform_fee,
        p_creator_share: creator_share,
        p_fan_id: activeMetadata.fan_id,
        p_creator_id: activeMetadata.creator_id,
        p_tier_id: activeMetadata.tier_id,
        p_subscription_code: event.data.subscription?.subscription_code || ('PAYSTACK_SUB_' + Date.now()),
        p_email_token: event.data.subscription?.email_token || 'TOKEN'
      });

      if (error) {
        console.error('RPC Error:', error);
        throw error;
      }
      
      return NextResponse.json({ success: true, message: 'Processed via RPC' });
    } 
    else if (event.event === 'charge.failed') {
      console.log('Charge failed:', event.data.reference);
      return NextResponse.json({ success: true, message: 'Handled failed charge' });
    }
    else if (event.event === 'subscription.disable') {
      console.log('Subscription disabled:', event.data.subscription_code);
      
      await supabase
        .from('subscriptions')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('paystack_subscription_code', event.data.subscription_code);
        
      return NextResponse.json({ success: true, message: 'Handled subscription disabled' });
    }

    return NextResponse.json({ success: true, message: 'Event ignored' });
  } catch (err: any) {
    console.error('Webhook processing error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
