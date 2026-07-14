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

      // Ensure we have our custom metadata
      if (!metadata || !metadata.type) {
        return NextResponse.json({ success: true, message: 'Ignored unrelated charge' });
      }

      if (metadata.type === 'donation') {
        // Handle Donation Success
        const { error } = await supabase.rpc('process_donation_success', {
          p_donation_id: metadata.donation_id,
          p_fundraiser_id: metadata.fundraiser_id || null,
          p_amount: amount
        });

        if (error) {
          console.error('Donation RPC Error:', error);
          throw error;
        }

        return NextResponse.json({ success: true, message: 'Donation Processed via RPC' });
      }

      if (metadata.type !== 'subscription' || !metadata.fan_id) {
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
        p_fan_id: metadata.fan_id,
        p_creator_id: metadata.creator_id,
        p_tier_id: metadata.tier_id,
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
