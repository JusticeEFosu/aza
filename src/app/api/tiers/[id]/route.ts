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
    const { name, amount, description, perks } = body;

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
      const planRes = await createPlan({
        name: `${name} (Creator Subscription)`,
        amount: amount,
        interval: 'monthly',
        description: description
      });

      if (!planRes.status) {
        return NextResponse.json({ error: 'Failed to create updated subscription plan on Paystack' }, { status: 500 });
      }

      // @ts-ignore
      const paystackPlanCode = planRes.data.plan_code;

      // B. Insert new Tier
      const { data: newTier, error: insertError } = await supabase
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
