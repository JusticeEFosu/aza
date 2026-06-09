import { createClient } from '@/lib/supabase/server';
import { createSubaccount, resolveAccountNumber } from '@/lib/paystack';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { bankCode, accountNumber, bio, displayName, socialLinks } = body;

    // We only create a subaccount if bank details are provided
    let paystackSubaccountCode = null;
    let bankAccountName = null;
    let isVerified = false;

    if (bankCode && accountNumber) {
      // 1. Resolve Account Name with Paystack
      try {
        const resolveRes = await resolveAccountNumber(accountNumber, bankCode);
        if (!resolveRes.status) {
          return NextResponse.json({ error: 'Failed to verify bank account.' }, { status: 400 });
        }
        bankAccountName = resolveRes.data.account_name;
      } catch (err: any) {
        return NextResponse.json({ error: 'Invalid bank account details. Please confirm.' }, { status: 400 });
      }

      // 2. Fetch user's email for the subaccount creation
      const { data: profile } = await supabase.from('profiles').select('email, full_name').eq('id', user.id).single();

      // 3. Create Paystack Subaccount (Platform takes 10%)
      try {
        const platformFeePercentage = 10;
        const subRes = await createSubaccount({
          business_name: profile?.full_name || 'Aza Creator',
          settlement_bank: bankCode,
          account_number: accountNumber,
          percentage_charge: platformFeePercentage,
          primary_contact_email: profile?.email,
        });

        if (!subRes.status) {
          throw new Error('Subaccount creation failed');
        }
        // @ts-ignore
        paystackSubaccountCode = subRes.data.subaccount_code;
        isVerified = true;
      } catch (err) {
        return NextResponse.json({ error: 'Failed to create payment subaccount. Contact support' }, { status: 500 });
      }
    }

    // 4. Update Creator Profile in database
    const updateData: any = {
      bio: bio || '',
      display_name: displayName || null,
      social_links: socialLinks || {},
    };

    if (isVerified) {
      updateData.bank_account_number = accountNumber;
      updateData.bank_code = bankCode;
      updateData.bank_account_name = bankAccountName;
      updateData.paystack_subaccount_code = paystackSubaccountCode;
      updateData.is_verified = true;
    }

    const { error: updateError } = await supabase
      .from('creator_profiles')
      .update(updateData)
      .eq('id', user.id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, message: 'Settings updated successfully' });

  } catch (error: any) {
    console.error('Creator settings error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
