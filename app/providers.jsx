/**
 * app/providers.jsx — Client Providers
 * ──────────────────────────────────────
 * Must be a client component to use SessionProvider.
 * SessionProvider gives all child components access to the auth session.
 */
"use client"

import { SessionProvider } from "next-auth/react"

export function Providers({ children }) {
  return <SessionProvider>{children}</SessionProvider>
}
