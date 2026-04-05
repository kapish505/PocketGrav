/**
 * components/RefreshTimer.jsx
 * ─────────────────────────────
 * Invisible client component that calls router.refresh() on an interval.
 * This makes server components re-fetch fresh data from Supabase.
 * Renders nothing — purely a side-effect component.
 */
"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function RefreshTimer({ interval = 10000 }) {
  const router = useRouter()

  useEffect(() => {
    const timer = setInterval(() => {
      router.refresh()
    }, interval)

    return () => clearInterval(timer) // cleanup on unmount
  }, [router, interval])

  return null
}
