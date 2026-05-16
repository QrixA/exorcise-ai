import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("exorcise.session_token")?.value;

  // Public routes — no auth needed
  const publicPaths = ["/login", "/api/auth", "/api/admin", "/reset-password"];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Static assets and API routes for sync
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  // No session → redirect to login
  if (!sessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // For onboarding routes, allow access (the page itself checks state)
  if (pathname.startsWith("/onboarding")) {
    return NextResponse.next();
  }

  // Admin routes — handled at page level for role check
  // Protected routes — session exists, continue
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};
