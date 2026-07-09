import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { creator_id } = await request.json();

    if (!creator_id) {
      return NextResponse.json({ error: 'creator_id is required' }, { status: 400 });
    }

    if (user.id === creator_id) {
      return NextResponse.json({ error: 'You cannot message yourself.' }, { status: 400 });
    }

    // 1. Check if a DM channel already exists between these two users
    // We look for a channel of type 'direct_message' where both users are participants.
    const { data: existingParticipant } = await supabase
      .from('chat_participants')
      .select('channel_id')
      .eq('profile_id', user.id);

    if (existingParticipant && existingParticipant.length > 0) {
      const channelIds = existingParticipant.map(p => p.channel_id);
      
      const { data: matchingChannel } = await supabase
        .from('chat_channels')
        .select(`
          id,
          type,
          chat_participants!inner(profile_id)
        `)
        .eq('type', 'direct_message')
        .in('id', channelIds)
        .eq('chat_participants.profile_id', creator_id)
        .limit(1)
        .single();

      if (matchingChannel) {
        // Channel already exists, return success
        return NextResponse.json({ success: true, channel_id: matchingChannel.id });
      }
    }

    // 2. Channel doesn't exist, verify fan meets the minimum tier requirement
    const { data: meetsReq, error: reqError } = await supabase.rpc('meets_min_tier_requirement', {
      p_fan_id: user.id,
      p_creator_id: creator_id
    });

    if (reqError || !meetsReq) {
      console.log('Tier check failed', reqError, meetsReq);
      return NextResponse.json({ error: 'You do not meet the minimum tier requirement to message this creator, or you are not subscribed.' }, { status: 403 });
    }

    // 3. Admin bypass to create the channel (since RLS prevents fans from inserting channels)
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const adminSupabase = createAdminClient();

    // The fan creates the channel
    const { data: newChannel, error: channelError } = await adminSupabase
      .from('chat_channels')
      .insert({
        type: 'direct_message',
        creator_id: creator_id,
      })
      .select('id')
      .single();

    if (channelError) {
      console.error('Failed to create channel:', channelError);
      return NextResponse.json({ error: 'Failed to create channel.' }, { status: 500 });
    }

    // Add the creator as participant
    const { error: participantError1 } = await adminSupabase
      .from('chat_participants')
      .insert({
        channel_id: newChannel.id,
        profile_id: creator_id
      });

    // Add the fan as participant
    const { error: participantError2 } = await adminSupabase
      .from('chat_participants')
      .insert({
        channel_id: newChannel.id,
        profile_id: user.id
      });

    if (participantError1 || participantError2) {
      console.error('Failed to add participants:', participantError1 || participantError2);
      // Rollback channel creation
      await adminSupabase.from('chat_channels').delete().eq('id', newChannel.id);
      return NextResponse.json({ error: 'Failed to initiate conversation.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, channel_id: newChannel.id });

  } catch (error: any) {
    console.error('Initiate message error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
