import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Insert a test donation
  const { error } = await supabase
    .from('donations')
    .insert({
      creator_id: user.id,
      amount: 50000, // 500 in kobo
      amount_display: 5.00,
      amount_ngn: 50000,
      currency: 'USD',
      donor_name: 'Test User',
      donor_note: 'This is a test donation alert! Welcome to the stream!',
      email: user.email || 'test@example.com',
      status: 'success'
    });

  if (error) {
    console.error('Error inserting test alert:', error);
    return NextResponse.json({ error: 'Failed to send test alert' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
