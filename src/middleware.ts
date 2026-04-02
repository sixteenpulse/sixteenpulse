import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    // Example middleware to require auth. In Edge runtime, we often decode JWTs using `jose`
    // or use `getIronSession` if configured for Edge. 
    // For this prototype, we're building the skeleton for multi-tenancy.

    const isAuthRoute = request.nextUrl.pathname.startsWith("/login") || request.nextUrl.pathname.startsWith("/signup");
    const isProtectedRoute = !isAuthRoute && !request.nextUrl.pathname.startsWith("/api");

    // Simple edge session check (iron-session sets a cookie)
    const hasSession = request.cookies.has("crm_session");

    if (!hasSession && isProtectedRoute) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    if (hasSession && isAuthRoute) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
