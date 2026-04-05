/**
 * app/api/auth/[...nextauth]/route.js
 * ─────────────────────────────────────
 * NextAuth handler — catches all /api/auth/* routes:
 *   /api/auth/signin
 *   /api/auth/signout
 *   /api/auth/callback/google
 *   /api/auth/session
 */
import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

const handler = NextAuth(authOptions)

// Export handler for both GET and POST methods
export { handler as GET, handler as POST }
