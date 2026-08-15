import { createClient } from '@/lib/supabase/server';
import { initializeTransaction } from '@/lib/paystack';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Auth is optional for stream donations
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const { creatorId, amount, currency, donorName, message, email } = body;

    if (!creatorId || !amount || !currency || !email) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // Amount comes in as standard units (e.g., 5.00), convert to minor units (cents/kobo)
    const amountMinor = Math.round(amount * 100);

    // 1. Fetch Creator Details
    const { data: creator, error: creatorError } = await supabase
      .from('creator_profiles')
      .select('paystack_subaccount_code, is_verified, slug')
      .eq('id', creatorId)
      .single();

    if (creatorError || !creator) {
      return NextResponse.json({ error: 'Creator not found.' }, { status: 404 });
    }

    if (!creator.is_verified) {
      return NextResponse.json({ error: 'Creator cannot accept payments yet.' }, { status: 400 });
    }

    // 2. Calculate NGN equivalent using creator's exchange rates
    let amountNgn = amountMinor; // Default: assume NGN
    if (currency !== 'NGN') {
      const { data: streamSettings } = await supabase
        .from('stream_settings')
        .select('rate_usd, rate_gbp, rate_eur')
        .eq('creator_id', creatorId)
        .single();

      const rates: Record<string, number> = {
        USD: streamSettings?.rate_usd || 1600,
        GBP: streamSettings?.rate_gbp || 2050,
        EUR: streamSettings?.rate_eur || 1750,
      };

      const rate = rates[currency] || 1600;
      // amount is in standard units (e.g. 5.00), multiply by rate to get NGN, then convert to kobo
      amountNgn = Math.round(amount * rate * 100);
    }

    // 3. Insert pending donation record using Admin client
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const adminSupabase = createAdminClient();

    const { data: donation, error: donationError } = await adminSupabase
      .from('donations')
      .insert({
        creator_id: creatorId,
        fan_id: user?.id || null,
        amount: amountMinor,
        amount_display: amount,
        amount_ngn: amountNgn,
        currency: currency,
        donor_name: donorName || null,
        donor_note: message || null,
        email,
        status: 'pending'
      })
      .select()
      .single();

    if (donationError) {
      console.error('Failed to insert donation:', donationError);
      return NextResponse.json({ error: 'Failed to create record.' }, { status: 500 });
    }

    // 3. Initialize Transaction in Paystack
    const initResponse = await initializeTransaction({
      email,
      amount: amountMinor,
      currency: currency,
      subaccount: creator.paystack_subaccount_code || undefined,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/c/${creator.slug}`,
      metadata: {
        donation_id: donation.id,
        creator_id: creatorId,
        type: 'stream_donation'
      }
    });

    if (!initResponse.status) {
       await adminSupabase.from('donations').delete().eq('id', donation.id);
       return NextResponse.json({ error: initResponse.message || 'Failed to connect to checkout.' }, { status: 500 });
    }

    // Update the paystack_reference in the DB
    await adminSupabase.from('donations').update({ paystack_reference: initResponse.data.reference }).eq('id', donation.id);

    return NextResponse.json({ authorizationUrl: initResponse.data.authorization_url });

  } catch (error: any) {
    console.error('Stream Donation error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
