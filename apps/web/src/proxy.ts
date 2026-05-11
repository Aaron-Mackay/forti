import type {NextRequest} from "next/server";
import {NextResponse} from "next/server";

export async function proxy(req: NextRequest) {
  const {pathname} = req.nextUrl;

  // Allow public assets and auth routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/api/auth") ||
    pathname.includes(".") // allow all files with an extension
  ) {
    return NextResponse.next();
  }

  // Redirect authenticated users away from the login page
  if (pathname.startsWith("/login")) {
    const token = req.cookies.get('next-auth.session-token')?.value
      || req.cookies.get('__Secure-next-auth.session-token')?.value;
    if (token) {
      const preferred = req.cookies.get('preferred_mode')?.value;
      const home = preferred === 'coach' ? '/user/coach' : '/user';
      return NextResponse.redirect(new URL(home, req.url));
    }
    return NextResponse.next();
  }

  // Check session token cookie
  const token = req.cookies.get('next-auth.session-token')?.value
    || req.cookies.get('__Secure-next-auth.session-token')?.value;
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    if (!pathname.startsWith("/api/")) {
      loginUrl.searchParams.set("callbackUrl", pathname + (req.nextUrl.search || ""));
    }
    return NextResponse.redirect(loginUrl);
  }

  // Redirect root to the user's last-used mode home
  if (pathname === '/') {
    const preferred = req.cookies.get('preferred_mode')?.value;
    const home = preferred === 'coach' ? '/user/coach' : '/user';
    return NextResponse.redirect(new URL(home, req.url));
  }

  // Forward a coach-route hint to server components so the guard in protected-layout
  // can redirect users without coachModeActive away from /user/coach/* paths.
  const isCoachRoute = pathname === '/user/coach' || pathname.startsWith('/user/coach/');
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-is-coach-domain', isCoachRoute ? '1' : '0');

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // Sync preferred_mode cookie to the current route so that notification deep-links
  // (and any other cross-mode navigation) keep the root redirect correct.
  if (!pathname.startsWith('/api/')) {
    const currentPref = req.cookies.get('preferred_mode')?.value;
    const routePref = isCoachRoute ? 'coach' : 'user';
    if (currentPref !== routePref) {
      response.cookies.set('preferred_mode', routePref, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
        sameSite: 'lax',
      });
    }
  }

  return response;
}

// Protect all pages and API routes except login and assets
export const config = {
  matcher: ["/((?!_next|favicon.ico).*)", "/api/:path*"],
};
