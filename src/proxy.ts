import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const country =
    request.headers.get('x-vercel-ip-country') ||
    request.headers.get('cf-ipcountry') ||
    'NG';

  let currency = 'USD'; // Default for the rest of the world

  if (country === 'NG') {
    currency = 'NGN';
  } else if (country === 'GB') {
    currency = 'GBP';
  } else if (
    [
      'FR', 'DE', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'FI', 'IE', 'GR', 'EE', 
      'LV', 'LT', 'SK', 'SI', 'CY', 'MT'
    ].includes(country)
  ) {
    currency = 'EUR';
  }

  // Set user-currency cookie safely before Supabase attaches auth cookies
  supabaseResponse.cookies.set('user-currency', currency, {
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session and verify JWT
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // 1. Protected routes: redirect to login if not authenticated
  const protectedPaths = ['/fan', '/creator', '/admin'];
  const isProtectedRoute = protectedPaths.some((p) =>
    path === p || path.startsWith(`${p}/`)
  );

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', path);
    return NextResponse.redirect(url);
  }

  // 2. If logged in and trying to access login/signup, redirect away
  // We bounce them to /fan, and the fan/layout.tsx will redirect them if they are actually a creator or admin.
  // This completely eliminates the need to fetch the database on every middleware run.
  if (user && (path === '/login' || path === '/signup')) {
    const url = request.nextUrl.clone();
    url.pathname = '/fan';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/webhooks).*)',
  ],
};
