import { NextResponse } from "next/server";
import { auth } from "@/auth";

const MARKETING_PATHS = ["/", "/pricing", "/privacy", "/demo", "/docs"];
const PUBLIC_PATHS = ["/api", "/_next", "/favicon.ico", "/health", "/login", "/signup"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Always allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Always allow marketing paths
  if (MARKETING_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // All other paths require auth
  if (!req.auth) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|health).*)"],
};
