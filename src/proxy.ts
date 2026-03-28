import type {NextRequest} from "next/server";
import {NextResponse} from "next/server";

export async function proxy(req: NextRequest) {
  const {pathname} = req.nextUrl;
  const host = req.headers.get('host') ?? '';
  const isVercelApp = host.endsWith('.vercel.app');
  const devCoachCookie = req.cookies.get('__dev_coach_mode')?.value;
  const isCoachDomain = host.includes('coach.')
    || (process.env.VERCEL_ENV === 'preview' && isVercelApp && devCoachCookie === '1');

  // Allow public pages, assets, and login
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/api/auth") ||
    pathname.includes(".") // allow all files with an extension
  ) {
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

  // On the coach subdomain, redirect the root to the clients list
  if (isCoachDomain && pathname === '/') {
    return NextResponse.redirect(new URL('/user/coach/clients', req.url));
  }

  // Forward the coach-domain hint to server components via a request header
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-is-coach-domain', isCoachDomain ? '1' : '0');

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

// Protect all pages and API routes except login and assets
export const config = {
  matcher: ["/((?!login|_next|favicon.ico).*)", "/api/:path*"],
};
