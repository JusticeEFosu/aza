import { createClient } from '@/lib/supabase/server';
import { createPlan } from '@/lib/paystack';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('tiers')
      .select('*')
      .eq('creator_id', user.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('amount', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, amount, amount_usd, amount_eur, amount_gbp, description, perks } = body;

    // Validate inputs
    if (!name || amount < 100) { // minimum 100 kobo (N1)
      return NextResponse.json({ error: 'Invalid plan details' }, { status: 400 });
    }

    // 1. Create NGN Plan
    const planResNgn = await createPlan({
      name: `${name} (Creator Subscription)`,
      amount: amount,
      interval: 'monthly',
      description: description,
      currency: 'NGN'
    });

    if (!planResNgn.status) {
      return NextResponse.json({ error: 'Failed to create NGN subscription plan on Paystack' }, { status: 500 });
    }

    // @ts-ignore
    const paystackPlanCodeNgn = planResNgn.data.plan_code as string;
    
    // Store plan codes map
    const paystackPlanCodes: Record<string, string> = {
      'NGN': paystackPlanCodeNgn
    };

    // Helper to generate foreign plan
    const generateForeignPlan = async (currency: string, foreignAmount: number) => {
      if (!foreignAmount || foreignAmount <= 0) return;
      const planRes = await createPlan({
        name: `${name} (Creator Subscription - ${currency})`,
        amount: Math.round(foreignAmount * 100), // convert standard unit to cents
        interval: 'monthly',
        description: description,
        currency: currency
      });
      if (planRes.status) {
        // @ts-ignore
        paystackPlanCodes[currency] = planRes.data.plan_code as string;
      }
    };

    // Foreign plans are currently skipped on tier creation to prevent errors on accounts without multi-currency support.
    // (They can be lazily generated when multi-currency is activated).

    // Insert to Supabase Tiers table
    const { data, error } = await supabase
      .from('tiers')
      .insert({
        creator_id: user.id,
        name,
        amount,
        description,
        perks: perks || [],
        paystack_plan_code: paystackPlanCodeNgn, // Keep for backward compatibility
        paystack_plan_codes: paystackPlanCodes,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('Tier creation error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
