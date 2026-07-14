import { createClient } from '@/lib/supabase/server';
import { initializeTransaction } from '@/lib/paystack';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Auth is optional for donations (guest checkout allowed)
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const { creatorId, fundraiserId, amount, name, note, email, callbackUrl } = body;

    if (!creatorId || !amount || !email) {
      return NextResponse.json({ error: 'Creator ID, amount, and email are required.' }, { status: 400 });
    }

    // 1. Fetch Creator Details to get Subaccount
    const { data: creator, error: creatorError } = await supabase
      .from('creator_profiles')
      .select('paystack_subaccount_code, is_verified, slug')
      .eq('id', creatorId)
      .single();

    if (creatorError || !creator) {
      console.error('Failed to fetch creator:', creatorError, 'creatorId:', creatorId);
      return NextResponse.json({ error: 'Creator not found.' }, { status: 404 });
    }

    if (!creator.is_verified) {
      return NextResponse.json({ error: 'Creator cannot accept payments yet.' }, { status: 400 });
    }

    // 2. Platform fee is 5%
    const platformFee = Math.floor(amount * 0.05);

    // 3. Insert pending donation record (server-side uses admin client for guests)
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const adminSupabase = createAdminClient();

    const { data: donation, error: donationError } = await adminSupabase
      .from('donations')
      .insert({
        creator_id: creatorId,
        fundraiser_id: fundraiserId || null,
        fan_id: user?.id || null,
        amount,
        platform_fee: platformFee,
        donor_name: name || null,
        donor_note: note || null,
        email,
        status: 'pending'
      })
      .select()
      .single();

    if (donationError) {
      throw donationError;
    }

    // 4. Initialize Transaction in Paystack
    const initResponse = await initializeTransaction({
      email,
      amount, // in kobo
      subaccount: creator.paystack_subaccount_code,
      callback_url: callbackUrl || `${process.env.NEXT_PUBLIC_APP_URL}/c/${creator.slug}`,
      metadata: {
        donation_id: donation.id,
        creator_id: creatorId,
        fundraiser_id: fundraiserId || null,
        type: 'donation'
      }
    });

    if (!initResponse.status) {
       // Optionally delete the pending donation if paystack init fails
       await adminSupabase.from('donations').delete().eq('id', donation.id);
       return NextResponse.json({ error: 'Failed to connect to checkout.' }, { status: 500 });
    }

    // Update the paystack_reference in the DB
    await adminSupabase.from('donations').update({ paystack_reference: initResponse.data.reference }).eq('id', donation.id);

    // Return the Paystack checkout URL so the frontend can redirect
    return NextResponse.json({ authorization_url: initResponse.data.authorization_url });

  } catch (error: any) {
    console.error('Donation error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
