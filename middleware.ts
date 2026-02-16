import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  if (process.env.WEBSITE_STATUS === "MAINTANANCE") {
    // Allow the maintenance page itself and static assets
    if (
      request.nextUrl.pathname === "/maintenance" ||
      request.nextUrl.pathname.startsWith("/_next/")
    ) {
      return NextResponse.next();
    }

    // Block API routes with a JSON response
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Service is under maintenance" },
        { status: 503 },
      );
    }

    // Rewrite all other routes to the maintenance page
    return NextResponse.rewrite(new URL("/maintenance", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
