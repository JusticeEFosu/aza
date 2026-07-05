import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // Use request.url to ensure we redirect back to the exact same origin (prevents cross-origin cookie loss on Vercel preview URLs)
  // Use status 303 (See Other) to force a GET request instead of a 307 POST redirect
  return NextResponse.redirect(new URL('/', request.url), { status: 303 });
}
