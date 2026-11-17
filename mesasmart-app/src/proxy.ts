import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin");
    const expected = process.env.APP_URL ? new URL(process.env.APP_URL).origin : request.nextUrl.origin;
    const allowedOrigins = new Set([expected]);
    // Local development uses the LAN URL for phones and loopback for the PC.
    // Production continues to trust only the configured application origin.
    if (process.env.NODE_ENV === "development") {
      const port = new URL(expected).port;
      const suffix = port ? `:${port}` : "";
      for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
        allowedOrigins.add(`http://${host}${suffix}`);
      }
    }
    if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && !allowedOrigins.has(origin))) {
      return NextResponse.json({ error: "Origen no autorizado" }, { status: 403 });
    }
  }
  const response = NextResponse.next();
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  if (request.nextUrl.pathname.startsWith("/api/")) response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = { matcher: ["/api/:path*", "/mesa/:path*"] };
