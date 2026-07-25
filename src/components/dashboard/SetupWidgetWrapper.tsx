import { createClient } from '@/lib/supabase/server';
import SetupWidget from '@/components/SetupWidget';

interface SetupWidgetWrapperProps {
  userId: string;
  hasProfile: boolean;
  hasBank: boolean;
  isPublished: boolean;
}

export default async function SetupWidgetWrapper({ 
  userId, 
  hasProfile, 
  hasBank, 
  isPublished 
}: SetupWidgetWrapperProps) {
  const supabase = await createClient();

  // We only fetch what we don't already have from the main page
  const { data: creatorTiers } = await supabase
    .from('tiers')
    .select('id')
    .eq('creator_id', userId)
    .eq('is_active', true)
    .limit(1);

  const hasTiers = Boolean(creatorTiers && creatorTiers.length > 0);

  return (
    <SetupWidget 
      userId={userId} 
      hasProfile={hasProfile} 
      hasBank={hasBank} 
      hasTiers={hasTiers} 
      isPublished={isPublished} 
    />
  );
}
