/**
 * app/page.jsx — Root Route
 * ──────────────────────────
 * Redirects to /dashboard if logged in, /login if not.
 * The middleware also handles this, but this is a clean fallback.
 */
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (session) {
    redirect("/dashboard")
  } else {
    redirect("/login")
  }
}
