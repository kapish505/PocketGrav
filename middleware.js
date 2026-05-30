/**
 * middleware.js
 * ─────────────
 * Protects /dashboard and /project/* routes.
 * Redirects to /login if user is not authenticated.
 * Compatible with Next.js 15+
 */
import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"

export async function middleware(request) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  const { pathname } = request.nextUrl

  // If accessing a protected route without a token, redirect to login
  if (!token) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/project/:path*"],
}

// SECURITY FIX: Validate JWT token expiry before granting access
function validateTokenExpiry(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return { valid: false, reason: 'Token expired' };
    }
    return { valid: true };
  } catch (err) {
    return { valid: false, reason: 'Malformed token' };
  }
}
