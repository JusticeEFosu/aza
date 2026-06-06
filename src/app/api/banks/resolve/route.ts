import { createClient } from '@/lib/supabase/server';
import { resolveAccountNumber } from '@/lib/paystack';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { bankCode, accountNumber } = body;

    if (!bankCode || !accountNumber || accountNumber.length !== 10) {
      return NextResponse.json({ error: 'Invalid details' }, { status: 400 });
    }

    const resolveRes = await resolveAccountNumber(accountNumber, bankCode);
    
    if (!resolveRes.status) {
      return NextResponse.json({ error: 'Bank account not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      account_name: resolveRes.data.account_name 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

