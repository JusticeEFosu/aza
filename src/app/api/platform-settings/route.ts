import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('platform_settings')
      .select('suggested_rate_usd, suggested_rate_eur, suggested_rate_gbp')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!data) {
      // Return defaults if singleton doesn't exist
      return NextResponse.json({
        data: {
          suggested_rate_usd: 1260,
          suggested_rate_eur: 1475,
          suggested_rate_gbp: 1740,
        }
      });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
