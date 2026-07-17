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

    // 2. Fetch creator status for both users to determine who is the creator and if checks are needed
    const [currentUserCreatorRes, targetUserCreatorRes] = await Promise.all([
      supabase.from('creator_profiles').select('id').eq('id', user.id).maybeSingle(),
      supabase.from('creator_profiles').select('id, min_tier_id_for_dm').eq('id', creator_id).maybeSingle()
    ]);

    const currentUserCreator = currentUserCreatorRes?.data;
    const targetUserCreator = targetUserCreatorRes?.data;

    let channelCreatorId = creator_id;
    let skipSubscriptionCheck = false;

    if (currentUserCreator) {
      // Current user is a creator, they can message anyone (fan or another creator)
      channelCreatorId = user.id;
      skipSubscriptionCheck = true;
    } else if (!targetUserCreator) {
      // Neither is a creator, or target is a fan (shouldn't happen on standard flow, but bypass to be safe)
      skipSubscriptionCheck = true;
    }

    const { createAdminClient } = await import('@/lib/supabase/admin');
    const adminSupabase = createAdminClient();

    if (!skipSubscriptionCheck && targetUserCreator) {
      // 3. Determine the required minimum price
      let requiredPrice = 250000; // Platform floor
      
      if (targetUserCreator.min_tier_id_for_dm) {
        const { data: tierData } = await supabase
          .from('tiers')
          .select('amount')
          .eq('id', targetUserCreator.min_tier_id_for_dm)
          .single();
          
        if (tierData && tierData.amount > requiredPrice) {
          requiredPrice = tierData.amount;
        }
      }

      // 4. Query the fan's active subscriptions to this creator
      const { data: subData, error: subError } = await adminSupabase
        .from('subscriptions')
        .select('id, tiers!inner(amount)')
        .eq('fan_id', user.id)
        .eq('creator_id', creator_id)
        .eq('status', 'active');

      const hasQualifyingSubscription = subData && subData.some(sub => {
        // Handle array or single object depending on relation
        const tier = Array.isArray(sub.tiers) ? sub.tiers[0] : sub.tiers;
        return tier && tier.amount >= requiredPrice;
      });

      if (subError || !hasQualifyingSubscription) {
        return NextResponse.json({ 
          error: `Direct Messages are restricted. You must be subscribed to a tier priced at ₦${(requiredPrice / 100).toLocaleString()} or higher to message this creator.` 
        }, { status: 403 });
      }
    }

    // 5. Admin bypass to create the channel (since RLS prevents fans from inserting channels)
    // The fan creates the channel
    const { data: newChannel, error: channelError } = await adminSupabase
      .from('chat_channels')
      .insert({
        type: 'direct_message',
        creator_id: channelCreatorId,
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
