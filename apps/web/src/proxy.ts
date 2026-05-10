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
      return NextResponse.redirect(new URL("/user", req.url));
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

  // Forward a coach-route hint to server components so the guard in protected-layout
  // can redirect users without coachModeActive away from /user/coach/* paths.
  const isCoachRoute = pathname.startsWith('/user/coach/');
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-is-coach-domain', isCoachRoute ? '1' : '0');

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

// Protect all pages and API routes except login and assets
export const config = {
  matcher: ["/((?!_next|favicon.ico).*)", "/api/:path*"],
};
