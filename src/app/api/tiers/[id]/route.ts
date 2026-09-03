import { createClient } from '@/lib/supabase/server';
import { createPlan } from '@/lib/paystack';
import { NextResponse } from 'next/server';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, amount, amount_usd, amount_eur, amount_gbp, description, perks } = body;

    if (!name || amount < 100) {
      return NextResponse.json({ error: 'Invalid plan details' }, { status: 400 });
    }

    // 1. Fetch existing tier to check ownership and see if price changed
    const { data: existingTier, error: fetchError } = await supabase
      .from('tiers')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingTier) {
      return NextResponse.json({ error: 'Tier not found' }, { status: 404 });
    }

    if (existingTier.creator_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 2. Determine if price changed
    if (existingTier.amount === amount) {
      // Price is identical. Just update name, desc, and perks.
      const { data, error: updateError } = await supabase
        .from('tiers')
        .update({
          name,
          description,
          perks: perks || []
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      return NextResponse.json({ success: true, data });
    } else {
      // Price changed. We must create a NEW Paystack plan, soft delete the old one, and insert a new Tier.
      
      // A. Create new Paystack Plan
      const planResNgn = await createPlan({
        name: `${name} (Creator Subscription)`,
        amount: amount,
        interval: 'monthly',
        description: description,
        currency: 'NGN'
      });

      if (!planResNgn.status) {
        return NextResponse.json({ error: 'Failed to create updated NGN subscription plan on Paystack' }, { status: 500 });
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

      // Foreign plans are currently skipped on tier update to prevent errors on accounts without multi-currency support.

      // B. Insert new Tier
      const { data: newTier, error: insertError } = await supabase
        .from('tiers')
        .insert({
          creator_id: user.id,
          name,
          amount,
          description,
          perks: perks || [],
          paystack_plan_code: paystackPlanCodeNgn,
          paystack_plan_codes: paystackPlanCodes,
          is_active: true
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // C. Soft Delete old tier (Archive)
      await supabase
        .from('tiers')
        .update({ is_active: false })
        .eq('id', id);

      return NextResponse.json({ success: true, data: newTier });
    }

  } catch (error: any) {
    console.error('Tier update error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  // We implement "Archiving" via DELETE method for RESTful conventions
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const { data: existingTier, error: fetchError } = await supabase
      .from('tiers')
      .select('creator_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingTier) {
      return NextResponse.json({ error: 'Tier not found' }, { status: 404 });
    }

    if (existingTier.creator_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Soft delete (Archive)
    const { error: updateError } = await supabase
      .from('tiers')
      .update({ is_active: false })
      .eq('id', id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, message: 'Tier archived' });
  } catch (error: any) {
    console.error('Tier archive error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
