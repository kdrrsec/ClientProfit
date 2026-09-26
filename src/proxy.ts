import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic redirect only (cookie presence). Real authentication and
 * organization checks happen server-side in requireOrgContext().
 */
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/clients/:path*", "/profitability/:path*", "/domains/:path*", "/hosting/:path*", "/costs/:path*", "/time/:path*", "/onboarding"],
};
