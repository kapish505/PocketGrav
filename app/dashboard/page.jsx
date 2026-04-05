/**
 * app/dashboard/page.jsx — Main Dashboard
 * ─────────────────────────────────────────
 * Server component: fetches all AntiGravity sessions from Supabase
 * for the logged-in user and renders them as cards.
 *
 * Auto-refreshes every 10 seconds via the RefreshTimer client component.
 */
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSupabaseAdmin } from "@/lib/supabase"
import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import SessionCard from "@/components/SessionCard"
import RefreshTimer from "@/components/RefreshTimer"
import LogoutButton from "@/components/LogoutButton"

export const dynamic = "force-dynamic" // always fetch fresh data

export default async function Dashboard() {
  // Check auth — redirect to login if not signed in
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  // Fetch all sessions for this user from Supabase
  const supabase = getSupabaseAdmin()
  const { data: sessions, error } = await supabase
    .from("sessions")
    .select("*, tasks(status)")   // include task counts
    .eq("user_email", session.user.email)
    .order("last_updated", { ascending: false })

  // Count tasks per session
  const sessionsWithCounts = (sessions || []).map((s) => {
    const tasks = s.tasks || []
    const done    = tasks.filter(t => t.status === "done").length
    const active  = tasks.filter(t => t.status === "in_progress").length
    const pending = tasks.filter(t => t.status === "pending").length
    return { ...s, taskCounts: { done, active, pending, total: tasks.length } }
  })

  const activeSession = sessionsWithCounts.find(s => s.status === "active" || s.status === "in_progress")

  return (
    <div className="page-wrapper">

      {/* Auto-refresh every 10 seconds */}
      <RefreshTimer interval={10000} />

      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <div className="logo-mark">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#7c3aed" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M2 17l10 5 10-5" stroke="#7c3aed" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M2 12l10 5 10-5" stroke="#a78bfa" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div className="app-title">PocketGrav</div>
            <div className="app-subtitle">AntiGravity Monitor</div>
          </div>
        </div>

        <div className="header-right">
          {/* Live indicator */}
          <div className="refresh-ring" title="Auto-refreshing every 10s" />

          {/* User avatar */}
          {session.user?.image && (
            <Image
              src={session.user.image}
              alt={session.user.name || "User"}
              width={32}
              height={32}
              className="user-avatar"
            />
          )}

          <Link href="/settings" className="text-gray-400 hover:text-white transition-colors text-sm font-medium mr-2">
            Settings
          </Link>
          <LogoutButton />
        </div>
      </header>

      {/* Page Content */}
      <div className="dashboard-page">

        <div className="page-header">
          <h1 className="page-title">
            {activeSession ? (
              <><span>🟢</span> {sessionsWithCounts.length} Active Sessions</>
            ) : (
              <>All Sessions</>
            )}
          </h1>
          <p className="page-subtitle">
            Hey {session.user?.name?.split(" ")[0]} · {session.user?.email}
          </p>
        </div>

        {/* Session list or empty state */}
        {sessionsWithCounts.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <div className="empty-state-title">No sessions yet</div>
              <div className="empty-state-text">
                Run the reporter on your laptop to start syncing your AntiGravity sessions.
              </div>
              <div className="empty-state-cmd">node reporter/reporter.js</div>
            </div>
          </div>
        ) : (
          <div className="sessions-grid">
            {sessionsWithCounts.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                taskCounts={s.taskCounts}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
