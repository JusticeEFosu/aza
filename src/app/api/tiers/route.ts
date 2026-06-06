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
    const { name, amount, description, perks } = body;

    // Validate inputs
    if (!name || amount < 100) { // minimum 100 kobo (N1)
      return NextResponse.json({ error: 'Invalid plan details' }, { status: 400 });
    }

    // Call Paystack to create a Plan
    // amount is in kobo, interval is monthly
    const planRes = await createPlan({
      name: `${name} (Creator Subscription)`,
      amount: amount,
      interval: 'monthly',
      description: description
    });

    if (!planRes.status) {
      return NextResponse.json({ error: 'Failed to create subscription plan on Paystack' }, { status: 500 });
    }

    // @ts-ignore
    const paystackPlanCode = planRes.data.plan_code;

    // Insert to Supabase Tiers table
    const { data, error } = await supabase
      .from('tiers')
      .insert({
        creator_id: user.id,
        name,
        amount,
        description,
        perks: perks || [],
        paystack_plan_code: paystackPlanCode,
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
