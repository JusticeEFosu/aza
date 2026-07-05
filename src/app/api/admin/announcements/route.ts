import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient();
    const { message, isActive } = await request.json();

    // Just update the first/only row in platform_announcements
    // (Assuming there is only one row from the migration)
    const { data, error } = await supabase
      .from('platform_announcements')
      .update({ message, is_active: isActive, updated_at: new Date().toISOString() })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Dummy condition to update all or just limit to 1 if we had a specific ID

    if (error) {
      console.error('Error updating announcement:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Announcements API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
