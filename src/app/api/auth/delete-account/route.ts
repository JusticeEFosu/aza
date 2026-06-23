import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const adminAuth = createAdminClient().auth;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use the admin service role to forcefully delete the user
  // This causes a cascade deletion in the database for profiles / posts based on RLS & FK constraints
  const { error } = await adminAuth.admin.deleteUser(user.id);
  
  if (error) {
    console.error('Failed to delete account:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Optionally clear session on the way out
  await supabase.auth.signOut();
  
  return NextResponse.json({ success: true });
}
