import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  const since = req.nextUrl.searchParams.get('since');

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    // 1. Verify token and get settings
    const { data: settings, error: settingsError } = await supabase
      .from('stream_settings')
      .select('creator_id, tts_enabled, tts_min_ngn, alert_duration')
      .eq('overlay_token', token)
      .single();

    if (settingsError || !settings) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 2. Fetch new donations
    let query = supabase
      .from('donations')
      .select('id, amount_display, currency, amount_ngn, donor_name, donor_note, created_at')
      .eq('creator_id', settings.creator_id)
      .eq('status', 'success')
      .order('created_at', { ascending: true });

    if (since) {
      // Decode since timestamp, assuming ISO format
      const decodedSince = decodeURIComponent(since);
      query = query.gt('created_at', decodedSince);
    } else {
      // If no 'since' is provided, we might be starting up. We shouldn't return all history.
      // Just return nothing or only things from the last 1 minute to avoid re-triggering old alerts on OBS refresh.
      const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
      query = query.gt('created_at', oneMinuteAgo);
    }

    const { data: donations, error: donationsError } = await query;

    if (donationsError) {
      throw donationsError;
    }

    // Determine the new 'since' timestamp to be the latest donation's created_at or the current time
    let nextSince = since || new Date().toISOString();
    if (donations && donations.length > 0) {
      nextSince = donations[donations.length - 1].created_at;
    } else {
      nextSince = new Date().toISOString(); // Keep moving the cursor forward if no new donations
    }

    return NextResponse.json({
      settings: {
        ttsEnabled: settings.tts_enabled,
        ttsMinNgn: settings.tts_min_ngn,
        alertDuration: settings.alert_duration
      },
      donations: donations || [],
      nextSince
    });

  } catch (err: any) {
    console.error('Polling error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
