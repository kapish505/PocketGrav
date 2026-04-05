/**
 * components/LogoutButton.jsx
 * ─────────────────────────────
 * Client component for the logout button.
 * Uses signOut from next-auth/react.
 */
"use client"

import { signOut } from "next-auth/react"

export default function LogoutButton() {
  return (
    <button
      className="btn-logout"
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      Sign out
    </button>
  )
}
