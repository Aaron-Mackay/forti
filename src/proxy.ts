import type {NextRequest} from "next/server";
import {NextResponse} from "next/server";

export async function proxy(req: NextRequest) {
  const {pathname} = req.nextUrl;

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

  return NextResponse.next(); // Let API/routes verify server-side
}

// Protect all pages and API routes except login and assets
export const config = {
  matcher: ["/((?!login|_next|favicon.ico).*)", "/api/:path*"],
};