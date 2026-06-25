import { createClient } from '@/lib/supabase/server';
import { createSubaccount, resolveAccountNumber } from '@/lib/paystack';
import { NextResponse } from 'next/server';
import { slugify } from '@/lib/utils';

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
          business_name: profile?.full_name || 'MyAzaa Creator',
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

    // 4. Fetch profile for fallback slug and name info
    const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', user.id).single();

    const updateData: any = {
      id: user.id, // Required for upsert
      bio: bio || '',
      display_name: displayName || null,
      social_links: socialLinks || {},
    };

    // Update slug if display name is provided, otherwise ensure it exists if inserting
    if (displayName) {
      updateData.slug = slugify(displayName);
    } else {
      // If we are upserting and don't have a display name, 
      // we need a fallback slug in case the row doesn't exist yet
      updateData.slug = slugify(profile?.full_name || `creator-${user.id.slice(0, 8)}`);
    }

    if (isVerified) {
      updateData.bank_account_number = accountNumber;
      updateData.bank_code = bankCode;
      updateData.bank_account_name = bankAccountName;
      updateData.paystack_subaccount_code = paystackSubaccountCode;
      updateData.is_verified = true;
    }

    console.log('Updating creator profile with data:', updateData);

    const { data: updatedResult, error: updateError, count } = await supabase
      .from('creator_profiles')
      .upsert(updateData, { onConflict: 'id' })
      .select('id, slug')
      .single();

    if (updateError) {
      console.error('Database update error:', updateError);
      throw updateError;
    }

    console.log(`Successfully upserted profile for User ID: ${user.id}. New slug: ${updatedResult?.slug}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Settings updated successfully',
      slug: updatedResult?.slug
    });

  } catch (error: any) {
    console.error('Creator settings error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
