import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasPermission } from '@/lib/permissions';
import { createTransferRecipient, initiateTransfer, initiateBulkTransfer } from '@/lib/paystack';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify Admin status
    const { data: profile } = await supabase.from('profiles').select('admin_role').eq('id', user.id).single();
    if (!hasPermission(profile?.admin_role, 'canApprovePayouts')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { creators } = await request.json();

    if (!creators || !Array.isArray(creators) || creators.length === 0) {
      return NextResponse.json({ error: 'Invalid creators array provided' }, { status: 400 });
    }

    // Single Transfer Logic
    if (creators.length === 1) {
      const creator = creators[0];
      
      // 1. Create Transfer Recipient
      const recipientRes = await createTransferRecipient({
        type: 'nuban',
        name: creator.bank_account_name,
        account_number: creator.bank_account_number,
        bank_code: creator.bank_code,
        currency: 'NGN',
        email: creator.email || undefined
      });

      if (!recipientRes.status) {
        throw new Error('Failed to create Paystack transfer recipient');
      }

      const reference = `payout_${creator.creator_id}_${Date.now()}`;

      // 2. Initiate Transfer
      const transferRes = await initiateTransfer({
        source: 'balance',
        amount: creator.amount,
        recipient: recipientRes.data.recipient_code,
        reason: `MyAzaa Monthly Payout`,
        reference: reference
      });

      if (!transferRes.status) {
        throw new Error('Failed to initiate transfer');
      }

      // 3. Insert Payout Record and update transactions
      const { data: payoutData, error: payoutErr } = await supabase.from('payouts').insert({
        creator_id: creator.creator_id,
        net_amount: creator.amount,
        status: 'pending'
      }).select('id').single();

      if (payoutData?.id) {
        // Mark all currently unsettled successful transactions for this creator as settled and link to this payout
        await supabase.from('transactions')
          .update({ settled: true, payout_id: payoutData.id })
          .eq('creator_id', creator.creator_id)
          .eq('status', 'success')
          .eq('settled', false);
      }

      return NextResponse.json({ success: true, message: 'Transfer initiated' });
    }

    // Bulk Transfer Logic
    const instructions = [];
    const validCreators = [];

    for (const creator of creators) {
      // Need to create recipient for each
      const recipientRes = await createTransferRecipient({
        type: 'nuban',
        name: creator.bank_account_name,
        account_number: creator.bank_account_number,
        bank_code: creator.bank_code,
        currency: 'NGN',
        email: creator.email || undefined
      });

      if (recipientRes.status) {
        const reference = `payout_${creator.creator_id}_${Date.now()}`;
        instructions.push({
          amount: creator.amount,
          recipient: recipientRes.data.recipient_code,
          reason: `MyAzaa Monthly Payout`,
          reference: reference
        });
        
        validCreators.push(creator);
      }
    }

    if (instructions.length === 0) {
      return NextResponse.json({ error: 'Could not process any payouts (Paystack recipient creation failed)' }, { status: 400 });
    }

    const bulkRes = await initiateBulkTransfer(instructions);

    if (!bulkRes.status) {
      throw new Error('Bulk transfer failed');
    }

    // Process Ledger updates for valid creators
    for (const creator of validCreators) {
      const { data: payoutData } = await supabase.from('payouts').insert({
        creator_id: creator.creator_id,
        net_amount: creator.amount,
        status: 'pending'
      }).select('id').single();

      if (payoutData?.id) {
        await supabase.from('transactions')
          .update({ settled: true, payout_id: payoutData.id })
          .eq('creator_id', creator.creator_id)
          .eq('status', 'success')
          .eq('settled', false);
      }
    }

    return NextResponse.json({ success: true, message: `Initiated ${instructions.length} transfers` });

  } catch (error: any) {
    console.error('Payout Approve Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
