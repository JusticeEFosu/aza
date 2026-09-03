import { createClient } from '@/lib/supabase/server';
import { initializeTransaction, createPlan } from '@/lib/paystack';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

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

    // 1. Fetch Tier & Creator Details to get Plan Code & Subaccount
    const { data: tier, error: tierError } = await supabase
      .from('tiers')
      .select('*, creator_profiles!tiers_creator_id_fkey (paystack_subaccount_code, is_verified)')
      .eq('id', tierId)
      .single();

    if (tierError || !tier) {
      return NextResponse.json({ error: 'Tier not found.' }, { status: 404 });
    }

    if (!tier.creator_profiles?.is_verified) {
      return NextResponse.json({ error: 'Creator cannot accept payments yet.' }, { status: 400 });
    }

    // Determine target currency from cookie or headers
    const cookieStore = await cookies();
    const targetCurrency = cookieStore.get('user-currency')?.value || 'NGN';
    
    let planCode = null;
    let finalAmount = tier.amount; // default kobo

    const planCodes = tier.paystack_plan_codes as Record<string, string> || {};
    
    if (planCodes[targetCurrency]) {
      planCode = planCodes[targetCurrency];
      // We don't have the exact amount stored in our DB for foreign plans, 
      // but Paystack knows the amount from the plan_code. 
      // However, initializeTransaction requires amount. 
      // Actually Paystack requires amount *only if* it overrides the plan.
      // But we must pass the same currency and amount.
      // We must dynamically calculate the amount if we don't store it, or Paystack uses the plan amount if we pass 0?
      // Wait, Paystack initialize takes amount. If we pass plan, the plan dictates the amount. 
      // But passing the base NGN amount while the plan is USD will throw an error. 
      // Let's pass the amount by calculating it now, or better: 
      // Paystack initialize documentation: If you pass `plan`, you don't need to pass `amount`. It will use the plan's amount. 
      // We will pass undefined to amount to let the plan handle it.
      finalAmount = 0;
    } else if (targetCurrency !== 'NGN') {
      // Lazy Generation for missing foreign plans on existing tiers
      // Fetch platform settings for conversion
      const { data: settings } = await supabase.from('platform_settings').select('*').limit(1).single();
      let rate = 1260; // fallback
      if (settings) {
        if (targetCurrency === 'USD') rate = settings.suggested_rate_usd;
        if (targetCurrency === 'EUR') rate = settings.suggested_rate_eur;
        if (targetCurrency === 'GBP') rate = settings.suggested_rate_gbp;
      }
      
      const ngnValue = tier.amount / 100; // standard unit
      let foreignValue = Math.ceil(ngnValue / rate);
      if (foreignValue < 1) foreignValue = 1;
      
      const newPlanAmount = foreignValue * 100; // in cents
      
      const planRes = await createPlan({
        name: `${tier.name} (Creator Subscription - ${targetCurrency})`,
        amount: newPlanAmount,
        interval: 'monthly',
        description: tier.description || undefined,
        currency: targetCurrency
      });
      
      if (planRes.status) {
        // @ts-ignore
        planCode = planRes.data.plan_code as string;
        planCodes[targetCurrency] = planCode;
        
        // Update database asynchronously or synchronously
        await supabase
          .from('tiers')
          .update({ paystack_plan_codes: planCodes })
          .eq('id', tier.id);
      } else {
        return NextResponse.json({ error: 'Failed to lazy-generate foreign subscription plan' }, { status: 500 });
      }
    } else {
      // NGN fallback
      planCode = tier.paystack_plan_code || planCodes['NGN'];
      finalAmount = tier.amount;
    }

    // 2. Initialize Transaction in Paystack
    const initResponse = await initializeTransaction({
      email: user.email!, 
      amount: finalAmount || 0, // 0 or plan-based fallback
      plan: planCode || undefined,
      currency: targetCurrency === 'NGN' ? undefined : targetCurrency, // explicitly tell Paystack the currency
      subaccount: tier.creator_profiles.paystack_subaccount_code || undefined,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/fan`,
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
